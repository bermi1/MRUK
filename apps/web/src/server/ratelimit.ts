import 'server-only';
import { headers } from 'next/headers';

import { prisma, sha256 } from '@bt/db';

/**
 * Fixed-window rate limiter stored in PostgreSQL, so the limit holds across every
 * serverless instance (an in-memory counter would reset per instance).
 */
export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super(`Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`);
  }
}

export async function hit(rawKey: string, limit: number, windowSeconds: number): Promise<void> {
  // Keys contain phone numbers, emails and IPs: store only a hash (no PII at rest).
  const key = sha256(rawKey);
  // One atomic statement: start a new window when the old one has expired, otherwise count up.
  const rows = await prisma.$queryRaw<{ n: number; reset: Date }[]>`
    INSERT INTO "RateLimit" ("key", "n", "reset") VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "n" = CASE WHEN "RateLimit"."reset" < now() THEN 1 ELSE "RateLimit"."n" + 1 END,
      "reset" = CASE WHEN "RateLimit"."reset" < now() THEN EXCLUDED."reset" ELSE "RateLimit"."reset" END
    RETURNING "n", "reset"`;
  const r = rows[0];
  // Occasionally clear expired windows.
  if (Math.random() < 0.01) prisma.rateLimit.deleteMany({ where: { reset: { lt: new Date() } } }).catch(() => undefined);
  if (r && r.n > limit) throw new RateLimitError(Math.max(1, Math.ceil((r.reset.getTime() - Date.now()) / 1000)));
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'local').trim();
}

/** Rate limit by client IP and an optional subject (phone, email). */
export async function limit(action: string, limitN: number, windowSeconds: number, subject?: string) {
  const ip = await clientIp();
  await hit(`${action}:ip:${ip}`, limitN * 3, windowSeconds);
  if (subject) await hit(`${action}:s:${subject}`, limitN, windowSeconds);
}
