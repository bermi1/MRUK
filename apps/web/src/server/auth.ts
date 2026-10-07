import 'server-only';
import { randomInt } from 'node:crypto';
import { redirect } from 'next/navigation';
import { authenticator } from 'otplib';
import { decrypt, encrypt, prisma, sha256, verifyPassword } from '@bt/db';
import { normalizeTzPhone } from '@bt/core';
import { audit } from './audit';
import { env } from './env';
import { integrations } from './integrations';
import { limit } from './ratelimit';
import { createSession, currentStaffSession, endSession, STAFF_COOKIE, startCustomerSession } from './session';

authenticator.options = { window: 1 };

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
  const secret = u.totpSecretEnc ? decrypt(u.totpSecretEnc) : authenticator.generateSecret();
  if (!u.totpSecretEnc) await prisma.staffUser.update({ where: { id: u.id }, data: { totpSecretEnc: encrypt(secret) } });
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
  email: string;
  name: string;
  role: string;
  roleName: string;
  permissions: string[];
  brands: string[];
  can: (perm: string) => boolean;
  canBrand: (brand: string) => boolean;
}

/** Use at the top of every admin page and action. Redirects to login when not signed in. */
export async function requireStaff(perm?: string): Promise<StaffContext> {
  const s = await currentStaffSession();
  if (!s || s.kind !== 'staff' || !s.staff) redirect('/admin/login');
  const permissions = s.staff.role.permissions;
  const can = (p: string) => permissions.includes('*') || permissions.includes(p);
  const ctx: StaffContext = {
    id: s.staff.id,
    email: s.staff.email,
    name: s.staff.name,
    role: s.staff.roleId,
    roleName: s.staff.role.name,
    permissions,
    brands: s.staff.brands,
    can,
    canBrand: (b: string) => s.staff!.brands.includes('*') || s.staff!.brands.includes(b),
  };
  if (perm && !can(perm)) throw new AuthError(`Your role (${ctx.roleName}) cannot do this`);
  return ctx;
}

/** Brand filter for queries: staff only see brands they are scoped to. */
export function brandScope(ctx: StaffContext, requested?: string | null): string[] {
  const all = ['mruk', 'skywood'].filter((b) => ctx.canBrand(b));
  if (requested && all.includes(requested)) return [requested];
  return all;
}
