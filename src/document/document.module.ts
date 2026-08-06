import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { Document } from './entity/document.entity';
import { STORAGE_PROVIDER } from './utils/storage.provider';
import { LocalStorageProvider } from './utils/local-storage.provider';

@Module({
    imports: [TypeOrmModule.forFeature([Document])],
    controllers: [DocumentController],
    providers: [
        DocumentService,
        { provide: STORAGE_PROVIDER, useClass: LocalStorageProvider },
    ],
})
export class DocumentModule { }
