import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAssociateDto } from './dto/create-associate.dto';
import { UpdateAssociateDto } from './dto/update-associate.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Associate } from './entities/associate.entity';
import { Repository } from 'typeorm';
import { isValidCpf } from 'src/utils/cpf-validator';

@Injectable()
export class AssociateService {
  constructor(
    @InjectRepository(Associate)
    private readonly associateRepository: Repository<Associate>,
  ) {}

  async create(createAssociateDto: CreateAssociateDto) {
    if (!isValidCpf(createAssociateDto.cpf)) {
      throw new ConflictException('CPF inválido');
    }
    return this.associateRepository.save(createAssociateDto);
  }

  async findAll() {
    return this.associateRepository.find();
  }

  async findOne(id: number) {
    const associate = await this.associateRepository.findOne({ where: { id } });

    if (associate === null) {
      throw new NotFoundException('Associado não encontrado');
    }

    return associate;
  }

  async searchAssociate(query: string, field: string = 'name') {
    if (!query?.trim()) {
      return [];
    }

    const searchableColumns: Record<string, string> = {
      name: 'associate.name',
      mothersName: 'associate.mothersName',
      fathersName: 'associate.fathersName',
      cpf: 'associate.cpf',
    };

    const column = searchableColumns[field];
    if (!column) {
      throw new BadRequestException('Campo de busca inválido');
    }

    const qb = this.associateRepository.createQueryBuilder('associate');

    if (field === 'cpf') {
      const digitsOnly = query.replace(/\D/g, '');
      qb.where(`regexp_replace(${column}, '\\D', '', 'g') ILIKE :query`, {
        query: `%${digitsOnly}%`,
      });
    } else {
      qb.where(`${column} ILIKE :query`, { query: `%${query.trim()}%` });
    }

    return qb.getMany();
  }

  async update(id: number, updateAssociateDto: UpdateAssociateDto) {
    if (
      updateAssociateDto.cpf !== undefined &&
      !isValidCpf(updateAssociateDto.cpf)
    ) {
      throw new ConflictException('CPF inválido');
    }

    const result = await this.associateRepository.update(
      id,
      updateAssociateDto,
    );
    if (result.affected === 0) {
      throw new NotFoundException('Associado não encontrado');
    }
    return this.findOne(id);
  }

  async remove(id: number) {
    const result = await this.associateRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Associado não encontrado');
    }
    return result;
  }
}
