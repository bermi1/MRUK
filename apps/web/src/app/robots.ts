import type { MetadataRoute } from 'next';
import { env } from '@/server/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/azania', '/*/checkout', '/*/cart', '/*/account', '/*/order/', '/*/pay/'] }],
    sitemap: `${env.APP_URL}/sitemap.xml`,
  };
}
