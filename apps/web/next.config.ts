import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// Load the monorepo root .env for local development (Next only reads apps/web/.env*).
try {
  process.loadEnvFile(resolve(process.cwd(), '../../.env'));
} catch {
  /* no root .env (CI/production uses real environment variables) */
}

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@bt/core', '@bt/db', '@bt/integrations'],
  serverExternalPackages: ['@prisma/client', 'pdf-lib', 'pg'],
  images: {
    // Brand-site photos are resized and converted to WebP/AVIF (see src/lib/img.ts).
    remotePatterns: [
      { protocol: 'https', hostname: 'www.mruk.co.tz' },
      { protocol: 'https', hostname: 'www.skywood.co.tz' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: { serverActions: { bodySizeLimit: '30mb' } },
  // Crawlers that get fully rendered <head> metadata (no streamed metadata) and a real 404 status:
  // Next's default list plus Googlebot and the AI crawlers we allow in robots.txt (docs/seo.md).
  htmlLimitedBots:
    /Googlebot|Google-InspectionTool|Storebot-Google|[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|CCBot|Amazonbot|meta-externalagent|DuckAssistBot|MistralAI-User/i,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] },
    ];
  },
};

export default config;
