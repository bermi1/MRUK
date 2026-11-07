import type { MetadataRoute } from 'next';
import { noIndexSite } from '@/lib/site';
import { env } from '@/server/env';

/**
 * AI assistants and AI search crawlers we explicitly welcome on public pages (docs/seo.md).
 * They get the same rules as everyone else; listing them makes the permission explicit.
 */
const AI_CRAWLERS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'CCBot', 'Applebot-Extended', 'Amazonbot'];

/**
 * Private and per-visitor pages, in both URL forms (single-brand "/cart" and "/<brand>/cart").
 * Trailing slashes keep "/pay/" from also blocking "/pay-later" and "/order/" from "/orders".
 */
const DISALLOW = ['/admin', '/api/', '/azania', '/cart', '/checkout', '/account', '/order/', '/pay/', '/*/cart', '/*/checkout', '/*/account', '/*/order/', '/*/pay/', '/unsubscribe', '/*/unsubscribe'];

// Read env at request time (a build-time robots.txt would keep the build's VERCEL_ENV/APP_URL).
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const root = env.APP_URL.replace(/\/+$/, '');
  // Vercel previews and SEO_NOINDEX sites: keep every crawler out.
  if (noIndexSite()) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: ['/', '/llms.txt', '/llms-full.txt'], disallow: DISALLOW },
    ],
    sitemap: `${root}/sitemap.xml`,
  };
}
