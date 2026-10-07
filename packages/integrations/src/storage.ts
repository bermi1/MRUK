import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

/** Object storage. Local disk in development; S3-compatible in production. */
export interface Storage {
  put(key: string, data: Uint8Array, contentType: string): Promise<{ key: string }>;
  get(key: string): Promise<{ data: Uint8Array; contentType: string } | null>;
}

const SAFE_KEY = /^[a-z0-9][a-z0-9/_.-]{0,200}$/i;

export function assertSafeKey(key: string): void {
  if (!SAFE_KEY.test(key) || key.includes('..')) throw new Error('Invalid storage key');
}

export class LocalStorage implements Storage {
  constructor(private readonly dir: string) {}

  private path(key: string) {
    assertSafeKey(key);
    const root = resolve(this.dir);
    const p = resolve(root, key);
    if (!p.startsWith(root + sep)) throw new Error('Invalid storage key');
    return p;
  }

  async put(key: string, data: Uint8Array, contentType: string) {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, data);
    await writeFile(`${p}.type`, contentType);
    return { key };
  }

  async get(key: string) {
    try {
      const p = this.path(key);
      const [data, contentType] = await Promise.all([readFile(p), readFile(`${p}.type`, 'utf8').catch(() => 'application/octet-stream')]);
      return { data: new Uint8Array(data), contentType };
    } catch {
      return null;
    }
  }
}

/** Placeholder until S3 credentials are supplied (CLAUDE.md rule 5). */
export class UnconfiguredS3Storage implements Storage {
  async put(): Promise<{ key: string }> {
    throw new Error('S3 storage is not configured. Set STORAGE_ADAPTER=local or provide S3_* credentials and the S3 adapter.');
  }
  async get(): Promise<null> {
    throw new Error('S3 storage is not configured.');
  }
}
