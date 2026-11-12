import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Mapping } from './entities/mapping.entity';
import { Document } from 'src/document/entity/document.entity';
import { Associate } from 'src/associate/entities/associate.entity';
import { AllocateMappingDto } from './dto/allocate-mapping.dto';
import { UpdateMappingDto } from './dto/update-mapping.dto';
import {
  DRAWER_CAPACITY,
  DrawerLocation,
  drawerExists,
  drawerSequence,
} from './archive.config';

export interface DrawerOccupancy extends DrawerLocation {
  occupancy: number;
  capacity: number;
}

const UNIQUE_VIOLATION = '23505';

const locationKey = ({ cabinet, drawer }: DrawerLocation) =>
  `${cabinet}\u0000${drawer}`;

const describe = ({ cabinet, drawer }: DrawerLocation) =>
  `armário ${cabinet}, gaveta ${drawer}`;

@Injectable()
export class MappingService {
  constructor(
    @InjectRepository(Mapping)
    private readonly mappingRepository: Repository<Mapping>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly dataSource: DataSource,
  ) {}

  // Ocupação de cada gaveta (RN5: número de mapeamentos nela), na ordem de
  // preenchimento da configuração.
  async getOccupancy(
    repository: Repository<Mapping> = this.mappingRepository,
  ): Promise<DrawerOccupancy[]> {
    const rows = await repository
      .createQueryBuilder('mapping')
      .select('mapping.cabinet', 'cabinet')
      .addSelect('mapping.drawer', 'drawer')
      .addSelect('COUNT(*)', 'count')
      .groupBy('mapping.cabinet')
      .addGroupBy('mapping.drawer')
      .getRawMany<{ cabinet: string; drawer: string; count: string }>();

    const counts = new Map(rows.map((row) => [locationKey(row), +row.count]));

    return drawerSequence().map((location) => ({
      ...location,
      occupancy: counts.get(locationKey(location)) ?? 0,
      capacity: DRAWER_CAPACITY,
    }));
  }

  // RN1/RN6: primeira gaveta da sequência com ocupação abaixo da capacidade.
  async nextAvailable(
    repository: Repository<Mapping> = this.mappingRepository,
  ): Promise<DrawerLocation | null> {
    const occupancy = await this.getOccupancy(repository);
    const free = occupancy.find((entry) => entry.occupancy < entry.capacity);
    return free ? { cabinet: free.cabinet, drawer: free.drawer } : null;
  }

  async suggest(documentId: number): Promise<DrawerLocation> {
    await this.ensureDocumentExists(documentId);
    await this.ensureNotMapped(documentId);

    const suggestion = await this.nextAvailable();
    if (!suggestion) {
      throw new ConflictException('Não há vaga em nenhuma gaveta do arquivo');
    }
    return suggestion;
  }

  async allocate(
    documentId: number,
    allocateMappingDto: AllocateMappingDto,
    allocatedByUserId: number,
  ) {
    const location = this.parseLocation(allocateMappingDto);
    const alreadyStored = allocateMappingDto.alreadyStored === true;
    const acknowledged = allocateMappingDto.acknowledgeOverCapacity === true;

    await this.ensureDocumentExists(documentId);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(Mapping);
        // RN8: contagem e gravação na mesma transação, com trava por gaveta.
        await this.lockDrawer(manager, location);
        await this.ensureNotMapped(documentId, repository);

        const occupancy = await repository.count({ where: location });
        if (occupancy >= DRAWER_CAPACITY) {
          if (!alreadyStored) {
            // E3 (escolha manual) e E4 (lotou desde a sugestão).
            throw new ConflictException({
              message: `A gaveta escolhida (${describe(location)}) está cheia. Escolha outra gaveta.`,
              occupancy,
              capacity: DRAWER_CAPACITY,
              suggestion: await this.nextAvailable(repository),
            });
          }
          if (!acknowledged) {
            // E5: ficha já guardada numa gaveta acima da capacidade.
            throw new ConflictException({
              message: `A gaveta (${describe(location)}) já tem ${occupancy} fichas, acima da capacidade de ${DRAWER_CAPACITY}. Confirme para registrar mesmo assim.`,
              occupancy,
              capacity: DRAWER_CAPACITY,
              requiresAcknowledgement: true,
            });
          }
        }

        return repository.save(
          repository.create({
            documentId,
            cabinet: location.cabinet,
            drawer: location.drawer,
            allocatedByUserId,
          }),
        );
      });
    } catch (error) {
      // Duas alocações simultâneas do mesmo documento em gavetas diferentes
      // passam pelas travas e esbarram na unicidade de documentId (RN7).
      if (this.isUniqueViolation(error)) {
        await this.ensureNotMapped(documentId);
      }
      throw error;
    }
  }

  async findByDocument(documentId: number) {
    await this.ensureDocumentExists(documentId);
    const mapping = await this.mappingRepository.findOne({
      where: { documentId },
    });
    if (!mapping) {
      throw new NotFoundException('Documento aguardando alocação');
    }
    return mapping;
  }

  list(cabinet?: string, drawer?: string) {
    if (drawer && !cabinet) {
      throw new BadRequestException('Informe o armário junto com a gaveta');
    }

    const query = this.mappingRepository
      .createQueryBuilder('mapping')
      .leftJoinAndSelect('mapping.document', 'document')
      .leftJoinAndMapOne(
        'document.associate',
        Associate,
        'associate',
        'associate.id = document.associateId',
      )
      .orderBy('mapping.cabinet')
      .addOrderBy('mapping.drawer')
      .addOrderBy('mapping.createdAt');

    if (cabinet) {
      query.andWhere('mapping.cabinet = :cabinet', { cabinet });
    }
    if (drawer) {
      query.andWhere('mapping.drawer = :drawer', { drawer });
    }

    return query.getMany();
  }

  async update(documentId: number, updateMappingDto: UpdateMappingDto) {
    const location = this.parseLocation(updateMappingDto);

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Mapping);
      await this.lockDrawer(manager, location);

      const mapping = await repository.findOne({ where: { documentId } });
      if (!mapping) {
        throw new NotFoundException('Documento aguardando alocação');
      }
      if (
        mapping.cabinet === location.cabinet &&
        mapping.drawer === location.drawer
      ) {
        return mapping;
      }

      // Mover é uma colocação nova: a gaveta de destino precisa ter vaga.
      const occupancy = await repository.count({ where: location });
      if (occupancy >= DRAWER_CAPACITY) {
        throw new ConflictException({
          message: `A gaveta de destino (${describe(location)}) está cheia. Escolha outra gaveta.`,
          occupancy,
          capacity: DRAWER_CAPACITY,
          suggestion: await this.nextAvailable(repository),
        });
      }

      mapping.cabinet = location.cabinet;
      mapping.drawer = location.drawer;
      return repository.save(mapping);
    });
  }

  // Desalocar: o documento permanece e volta a "aguardando alocação".
  async remove(documentId: number) {
    const mapping = await this.mappingRepository.findOne({
      where: { documentId },
    });
    if (!mapping) {
      throw new NotFoundException('Documento aguardando alocação');
    }
    await this.mappingRepository.delete(mapping.id);
    return mapping;
  }

  private parseLocation(dto: Partial<DrawerLocation> | undefined) {
    const cabinet = dto?.cabinet == null ? '' : String(dto.cabinet).trim();
    const drawer = dto?.drawer == null ? '' : String(dto.drawer).trim();

    if (!cabinet || !drawer) {
      throw new BadRequestException('Informe o armário e a gaveta');
    }

    const location = { cabinet, drawer };
    if (!drawerExists(location)) {
      throw new BadRequestException(
        `O ${describe(location)} não existe no arquivo`,
      );
    }
    return location;
  }

  private async ensureDocumentExists(documentId: number) {
    const exists = await this.documentRepository.exists({
      where: { id: documentId },
    });
    if (!exists) {
      throw new NotFoundException('Documento não encontrado');
    }
  }

  // E1: o documento já tem mapeamento; informa a localização atual.
  private async ensureNotMapped(
    documentId: number,
    repository: Repository<Mapping> = this.mappingRepository,
  ) {
    const existing = await repository.findOne({ where: { documentId } });
    if (existing) {
      throw new ConflictException({
        message: `Este documento já está localizado no ${describe(existing)}. Para mudar a localização, edite o mapeamento.`,
        mapping: existing,
      });
    }
  }

  private async lockDrawer(manager: EntityManager, location: DrawerLocation) {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `mapping:${JSON.stringify([location.cabinet, location.drawer])}`,
    ]);
  }

  private isUniqueViolation(error: unknown) {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string } | undefined)?.code ===
        UNIQUE_VIOLATION
    );
  }
}
