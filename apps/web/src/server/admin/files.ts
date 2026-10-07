import 'server-only';
import { env } from '../env';
import { integrations } from '../integrations';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Identify an image by its magic bytes (never trust the browser's type or file name). */
export function sniffImage(b: Uint8Array): { ext: 'jpg' | 'png' | 'webp'; type: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { ext: 'png', type: 'image/png' };
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  return null;
}

export class UploadError extends Error {}

/**
 * Validate and store a public image. `prefix` is e.g. "products/mruk-uk-g3500q".
 * Returns the public URL served by /api/files.
 */
export async function storePublicImage(file: unknown, prefix: string): Promise<string> {
  if (!(file instanceof File) || file.size === 0) throw new UploadError('Choose an image file');
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError('Images must be 5 MB or smaller');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) throw new UploadError('Only JPG, PNG or WebP images are accepted');
  if (!/^[a-z0-9][a-z0-9/_-]{0,120}$/.test(prefix)) throw new UploadError('Invalid upload target');
  const key = `public/${prefix}-${Date.now().toString(36)}.${kind.ext}`;
  await integrations.storage.put(key, bytes, kind.type);
  return `/api/files/${key}`;
}

/** Storage keys: letters, digits, dash, underscore, dot and slash; no traversal. */
export function validKey(key: string): boolean {
  return /^[a-z0-9][a-z0-9/_.-]{0,200}$/i.test(key) && !key.includes('..') && !key.includes('//') && !key.endsWith('.type');
}

export interface AdapterStatus {
  key: string;
  name: string;
  desc: string;
  mode: 'mock' | 'live' | 'local' | 'out of scope';
}

/** Integration adapters as configured by environment (Settings › Integrations). */
export function adapterStatus(): AdapterStatus[] {
  return [
    { key: 'azania', name: 'Azania Bank API', desc: 'Salary Advance decisions, account payments, mini app SSO', mode: env.AZANIA_ADAPTER },
    { key: 'sms', name: 'SMS gateway', desc: 'OTP codes, order and ticket messages', mode: env.SMS_ADAPTER },
    { key: 'whatsapp', name: 'WhatsApp Business', desc: 'Support chat and alerts', mode: env.WHATSAPP_ADAPTER },
    { key: 'storage', name: 'Object storage', desc: 'Product photos, contracts, invoices, ticket photos', mode: env.STORAGE_ADAPTER === 'local' ? 'local' : 'live' },
    { key: 'ai', name: 'AI assistant', desc: 'Compare verdicts and support answers from catalogue data', mode: env.AI_ADAPTER === 'anthropic' && env.ANTHROPIC_API_KEY ? 'live' : 'mock' },
    { key: 'tra', name: 'TRA EFD / VFD', desc: 'Fiscal receipts', mode: 'out of scope' },
  ];
}

export function bankMode(): 'mock' | 'live' {
  return env.AZANIA_ADAPTER;
}
