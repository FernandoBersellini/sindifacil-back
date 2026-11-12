import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MappingService } from './mapping.service';
import { MappingController } from './mapping.controller';
import { Mapping } from './entities/mapping.entity';
import { Document } from 'src/document/entity/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Mapping, Document])],
  controllers: [MappingController],
  providers: [MappingService],
})
export class MappingModule {}
