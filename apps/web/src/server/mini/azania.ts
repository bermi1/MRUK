import 'server-only';
import { cookies } from 'next/headers';
import { mintMockSsoToken, type AzaniaBank, type BankCustomer } from '@bt/integrations';
import { env } from '../env';
import { integrations } from '../integrations';
import { sign, verifySigned } from '../session';

/**
 * Azania mini app session. The Azania app opens /azania?token=<SSO token>;
 * we verify it with the bank once and keep only `customerRef` + expiry in a
 * short-lived, HMAC-signed, httpOnly cookie. Bank-held KYC is re-fetched on
 * every request, never stored in the cookie.
 */
export const AZANIA_COOKIE = 'bt_azania';
const TTL_SECONDS = 30 * 60;
const REF_RE = /^[A-Za-z0-9-]{1,64}$/;

function payload(ref: string, exp: number) {
  return `azania:${ref}.${exp}`;
}

export async function startAzaniaSession(customerRef: string) {
  if (!REF_RE.test(customerRef)) throw new Error('Invalid customer reference');
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const value = `${customerRef}.${exp}.${sign(payload(customerRef, exp))}`;
  (await cookies()).set(AZANIA_COOKIE, value, { httpOnly: true, sameSite: 'lax', secure: env.isProd, path: '/', maxAge: TTL_SECONDS });
}

export async function endAzaniaSession() {
  (await cookies()).delete(AZANIA_COOKIE);
}

/** Parse and verify a cookie value; returns the customerRef or null. */
export function parseAzaniaCookie(value: string | undefined | null): string | null {
  if (!value) return null;
  const [ref, expS, sig] = value.split('.');
  if (!ref || !expS || !sig || !REF_RE.test(ref) || !/^\d{1,12}$/.test(expS)) return null;
  const exp = Number(expS);
  if (exp * 1000 < Date.now()) return null;
  return verifySigned(payload(ref, exp), sig) ? ref : null;
}

export async function azaniaCustomerRef(): Promise<string | null> {
  return parseAzaniaCookie((await cookies()).get(AZANIA_COOKIE)?.value);
}

type BankWithLookup = AzaniaBank & { getCustomer?: (customerRef: string) => Promise<BankCustomer | null> };

/**
 * Re-fetch the bank-held customer record. The AzaniaBank interface has no
 * lookup-by-reference yet; a live adapter should implement `getCustomer`.
 * For the mock adapter we mint and verify a fresh internal SSO token.
 */
export async function bankCustomer(customerRef: string): Promise<BankCustomer | null> {
  const bank = integrations.bank as BankWithLookup;
  if (typeof bank.getCustomer === 'function') return bank.getCustomer(customerRef);
  if (env.AZANIA_ADAPTER !== 'mock') return null;
  return bank.verifySsoToken(mintMockSsoToken(customerRef, env.AZANIA_SSO_SECRET, 60));
}

/** Current mini-app customer from the cookie, or null. */
export async function currentAzaniaCustomer(): Promise<BankCustomer | null> {
  const ref = await azaniaCustomerRef();
  return ref ? bankCustomer(ref) : null;
}

/** Demo sign-in: outside production, or with DEMO_MODE=true (UAT) — mock adapter only. */
export const DEMO_CUSTOMER_REF = 'AZ-CUST-0001';
export function demoSignInAllowed() {
  return (!env.isProd || env.demo) && env.AZANIA_ADAPTER === 'mock';
}
export function mintDemoToken() {
  if (!demoSignInAllowed()) throw new Error('Demo sign-in is disabled');
  return mintMockSsoToken(DEMO_CUSTOMER_REF, env.AZANIA_SSO_SECRET);
}
