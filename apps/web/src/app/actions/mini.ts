'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@bt/db';
import { ADVANCE_TERMS, assessAffordability, deliveryFee, firstDeductionDate, isRegion, monthlyInstalment } from '@bt/core';
import type { ActionResult } from '@/lib/types';
import { integrations } from '@/server/integrations';
import { azaniaCustomerRef, bankCustomer, demoSignInAllowed, endAzaniaSession, mintDemoToken, startAzaniaSession } from '@/server/mini/azania';
import { CheckoutError, placeAdvanceOrder, requestBankDecision } from '@/server/orders';
import { clientIp, limit, RateLimitError } from '@/server/ratelimit';

export interface MiniOrderResult {
  number: string;
  contract: string;
  status: 'approved' | 'rejected' | 'bank_review';
  note: string;
  total: number;
  months: number;
  monthly: number;
  paid: number;
  remaining: number;
  firstDeduction: string;
  contractUrl: string;
}

const orderZ = z.object({
  brand: z.enum(['mruk', 'skywood']),
  productId: z.string().regex(/^[a-z0-9-]{1,80}$/, 'Unknown product'),
  months: z.number().int().refine((m) => (ADVANCE_TERMS as readonly number[]).includes(m), 'Choose a 3, 6 or 12 month term'),
  region: z.string().max(40).refine(isRegion, 'Choose a delivery region'),
  pin: z.string().regex(/^\d{4}$/, 'Enter your 4-digit Azania PIN'),
  consents: z.tuple([z.literal(true), z.literal(true)], { errorMap: () => ({ message: 'Tick both consent boxes to sign' }) }),
});

function fail(e: unknown): { ok: false; error: string; field?: string } {
  if (e instanceof CheckoutError) return { ok: false, error: e.message, field: e.field };
  if (e instanceof RateLimitError) return { ok: false, error: e.message, field: 'pin' };
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? 'Check your choices and try again', field: String(e.issues[0]?.path[0] ?? '') };
  // No PII: log only the error class/message.
  console.error('[mini]', e instanceof Error ? e.message : 'unknown error');
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

/** Non-production only: sign in as the mock bank customer (Neema Mushi). */
export async function miniDemoSignInAction(): Promise<void> {
  if (!demoSignInAllowed()) throw new Error('Not available');
  const customer = await integrations.bank.verifySsoToken(mintDemoToken());
  if (!customer) throw new Error('Mock SSO failed');
  await startAzaniaSession(customer.customerRef);
  redirect('/azania');
}

export async function miniSignOutAction(): Promise<void> {
  await endAzaniaSession();
  redirect('/azania');
}

/** Buy one product on Salary Advance from inside the Azania app: PIN-signed, bank KYC, instant bank decision. */
export async function placeMiniOrderAction(input: unknown): Promise<ActionResult<MiniOrderResult>> {
  try {
    const ref = await azaniaCustomerRef();
    if (!ref) return { ok: false, error: 'Your Azania session has expired. Close and reopen the shop from the Azania app.', field: 'session' };
    const d = orderZ.parse(input);
    await limit('azania-pin', 5, 15 * 60, ref);
    const customer = await bankCustomer(ref);
    if (!customer) return { ok: false, error: 'We could not load your Azania Bank profile. Reopen the shop from the Azania app.', field: 'session' };
    if (!(await integrations.bank.verifyPin(customer.customerRef, d.pin))) throw new CheckoutError('Incorrect PIN. Please try again.', 'pin');

    // Re-check the pre-approved limit and affordability on the server (never trust the client).
    const product = await prisma.product.findFirst({ where: { id: d.productId, brandKey: d.brand, hidden: false } });
    if (!product) throw new CheckoutError('This product is no longer available');
    const total = product.price + deliveryFee(d.region, product.price);
    if (total > customer.preApprovedLimit) throw new CheckoutError('This purchase is above your pre-approved Salary Advance limit');
    if (assessAffordability(monthlyInstalment(total, d.months), customer.netSalary).status !== 'within') {
      throw new CheckoutError('The monthly instalment is above one third of your net salary. Choose a longer term.', 'months');
    }

    const r = await placeAdvanceOrder(
      d.brand,
      {
        name: customer.fullName,
        phone: customer.phone,
        email: '',
        region: d.region,
        months: d.months,
        nida: customer.nida,
        employer: customer.employer,
        checkNumber: customer.checkNumber,
        jobTitle: customer.jobTitle,
        netSalary: customer.netSalary,
        account: customer.account,
        signature: customer.fullName,
        consents: [true, true],
        channel: 'azania',
        bankVerified: true,
        signerIp: await clientIp(),
      },
      { lines: [{ productId: product.id, qty: 1 }], region: d.region },
    );

    const order = await prisma.order.findUnique({ where: { number: r.number }, include: { advance: true } });
    let note = '';
    if (order?.advance) {
      try {
        note = (await requestBankDecision(order.advance.id, 'azania-mini-app')).note;
      } catch (e) {
        console.error('[mini] bank decision deferred', e instanceof Error ? e.message : 'unknown');
      }
    }
    const fresh = await prisma.order.findUnique({ where: { number: r.number }, include: { advance: true } });
    const status = fresh?.status === 'approved' || fresh?.status === 'rejected' ? fresh.status : 'bank_review';
    const monthly = fresh?.advance?.monthly ?? monthlyInstalment(total, d.months);
    const orderTotal = fresh?.total ?? total;
    return {
      ok: true,
      data: {
        number: r.number,
        contract: r.contract,
        status,
        note,
        total: orderTotal,
        months: d.months,
        monthly,
        paid: 0,
        remaining: orderTotal,
        firstDeduction: firstDeductionDate(fresh?.consentAt ?? new Date()).toISOString(),
        contractUrl: `/api/azania/contract/${encodeURIComponent(r.contract)}`,
      },
    };
  } catch (e) {
    return fail(e);
  }
}
