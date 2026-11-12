import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { MappingService } from './mapping.service';
import { Mapping } from './entities/mapping.entity';
import { Document } from 'src/document/entity/document.entity';
import { DRAWER_CAPACITY, drawerSequence } from './archive.config';

type Row = { cabinet: string; drawer: string; count: string };

describe('MappingService', () => {
  let service: MappingService;
  let occupancyRows: Row[];
  let mappingRepository: {
    createQueryBuilder: jest.Mock;
    count: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let documentRepository: { exists: jest.Mock };
  let manager: { getRepository: jest.Mock; query: jest.Mock };

  const full = (cabinet: string, drawer: string): Row => ({
    cabinet,
    drawer,
    count: String(DRAWER_CAPACITY),
  });

  // Faz count() devolver a ocupação das linhas configuradas em occupancyRows.
  const countFromRows = () =>
    mappingRepository.count.mockImplementation(
      ({ where }: { where: { cabinet: string; drawer: string } }) => {
        const row = occupancyRows.find(
          (r) => r.cabinet === where.cabinet && r.drawer === where.drawer,
        );
        return Promise.resolve(row ? +row.count : 0);
      },
    );

  beforeEach(async () => {
    occupancyRows = [];
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(() => Promise.resolve(occupancyRows)),
    };
    mappingRepository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: Partial<Mapping>) => data),
      save: jest.fn((data: Partial<Mapping>) =>
        Promise.resolve({ id: 1, ...data }),
      ),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    documentRepository = { exists: jest.fn().mockResolvedValue(true) };
    manager = {
      getRepository: jest.fn(() => mappingRepository),
      query: jest.fn().mockResolvedValue([]),
    };
    const dataSource = {
      transaction: jest.fn((work: (m: typeof manager) => unknown) =>
        work(manager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MappingService,
        { provide: getRepositoryToken(Mapping), useValue: mappingRepository },
        { provide: getRepositoryToken(Document), useValue: documentRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(MappingService);
  });

  describe('getOccupancy', () => {
    it('lista todas as gavetas da configuração, na ordem, com a contagem', async () => {
      occupancyRows = [{ cabinet: '1', drawer: '2', count: '7' }];

      const occupancy = await service.getOccupancy();

      expect(occupancy).toHaveLength(drawerSequence().length);
      expect(occupancy[0]).toEqual({
        cabinet: '1',
        drawer: '1',
        occupancy: 0,
        capacity: DRAWER_CAPACITY,
      });
      expect(occupancy[1].occupancy).toBe(7);
    });
  });

  describe('suggest', () => {
    it('sugere a próxima gaveta com vaga quando a primeira está cheia (critério 2)', async () => {
      occupancyRows = [full('1', '1')];

      await expect(service.suggest(10)).resolves.toEqual({
        cabinet: '1',
        drawer: '2',
      });
    });

    it('pula para o próximo armário quando as gavetas do primeiro estão cheias', async () => {
      occupancyRows = ['1', '2', '3', '4'].map((d) => full('1', d));

      await expect(service.suggest(10)).resolves.toEqual({
        cabinet: '2',
        drawer: '1',
      });
    });

    it('informa arquivo cheio quando nenhuma gaveta tem vaga (E2)', async () => {
      occupancyRows = drawerSequence().map((l) => full(l.cabinet, l.drawer));

      await expect(service.suggest(10)).rejects.toThrow(
        'Não há vaga em nenhuma gaveta do arquivo',
      );
    });

    it('informa a localização atual de um documento já mapeado (E1)', async () => {
      mappingRepository.findOne.mockResolvedValue({
        id: 3,
        documentId: 10,
        cabinet: '2',
        drawer: '3',
      });

      await expect(service.suggest(10)).rejects.toThrow(
        'Este documento já está localizado no armário 2, gaveta 3',
      );
    });

    it('recusa documento inexistente', async () => {
      documentRepository.exists.mockResolvedValue(false);

      await expect(service.suggest(10)).rejects.toThrow(NotFoundException);
    });
  });

  describe('allocate', () => {
    it('registra o mapeamento com trava na gaveta (critério 1)', async () => {
      const result = await service.allocate(
        10,
        { cabinet: '1', drawer: '1' },
        5,
      );

      expect(manager.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        ['mapping:["1","1"]'],
      );
      expect(result).toEqual({
        id: 1,
        documentId: 10,
        cabinet: '1',
        drawer: '1',
        allocatedByUserId: 5,
      });
    });

    it('aceita armário e gaveta enviados como número', async () => {
      await service.allocate(
        10,
        { cabinet: 1, drawer: 2 } as unknown as {
          cabinet: string;
          drawer: string;
        },
        5,
      );

      expect(mappingRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ cabinet: '1', drawer: '2' }),
      );
    });

    it('recusa gaveta cheia e devolve nova sugestão (critérios 4 e 7)', async () => {
      occupancyRows = [full('1', '1')];
      countFromRows();

      const attempt = service.allocate(10, { cabinet: '1', drawer: '1' }, 5);

      await expect(attempt).rejects.toThrow(ConflictException);
      await attempt.catch((error: ConflictException) => {
        expect(error.getResponse()).toMatchObject({
          occupancy: DRAWER_CAPACITY,
          suggestion: { cabinet: '1', drawer: '2' },
        });
      });
      expect(mappingRepository.save).not.toHaveBeenCalled();
    });

    it('ignora acknowledgeOverCapacity quando a ficha não está guardada', async () => {
      occupancyRows = [full('1', '1')];
      countFromRows();

      await expect(
        service.allocate(
          10,
          { cabinet: '1', drawer: '1', acknowledgeOverCapacity: true },
          5,
        ),
      ).rejects.toThrow('está cheia');
    });

    it('pede confirmação para ficha já guardada em gaveta acima de 100 (E5)', async () => {
      occupancyRows = [{ cabinet: '1', drawer: '1', count: '104' }];
      countFromRows();

      const attempt = service.allocate(
        10,
        { cabinet: '1', drawer: '1', alreadyStored: true },
        5,
      );

      await expect(attempt).rejects.toThrow(ConflictException);
      await attempt.catch((error: ConflictException) => {
        expect(error.getResponse()).toMatchObject({
          occupancy: 104,
          requiresAcknowledgement: true,
        });
      });
      expect(mappingRepository.save).not.toHaveBeenCalled();
    });

    it('registra ficha já guardada acima de 100 depois da confirmação (E5)', async () => {
      occupancyRows = [{ cabinet: '1', drawer: '1', count: '104' }];
      countFromRows();

      await service.allocate(
        10,
        {
          cabinet: '1',
          drawer: '1',
          alreadyStored: true,
          acknowledgeOverCapacity: true,
        },
        5,
      );

      expect(mappingRepository.save).toHaveBeenCalled();
    });

    it('recusa gaveta que não existe na configuração (E7)', async () => {
      await expect(
        service.allocate(10, { cabinet: '9', drawer: '1' }, 5),
      ).rejects.toThrow('O armário 9, gaveta 1 não existe no arquivo');
    });

    it('recusa quando armário ou gaveta não foram informados', async () => {
      await expect(
        service.allocate(
          10,
          { cabinet: '1' } as { cabinet: string; drawer: string },
          5,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('recusa documento que já tem mapeamento (E1)', async () => {
      mappingRepository.findOne.mockResolvedValue({
        id: 3,
        documentId: 10,
        cabinet: '1',
        drawer: '1',
      });

      await expect(
        service.allocate(10, { cabinet: '1', drawer: '2' }, 5),
      ).rejects.toThrow('já está localizado');
      expect(mappingRepository.save).not.toHaveBeenCalled();
    });

    it('converte violação de unicidade em conflito com a localização atual', async () => {
      const existing = { id: 3, documentId: 10, cabinet: '1', drawer: '3' };
      mappingRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing);
      mappingRepository.save.mockRejectedValue(
        new QueryFailedError('INSERT', [], { code: '23505' } as never),
      );

      await expect(
        service.allocate(10, { cabinet: '1', drawer: '2' }, 5),
      ).rejects.toThrow('já está localizado no armário 1, gaveta 3');
    });
  });

  describe('update', () => {
    const current = { id: 3, documentId: 10, cabinet: '1', drawer: '1' };

    it('move a ficha para uma gaveta com vaga', async () => {
      mappingRepository.findOne.mockResolvedValue({ ...current });

      await expect(
        service.update(10, { cabinet: '2', drawer: '1' }),
      ).resolves.toMatchObject({ cabinet: '2', drawer: '1' });
    });

    it('recusa mover para gaveta cheia', async () => {
      mappingRepository.findOne.mockResolvedValue({ ...current });
      occupancyRows = [full('2', '1')];
      countFromRows();

      await expect(
        service.update(10, { cabinet: '2', drawer: '1' }),
      ).rejects.toThrow('A gaveta de destino');
    });

    it('não conta a própria ficha ao "mover" para a mesma gaveta', async () => {
      mappingRepository.findOne.mockResolvedValue({ ...current });
      occupancyRows = [full('1', '1')];
      countFromRows();

      await expect(
        service.update(10, { cabinet: '1', drawer: '1' }),
      ).resolves.toEqual(current);
      expect(mappingRepository.save).not.toHaveBeenCalled();
    });

    it('recusa documento sem mapeamento', async () => {
      await expect(
        service.update(10, { cabinet: '2', drawer: '1' }),
      ).rejects.toThrow('Documento aguardando alocação');
    });
  });

  describe('remove', () => {
    it('desaloca o documento', async () => {
      const mapping = { id: 3, documentId: 10, cabinet: '1', drawer: '1' };
      mappingRepository.findOne.mockResolvedValue(mapping);

      await expect(service.remove(10)).resolves.toEqual(mapping);
      expect(mappingRepository.delete).toHaveBeenCalledWith(3);
    });

    it('recusa documento sem mapeamento', async () => {
      await expect(service.remove(10)).rejects.toThrow(NotFoundException);
    });
  });
});
