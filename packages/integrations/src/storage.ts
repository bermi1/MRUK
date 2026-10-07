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

/**
 * Supabase Storage (private bucket) over its REST API, server-side only.
 * The bucket is created on first use. Files are never public: the app serves
 * them through its own authorised routes.
 */
export class SupabaseStorage implements Storage {
  private ready: Promise<void> | null = null;

  constructor(
    private readonly url: string,
    private readonly secretKey: string,
    private readonly bucket: string,
  ) {
    if (!url || !secretKey) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required for Supabase storage');
  }

  private headers(extra: Record<string, string> = {}) {
    return { apikey: this.secretKey, Authorization: `Bearer ${this.secretKey}`, ...extra };
  }

  private ensureBucket() {
    this.ready ??= (async () => {
      const r = await fetch(`${this.url}/storage/v1/bucket`, {
        method: 'POST',
        headers: this.headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: this.bucket, name: this.bucket, public: false, file_size_limit: 10 * 1024 * 1024 }),
      });
      // 200 = created; 400/409 = already exists.
      if (!r.ok && r.status !== 400 && r.status !== 409) {
        this.ready = null;
        throw new Error(`Supabase storage: could not create bucket (${r.status})`);
      }
    })();
    return this.ready;
  }

  private objectPath(key: string) {
    assertSafeKey(key);
    return `${this.url}/storage/v1/object/${this.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  async put(key: string, data: Uint8Array, contentType: string) {
    await this.ensureBucket();
    const r = await fetch(this.objectPath(key), {
      method: 'POST',
      headers: this.headers({ 'Content-Type': contentType, 'x-upsert': 'true', 'Cache-Control': 'max-age=3600' }),
      body: Buffer.from(data),
    });
    if (!r.ok) throw new Error(`Supabase storage: upload failed (${r.status})`);
    return { key };
  }

  async get(key: string) {
    const r = await fetch(this.objectPath(key), { headers: this.headers() });
    if (r.status === 400 || r.status === 404) return null;
    if (!r.ok) throw new Error(`Supabase storage: download failed (${r.status})`);
    return { data: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get('content-type') ?? 'application/octet-stream' };
  }
}
