import { createHmac, timingSafeEqual } from 'node:crypto';
import { isAffordable } from '@bt/core';

/**
 * Azania Bank integration. The live API is not yet available, so the mock
 * adapter implements the same contract with deterministic rules. Swapping to
 * the live adapter is configuration only (AZANIA_ADAPTER=live).
 */
export interface AdvanceSubmission {
  orderNumber: string;
  contractNumber: string;
  fullName: string;
  phone: string;
  nida: string;
  employer: string;
  checkNumber: string;
  netSalary: number;
  account: string;
  total: number;
  months: number;
  monthly: number;
}

export interface AdvanceDecision {
  status: 'approved' | 'rejected' | 'pending';
  bankReference: string;
  note: string;
}

export interface AccountCharge {
  account: string;
  pin: string;
  amount: number;
  reference: string;
}

/** Customer data the bank holds, returned to the mini app after SSO. */
export interface BankCustomer {
  customerRef: string;
  fullName: string;
  phone: string;
  nida: string;
  employer: string;
  checkNumber: string;
  jobTitle: string;
  netSalary: number;
  account: string;
  preApprovedLimit: number;
}

export interface AzaniaBank {
  readonly name: string;
  submitAdvance(s: AdvanceSubmission): Promise<{ bankReference: string }>;
  decideAdvance(bankReference: string, s: Pick<AdvanceSubmission, 'monthly' | 'netSalary'>): Promise<AdvanceDecision>;
  chargeAccount(c: AccountCharge): Promise<{ ok: boolean; reference: string; message: string }>;
  verifySsoToken(token: string): Promise<BankCustomer | null>;
  verifyPin(customerRef: string, pin: string): Promise<boolean>;
}

const MOCK_CUSTOMERS: BankCustomer[] = [
  { customerRef: 'AZ-CUST-0001', fullName: 'Neema Mushi', phone: '+255754000214', nida: '19900101-12345-00001-23', employer: 'University of Dar es Salaam', checkNumber: '100311', jobTitle: 'Lecturer', netSalary: 1_800_000, account: '0150 2214 8821', preApprovedLimit: 2_100_000 },
  { customerRef: 'AZ-CUST-0002', fullName: 'Asha Said', phone: '+255777210554', nida: '19880505-23456-00002-11', employer: 'Zanzibar Revenue Board', checkNumber: '100622', jobTitle: 'Revenue officer', netSalary: 1_600_000, account: '0150 7741 0554', preApprovedLimit: 1_800_000 },
];

function hmac(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/** Mock SSO tokens: base64url(customerRef.expiryEpoch).signature — what the Azania app would hand the webview. */
export function mintMockSsoToken(customerRef: string, secret: string, ttlSeconds = 900): string {
  const body = Buffer.from(`${customerRef}.${Math.floor(Date.now() / 1000) + ttlSeconds}`).toString('base64url');
  return `${body}.${hmac(secret, body)}`;
}

export class MockAzaniaBank implements AzaniaBank {
  readonly name = 'Azania Bank (mock)';
  constructor(private readonly ssoSecret: string) {}

  async submitAdvance(s: AdvanceSubmission) {
    return { bankReference: `AZB-${s.orderNumber}-${Date.now().toString(36).toUpperCase()}` };
  }

  /** Mock credit decision: approve when the instalment fits one third of salary and salary ≥ TZS 300,000. */
  async decideAdvance(bankReference: string, s: Pick<AdvanceSubmission, 'monthly' | 'netSalary'>): Promise<AdvanceDecision> {
    if (s.netSalary < 300_000) return { status: 'rejected', bankReference, note: 'Net salary below the scheme minimum (mock rule).' };
    if (!isAffordable(s.monthly, s.netSalary)) return { status: 'rejected', bankReference, note: 'Instalment above one third of net salary.' };
    return { status: 'approved', bankReference, note: 'Approved by Azania Bank (mock).' };
  }

  /** Mock account debit: any 4-digit PIN except 0000 succeeds. */
  async chargeAccount(c: AccountCharge) {
    const ok = /^\d{4}$/.test(c.pin) && c.pin !== '0000' && c.account.replace(/\D/g, '').length >= 10;
    return { ok, reference: ok ? `AZP-${c.reference}` : '', message: ok ? 'Payment authorised' : 'Payment declined: check the account number and PIN' };
  }

  async verifySsoToken(token: string): Promise<BankCustomer | null> {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = Buffer.from(hmac(this.ssoSecret, body));
    const got = Buffer.from(sig);
    if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
    const [ref, exp] = Buffer.from(body, 'base64url').toString().split('.');
    if (!ref || !exp || Number(exp) * 1000 < Date.now()) return null;
    return MOCK_CUSTOMERS.find((c) => c.customerRef === ref) ?? null;
  }

  /** Mock PIN check: any 4-digit PIN except 0000. */
  async verifyPin(_customerRef: string, pin: string) {
    return /^\d{4}$/.test(pin) && pin !== '0000';
  }
}

export const MOCK_BANK_CUSTOMERS = MOCK_CUSTOMERS;
