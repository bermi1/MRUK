import 'server-only';
import { headers } from 'next/headers';

/**
 * Fixed-window rate limiter (in memory, per process). Good for a single
 * instance; swap for Redis when running more than one (see docs/runbook.md).
 */
const g = globalThis as unknown as { __btRate?: Map<string, { n: number; reset: number }> };
const buckets = (g.__btRate ??= new Map());

export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super(`Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`);
  }
}

export function hit(key: string, limit: number, windowSeconds: number): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowSeconds * 1000 });
    if (buckets.size > 50_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return;
  }
  b.n++;
  if (b.n > limit) throw new RateLimitError(Math.ceil((b.reset - now) / 1000));
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'local').trim();
}

/** Rate limit by client IP and an optional subject (phone, email). */
export async function limit(action: string, limitN: number, windowSeconds: number, subject?: string) {
  const ip = await clientIp();
  hit(`${action}:ip:${ip}`, limitN * 3, windowSeconds);
  if (subject) hit(`${action}:s:${subject}`, limitN, windowSeconds);
}
