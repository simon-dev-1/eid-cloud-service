import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { config } from '../config.js';

export interface StorageClient {
  put(key: string, data: Buffer, contentType?: string): Promise<void>;
  get(key: string): Promise<{ data: Buffer; contentType?: string }>;
  delete(key: string): Promise<void>;
}

const resolvePath = (key: string): string => join(config.storage.dir, key);

const diskStorage: StorageClient = {
  async put(key, data) {
    const filePath = resolvePath(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  },
  async get(key) {
    const data = await readFile(resolvePath(key));
    return { data };
  },
  async delete(key) {
    await rm(resolvePath(key), { force: true });
  },
};

export const storage: StorageClient = diskStorage;
