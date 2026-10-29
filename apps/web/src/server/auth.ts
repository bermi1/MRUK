import 'server-only';
import { randomInt } from 'node:crypto';
import { redirect } from 'next/navigation';
import { authenticator } from 'otplib';
import { decrypt, encrypt, hashPassword, prisma, sha256, verifyPassword } from '@bt/db';
import { normalizeTzPhone } from '@bt/core';
import { checkStaffPassword } from '@/lib/password';
import { audit } from './audit';
import { env } from './env';
import { integrations } from './integrations';
import { limit } from './ratelimit';
import { createSession, currentStaffSession, endSession, STAFF_COOKIE, startCustomerSession } from './session';

// Accept codes up to two 30-second steps either side (phone clock drift and typing time).
authenticator.options = { window: 2 };

export class AuthError extends Error {}

// Customers: phone OTP --------------------------------------------------------------

const OTP_TTL_MIN = 5;
const OTP_MAX_ATTEMPTS = 5;

export async function requestOtp(phoneInput: string): Promise<{ phone: string; devCode?: string }> {
  const phone = normalizeTzPhone(phoneInput);
  if (!phone) throw new AuthError('Enter a valid Tanzanian mobile number, e.g. +255 754 000 214');
  await limit('otp', 5, 15 * 60, phone);
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await prisma.otpCode.updateMany({ where: { phone, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.otpCode.create({ data: { phone, codeHash: sha256(`${phone}:${code}`), expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000) } });
  await integrations.sms.send(phone, `Your Mr UK and Skywood code is ${code}. It expires in ${OTP_TTL_MIN} minutes. Never share it.`);
  return { phone, devCode: env.showOtp ? code : undefined };
}

export async function verifyOtp(phoneInput: string, code: string, profile?: { name?: string; email?: string; locale?: string }) {
  const phone = normalizeTzPhone(phoneInput);
  if (!phone || !/^\d{6}$/.test(code)) throw new AuthError('Enter the 6-digit code we sent by SMS');
  await limit('otp-verify', 10, 15 * 60, phone);
  const otp = await prisma.otpCode.findFirst({ where: { phone, usedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!otp || otp.expiresAt < new Date()) throw new AuthError('The code has expired. Request a new one.');
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new AuthError('Too many wrong codes. Request a new one.');
  if (otp.codeHash !== sha256(`${phone}:${code}`)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new AuthError('That code is not right. Check the SMS and try again.');
  }
  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  const existing = await prisma.customer.findUnique({ where: { phone } });
  const customer = existing
    ? await prisma.customer.update({
        where: { id: existing.id },
        data: { deletedAt: null, ...(profile?.name && !existing.name ? { name: profile.name.slice(0, 120) } : {}), ...(profile?.email && !existing.email ? { email: profile.email.slice(0, 160) } : {}) },
      })
    : await prisma.customer.create({ data: { phone, name: (profile?.name ?? '').slice(0, 120), email: (profile?.email ?? '').slice(0, 160), locale: profile?.locale === 'sw' ? 'sw' : 'en', consentAt: new Date() } });
  await startCustomerSession(customer.id);
  return customer;
}

// Staff: email + password + TOTP ----------------------------------------------------------

const STAFF_TTL = 12 * 3600;
const PENDING_TTL = 10 * 60;

export async function staffPasswordLogin(emailInput: string, password: string): Promise<'totp' | 'enrol'> {
  const email = emailInput.trim().toLowerCase();
  await limit('staff-login', 5, 15 * 60, email);
  const u = await prisma.staffUser.findUnique({ where: { email } });
  const fail = new AuthError('Email or password is incorrect');
  if (!u || !u.active) {
    verifyPassword(password, 'scrypt$AAAAAAAAAAAAAAAAAAAAAA$AAAA'); // keep timing similar
    throw fail;
  }
  if (u.lockedUntil && u.lockedUntil > new Date()) throw new AuthError('Account locked after failed attempts. Try again in 15 minutes.');
  if (!verifyPassword(password, u.passwordHash)) {
    const n = u.failedLogins + 1;
    await prisma.staffUser.update({ where: { id: u.id }, data: { failedLogins: n, lockedUntil: n >= 5 ? new Date(Date.now() + 15 * 60_000) : null } });
    await audit(email, 'login.failed', 'StaffUser', u.id);
    throw fail;
  }
  await prisma.staffUser.update({ where: { id: u.id }, data: { failedLogins: 0, lockedUntil: null } });
  await createSession('staff_pending_2fa', { staffId: u.id }, PENDING_TTL);
  return u.totpEnabled ? 'totp' : 'enrol';
}

async function pendingStaff() {
  const s = await currentStaffSession();
  if (!s || s.kind !== 'staff_pending_2fa' || !s.staff) throw new AuthError('Your sign-in expired. Start again.');
  return s.staff;
}

/** First sign-in: generate a TOTP secret (stored encrypted, not yet enabled). */
export async function beginTotpEnrolment(): Promise<{ secret: string; otpauth: string }> {
  const u = await pendingStaff();
  if (u.totpEnabled) throw new AuthError('Two-factor authentication is already set up');
  // Store a secret only if none exists yet (atomic), then always show the stored one: two overlapping
  // requests (double click, reload) must never show a QR code for a secret that was overwritten.
  if (!u.totpSecretEnc) await prisma.staffUser.updateMany({ where: { id: u.id, totpSecretEnc: null }, data: { totpSecretEnc: encrypt(authenticator.generateSecret()) } });
  const stored = await prisma.staffUser.findUniqueOrThrow({ where: { id: u.id }, select: { totpSecretEnc: true } });
  const secret = decrypt(stored.totpSecretEnc!);
  return { secret, otpauth: authenticator.keyuri(u.email, 'Commerce OS', secret) };
}

export async function verifyStaffTotp(code: string) {
  const u = await pendingStaff();
  await limit('staff-totp', 6, 15 * 60, u.id);
  if (!u.totpSecretEnc || !authenticator.check(code.replace(/\s/g, ''), decrypt(u.totpSecretEnc))) {
    await audit(u.email, 'login.totp_failed', 'StaffUser', u.id);
    throw new AuthError('That code is not valid. Check the time on your phone and try again.');
  }
  await endSession(STAFF_COOKIE);
  await prisma.staffUser.update({ where: { id: u.id }, data: { totpEnabled: true, lastLoginAt: new Date() } });
  await createSession('staff', { staffId: u.id }, STAFF_TTL);
  await audit(u.email, 'login', 'StaffUser', u.id);
}

export async function staffLogout() {
  const s = await currentStaffSession();
  if (s?.staff) await audit(s.staff.email, 'logout', 'StaffUser', s.staff.id);
  await endSession(STAFF_COOKIE);
}

export interface StaffContext {
  id: string;
  /** Current session row (used to keep this session when revoking the others). */
  sessionId: string;
  /** An owner issued a temporary password: everything except changing it is blocked. */
  mustChangePassword: boolean;
  /** Still using the password they were given (seeded or invited); never chosen their own. */
  usingIssuedPassword: boolean;
  email: string;
  name: string;
  role: string;
  roleName: string;
  permissions: string[];
  brands: string[];
  can: (perm: string) => boolean;
  canBrand: (brand: string) => boolean;
}

type StaffSession = NonNullable<Awaited<ReturnType<typeof currentStaffSession>>>;

/** Build the staff context from a signed-in session (shared with route handlers). */
export function staffContextOf(s: StaffSession): StaffContext {
  const staff = s.staff!;
  const permissions = staff.role.permissions;
  const can = (p: string) => permissions.includes('*') || permissions.includes(p);
  return {
    id: staff.id,
    sessionId: s.id,
    mustChangePassword: staff.mustChangePassword,
    usingIssuedPassword: !staff.passwordChangedAt,
    email: staff.email,
    name: staff.name,
    role: staff.roleId,
    roleName: staff.role.name,
    permissions,
    brands: staff.brands,
    can,
    canBrand: (b: string) => staff.brands.includes('*') || staff.brands.includes(b),
  };
}

export const PASSWORD_PAGE = '/admin/account';

/**
 * Use at the top of every admin page and action. Redirects to login when not signed in,
 * and to the password page while a temporary password must be replaced.
 */
export async function requireStaff(perm?: string, opts: { allowPasswordChange?: boolean } = {}): Promise<StaffContext> {
  const s = await currentStaffSession();
  if (!s || s.kind !== 'staff' || !s.staff) redirect('/admin/login');
  const ctx = staffContextOf(s);
  if (ctx.mustChangePassword && !opts.allowPasswordChange) redirect(`${PASSWORD_PAGE}?required=1`);
  if (perm && !ctx.can(perm)) throw new AuthError(`Your role (${ctx.roleName}) cannot do this`);
  return ctx;
}

/**
 * Signed-in staff member changes their own password: the current password is re-checked,
 * the new one must pass the strength rules, and every other session is signed out.
 */
export async function changeOwnStaffPassword(ctx: StaffContext, current: string, next: string) {
  await limit('staff-password', 5, 15 * 60, ctx.id);
  const u = await prisma.staffUser.findUniqueOrThrow({ where: { id: ctx.id } });
  if (!verifyPassword(current, u.passwordHash)) {
    await audit(ctx.email, 'staff.password_change_failed', 'StaffUser', u.id);
    throw new AuthError('Your current password is not right');
  }
  const check = checkStaffPassword(next, u.email);
  if (!check.ok) throw new AuthError(check.error ?? 'Choose a stronger password');
  if (verifyPassword(next, u.passwordHash)) throw new AuthError('Choose a password different from your current one');
  await prisma.$transaction([
    prisma.staffUser.update({ where: { id: u.id }, data: { passwordHash: hashPassword(next), mustChangePassword: false, passwordChangedAt: new Date(), failedLogins: 0, lockedUntil: null } }),
    prisma.session.deleteMany({ where: { staffId: u.id, id: { not: ctx.sessionId } } }),
  ]);
  await audit(ctx.email, 'staff.password_change', 'StaffUser', u.id, { forced: u.mustChangePassword, otherSessionsRevoked: true });
}

/** Brand filter for queries: staff only see brands they are scoped to. */
export function brandScope(ctx: StaffContext, requested?: string | null): string[] {
  const all = ['mruk', 'skywood'].filter((b) => ctx.canBrand(b));
  if (requested && all.includes(requested)) return [requested];
  return all;
}
