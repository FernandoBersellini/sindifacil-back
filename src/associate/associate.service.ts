import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAssociateDto } from './dto/create-associate.dto';
import { UpdateAssociateDto } from './dto/update-associate.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Associate } from './entities/associate.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AssociateService {
  constructor(
    @InjectRepository(Associate)
    private readonly associateRepository: Repository<Associate>,
  ) {}

  async create(createAssociateDto: CreateAssociateDto) {
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

  async update(id: number, updateAssociateDto: UpdateAssociateDto) {
    const result = await this.associateRepository.update(id, updateAssociateDto);
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
