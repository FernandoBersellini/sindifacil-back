import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createReadStream } from 'fs';
import { Document } from './entity/document.entity';
import { Mapping } from 'src/mapping/entities/mapping.entity';
import { STORAGE_PROVIDER } from './utils/storage.provider';
import type { StorageProvider } from './utils/storage.provider';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  async create(
    associateId: number,
    file: Express.Multer.File,
    uploadedByUserId: number,
  ) {
    const key = `${associateId}/${Date.now()}-${file.originalname}`;
    const storageKey = await this.storageProvider.upload(
      file.buffer,
      key,
      file.mimetype,
    );

    return this.documentRepository.save({
      associateId,
      storageKey,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedByUserId,
    });
  }

  // Cada documento vem com seu mapeamento em `mapping` (null = aguardando
  // alocação), para a página do associado mostrar a localização.
  findAllByAssociate(associateId: number) {
    return this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndMapOne(
        'document.mapping',
        Mapping,
        'mapping',
        'mapping.documentId = document.id',
      )
      .where('document.associateId = :associateId', { associateId })
      .orderBy('document.uploadedAt')
      .getMany();
  }

  // Documentos sem mapeamento, ou seja, aguardando alocação.
  findPending() {
    return this.documentRepository
      .createQueryBuilder('document')
      .leftJoin(Mapping, 'mapping', 'mapping.documentId = document.id')
      .where('mapping.id IS NULL')
      .orderBy('document.uploadedAt')
      .getMany();
  }

  async findOne(id: number) {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }
    return document;
  }

  async downloadFile(id: number) {
    const document = await this.findOne(id);
    const filePath = await this.storageProvider.getUrl(document.storageKey);
    return { document, stream: createReadStream(filePath) };
  }

  async remove(id: number) {
    const document = await this.findOne(id);
    await this.storageProvider.delete(document.storageKey);
    await this.documentRepository.delete(id);
    return document;
  }
}
