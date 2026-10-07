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
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
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
