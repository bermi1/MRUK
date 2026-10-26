import { prisma } from '@bt/db';
import { staffForRoute } from '@/server/admin/context';
import { MEDIA_TYPES, validKey } from '@/server/admin/files';
import { integrations } from '@/server/integrations';

export const dynamic = 'force-dynamic';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Object storage files.
 *  - public/*  → anyone (product photos, CMS hero / OG images); long cache, keys are versioned.
 *  - tickets/* → staff with the 'tickets' permission and access to the ticket's brand.
 *  - anything else (contracts/, invoices/) → 404 here; served by their own authorised routes.
 */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
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
  const media = scope === 'public' && file !== null && MEDIA_TYPES.includes(file.contentType);
  if (!file || (!IMAGE_TYPES.includes(file.contentType) && !media)) return new Response('Not found', { status: 404 });
  if (media) {
    // Video/audio: support byte ranges (Safari and seeking need them).
    const size = file.data.byteLength;
    const base = { 'Content-Type': file.contentType, 'Accept-Ranges': 'bytes', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline', 'Content-Security-Policy': "default-src 'none'; media-src 'self'; sandbox" };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '');
    if (m && (m[1] || m[2])) {
      let start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
      let end = m[1] && m[2] ? Number(m[2]) : size - 1;
      end = Math.min(end, size - 1);
      if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      start = Math.max(0, start);
      return new Response(Buffer.from(file.data.slice(start, end + 1)), { status: 206, headers: { ...base, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) } });
    }
    return new Response(Buffer.from(file.data), { headers: { ...base, 'Content-Length': String(size) } });
  }
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
