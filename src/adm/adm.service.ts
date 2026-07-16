import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Adm } from './entities/adm.entity';

@Injectable()
export class AdmService {

  constructor(
    @InjectRepository(Adm)
    private readonly admRepository: Repository<Adm>,
  ) {}

  async findByEmail(email: string) {
    return this.admRepository.findOneBy({email});
  }
}
