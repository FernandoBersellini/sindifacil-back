import { Module } from '@nestjs/common';
import { AssociateService } from './associate.service';
import { AssociateController } from './associate.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Associate } from './entities/associate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Associate])],
  controllers: [AssociateController],
  providers: [AssociateService],
})
export class AssociateModule {}
