import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { StorageProvider } from './storage.provider';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

@Injectable()
export class LocalStorageProvider implements StorageProvider {
    async upload(file: Buffer, key: string): Promise<string> {
        const filePath = path.join(UPLOAD_DIR, key);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file);
        return key;
    }

    getUrl(storageKey: string): Promise<string> {
        return Promise.resolve(path.join(UPLOAD_DIR, storageKey));
    }

    async delete(storageKey: string): Promise<void> {
        await fs.rm(path.join(UPLOAD_DIR, storageKey), { force: true });
    }
}
