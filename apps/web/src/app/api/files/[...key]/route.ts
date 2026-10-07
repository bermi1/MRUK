import { prisma } from '@bt/db';
import { staffForRoute } from '@/server/admin/context';
import { validKey } from '@/server/admin/files';
import { integrations } from '@/server/integrations';

export const dynamic = 'force-dynamic';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Object storage files.
 *  - public/*  → anyone (product photos, CMS hero / OG images); long cache, keys are versioned.
 *  - tickets/* → staff with the 'tickets' permission and access to the ticket's brand.
 *  - anything else (contracts/, invoices/) → 404 here; served by their own authorised routes.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const parts = (await params).key ?? [];
  const key = parts.map((p) => decodeURIComponent(p)).join('/');
  if (!validKey(key)) return new Response('Not found', { status: 404 });
  const scope = parts[0];
  let cache = 'private, no-store';
  if (scope === 'public') {
    cache = 'public, max-age=31536000, immutable';
  } else if (scope === 'tickets') {
    const ctx = await staffForRoute();
    if (!ctx) return new Response('Sign in required', { status: 401 });
    if (!ctx.can('tickets')) return new Response('Forbidden', { status: 403 });
    const t = await prisma.ticket.findFirst({ where: { photoKey: key }, select: { brandKey: true } });
    if (!t || !ctx.canBrand(t.brandKey)) return new Response('Not found', { status: 404 });
  } else {
    return new Response('Not found', { status: 404 });
  }
  const file = await integrations.storage.get(key);
  if (!file || !IMAGE_TYPES.includes(file.contentType)) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(file.data), {
    headers: {
      'Content-Type': file.contentType,
      'Content-Length': String(file.data.byteLength),
      'Cache-Control': cache,
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
