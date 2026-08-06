export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
    upload(file: Buffer, key: string, mimeType: string): Promise<string>
    getUrl(storageKey: string): Promise<string>;
    delete(storageKey: string): Promise<void>;
}