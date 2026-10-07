import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma, randomToken, sha256 } from '@bt/db';
import { env } from './env';

/**
 * Server-side sessions. The cookie carries a random token; the database
 * stores only its SHA-256. Cookies are httpOnly, SameSite=Lax, Secure in prod.
 */
export const CUSTOMER_COOKIE = 'bt_session';
export const STAFF_COOKIE = 'bt_staff';

const CUSTOMER_TTL_DAYS = 30;

function cookieOpts(maxAgeSeconds: number) {
  return { httpOnly: true, sameSite: 'lax' as const, secure: env.isProd, path: '/', maxAge: maxAgeSeconds };
}

export async function createSession(kind: 'customer' | 'staff' | 'staff_pending_2fa', ids: { customerId?: string; staffId?: string }, ttlSeconds: number) {
  const token = randomToken();
  await prisma.session.create({ data: { tokenHash: sha256(token), kind, ...ids, expiresAt: new Date(Date.now() + ttlSeconds * 1000) } });
  const jar = await cookies();
  jar.set(kind === 'customer' ? CUSTOMER_COOKIE : STAFF_COOKIE, token, cookieOpts(kind === 'customer' ? ttlSeconds : ttlSeconds));
}

async function readSession(cookieName: string) {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const s = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { customer: true, staff: { include: { role: true } } } });
  if (!s || s.expiresAt < new Date()) return null;
  return s;
}

export async function currentCustomer() {
  const s = await readSession(CUSTOMER_COOKIE);
  if (!s || s.kind !== 'customer' || !s.customer || s.customer.deletedAt) return null;
  return s.customer;
}

export async function startCustomerSession(customerId: string) {
  await createSession('customer', { customerId }, CUSTOMER_TTL_DAYS * 86400);
}

export async function endSession(cookieName: string) {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(cookieName);
}

/** Staff session with idle timeout (Settings › security, default 30 min). */
export async function currentStaffSession() {
  const s = await readSession(STAFF_COOKIE);
  if (!s || !s.staff || !s.staff.active) return null;
  const setting = await prisma.setting.findUnique({ where: { key: 'security' } });
  const idleMin = Number((setting?.value as { sessionTimeoutMinutes?: number } | null)?.sessionTimeoutMinutes ?? 30);
  if (Date.now() - s.lastSeenAt.getTime() > idleMin * 60_000) {
    await prisma.session.delete({ where: { id: s.id } }).catch(() => undefined);
    return null;
  }
  if (Date.now() - s.lastSeenAt.getTime() > 60_000) {
    await prisma.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return s;
}

/** HMAC-signed values for links that need no login (order confirmation, contract download). */
export function sign(value: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(value).digest('base64url').slice(0, 32);
}

export function verifySigned(value: string, sig: string | null | undefined): boolean {
  if (!sig) return false;
  const a = Buffer.from(sign(value));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
