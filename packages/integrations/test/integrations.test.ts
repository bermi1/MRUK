import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSchedule, contractTerms } from '@bt/core';
import { describe, expect, it } from 'vitest';
import { contractPdf, invoicePdf, LocalStorage, lastMessageTo, mintMockSsoToken, MockAzaniaBank, MockSms } from '../src';

describe('mock Azania Bank', () => {
  const bank = new MockAzaniaBank('secret');
  it('approves affordable advances and rejects others', async () => {
    expect((await bank.decideAdvance('R', { monthly: 300_000, netSalary: 1_000_000 })).status).toBe('approved');
    expect((await bank.decideAdvance('R', { monthly: 400_000, netSalary: 1_000_000 })).status).toBe('rejected');
    expect((await bank.decideAdvance('R', { monthly: 10_000, netSalary: 200_000 })).status).toBe('rejected');
  });
  it('charges accounts with a valid PIN only', async () => {
    expect((await bank.chargeAccount({ account: '0150 2214 8821', pin: '1234', amount: 1, reference: 'X' })).ok).toBe(true);
    expect((await bank.chargeAccount({ account: '0150 2214 8821', pin: '0000', amount: 1, reference: 'X' })).ok).toBe(false);
  });
  it('verifies signed SSO tokens', async () => {
    const t = mintMockSsoToken('AZ-CUST-0001', 'secret');
    expect((await bank.verifySsoToken(t))?.fullName).toBe('Neema Mushi');
    expect(await bank.verifySsoToken(mintMockSsoToken('AZ-CUST-0001', 'other'))).toBeNull();
    expect(await bank.verifySsoToken(mintMockSsoToken('AZ-CUST-0001', 'secret', -10))).toBeNull();
    expect(await bank.verifySsoToken('garbage')).toBeNull();
  });
});

describe('storage', () => {
  it('round-trips files and rejects traversal', async () => {
    const s = new LocalStorage(mkdtempSync(join(tmpdir(), 'bt-')));
    await s.put('contracts/a.pdf', new Uint8Array([1, 2, 3]), 'application/pdf');
    expect((await s.get('contracts/a.pdf'))?.contentType).toBe('application/pdf');
    await expect(s.put('../x', new Uint8Array(), 'x')).rejects.toThrow();
    expect(await s.get('missing/file')).toBeNull();
  });
});

describe('sms outbox', () => {
  it('records messages', async () => {
    await new MockSms().send('+255754000214', 'Your code is 123456');
    expect(lastMessageTo('+255754000214')?.text).toContain('123456');
  });
});

describe('pdf', () => {
  it('renders a contract and an invoice', async () => {
    const signedAt = new Date(Date.UTC(2026, 9, 7));
    const c = await contractPdf({
      number: 'AZB-SA-1', signedAt, seller: { legal: 'MR UK Corporation Ltd' },
      customer: { name: 'Neema Mushi', nida: '19900101-12345-00001-23', jobTitle: 'Lecturer', employer: 'UDSM', checkNumber: '1', account: '0150', phone: '+255754000214' },
      orderNumber: 'MU-1', items: [{ name: 'Fridge “French” – style', model: 'UK F275', qty: 1, price: 2450000 }], total: 2450000, months: 12, monthly: 204167,
      firstDeduction: new Date(Date.UTC(2026, 10, 25)), schedule: buildSchedule(2450000, 12, signedAt), terms: contractTerms(12, 'TZS 204,167', '25 Nov 2026'),
      signature: 'Neema Mushi', consents: [{ text: 'I accept', acceptedAt: signedAt.toISOString() }],
    });
    expect(Buffer.from(c.slice(0, 4)).toString()).toBe('%PDF');
    const i = await invoicePdf({ number: 'INV-1', issuedAt: signedAt, status: 'paid', seller: { legal: 'Skywood Tanzania', email: 'a@b.c' }, orderNumber: 'SW-1', customer: { name: 'A', phone: 'B', region: 'C' }, items: [{ name: 'Kettle', model: 'K', qty: 2, price: 65000 }], deliveryFee: 0, discount: 1000, total: 129000, paymentMethod: 'Card' });
    expect(i.length).toBeGreaterThan(1000);
  });
});
