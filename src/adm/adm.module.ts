import { Module } from '@nestjs/common';
import { AdmService } from './adm.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Adm } from './entities/adm.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Adm])],
  providers: [AdmService],
  exports: [AdmService],
})
export class AdmModule {}
