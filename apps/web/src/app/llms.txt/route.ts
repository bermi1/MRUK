import { noIndexSite } from '@/lib/site';
import { llmsText } from '@/server/llms';

// Built per request from the cached catalogue; the CDN keeps it for a few minutes.
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(await llmsText(false), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=86400',
      ...(noIndexSite() ? { 'X-Robots-Tag': 'noindex' } : {}),
    },
  });
}
