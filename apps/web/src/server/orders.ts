import 'server-only';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { decrypt, encrypt, prisma, sha256, type Prisma } from '@bt/db';
import {
  assertAdvanceTransition,
  assertOrderTransition,
  assessAffordability,
  buildSchedule,
  CONTRACT_CONSENTS,
  contractNumber,
  contractTerms,
  deliveryFee,
  firstDeductionDate,
  fmtDate,
  fmtTZS,
  initialOrderStatus,
  isAdvanceTerm,
  monthlyInstalment,
  normaliseNida,
  normalizeTzPhone,
  orderNumber,
  paymentAllowed,
  paymentLabel,
  releasesStock,
  signatureMatches,
  type AdvanceStatus,
  type OrderStatus,
  type PaymentMethod,
} from '@bt/core';
import { contractPdf, invoicePdf } from '@bt/integrations';
import type { BrandKey } from '@/lib/types';
import { getCart, clearCart } from './cart';
import { refreshCatalog } from './catalog';
import { integrations } from './integrations';
import { sign } from './session';

export class CheckoutError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

/** Unpaid card / Azania account orders hold stock for 30 minutes. */
const RESERVATION_MINUTES = 30;

async function nextNumber(tx: Prisma.TransactionClient, key: string, start: number): Promise<number> {
  const c = await tx.counter.upsert({ where: { key }, create: { key, value: start }, update: { value: { increment: 1 } } });
  return c.value;
}

export function confirmationToken(number: string): string {
  return sign(`order:${number}`);
}

export function confirmationPath(brand: BrandKey, number: string): string {
  return `/${brand}/order/${number}?t=${confirmationToken(number)}`;
}

async function brandLogo(brand: string): Promise<Uint8Array | undefined> {
  try {
    return new Uint8Array(await readFile(resolve(process.cwd(), `public/brand/${brand}.png`)));
  } catch {
    return undefined;
  }
}

async function azaniaLogo(): Promise<Uint8Array | undefined> {
  try {
    return new Uint8Array(await readFile(resolve(process.cwd(), 'public/brand/azania-bank.png')));
  } catch {
    return undefined;
  }
}

interface ContactInput {
  name: string;
  phone: string;
  email?: string;
  region: string;
  address?: string;
}

/** Reserve stock for the cart lines; throws if any line can't be filled. */
async function reserveStock(tx: Prisma.TransactionClient, lines: { productId: string; qty: number; name: string }[]) {
  for (const l of lines) {
    const r = await tx.product.updateMany({ where: { id: l.productId, stock: { gte: l.qty }, hidden: false }, data: { stock: { decrement: l.qty } } });
    if (r.count !== 1) throw new CheckoutError(`Sorry, ${l.name} no longer has enough stock. Please update your cart.`);
  }
  stockChanged();
}

/** Shown stock comes from the catalogue cache; refresh it when stock moves. */
function stockChanged() {
  try {
    refreshCatalog();
  } catch {
    // Not inside a server action or route (e.g. during render): the cache expires within a minute.
  }
}

async function restock(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const i of items) await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.qty } } });
  stockChanged();
}

function validateContact(c: ContactInput) {
  const phone = normalizeTzPhone(c.phone);
  if (!c.name.trim()) throw new CheckoutError('Enter your full name', 'name');
  if (!phone) throw new CheckoutError('Enter a valid Tanzanian phone number (+255…)', 'phone');
  return { ...c, phone, name: c.name.trim().slice(0, 120) };
}

export interface PlaceOrderInput extends ContactInput {
  method: Exclude<PaymentMethod, 'salary_advance'>;
  consent: boolean;
  channel: 'web' | 'app';
  customerId?: string | null;
}

/** Pay in full: card, Azania account or pay on delivery. */
export async function placeOrder(brand: BrandKey, input: PlaceOrderInput) {
  await releaseExpiredReservations();
  const cart = await getCart(brand);
  if (!cart.lines.length) throw new CheckoutError('Your cart is empty');
  if (!input.consent) throw new CheckoutError('Please accept the privacy notice to continue', 'consent');
  const c = validateContact({ ...input, region: cart.region });
  if (!paymentAllowed(input.method, cart.region)) throw new CheckoutError('Pay on delivery is only available in Dar es Salaam', 'method');
  const status: OrderStatus = initialOrderStatus(input.method, false);

  const order = await prisma.$transaction(async (tx) => {
    await reserveStock(tx, cart.lines);
    const seq = await nextNumber(tx, `order:${brand}`, brand === 'mruk' ? 10_500 : 20_400);
    const o = await tx.order.create({
      data: {
        number: orderNumber(brand, seq),
        brandKey: brand,
        customerId: input.customerId ?? null,
        contactName: c.name,
        contactPhone: c.phone,
        contactEmail: (input.email ?? '').slice(0, 160),
        region: cart.region,
        addressLine: (input.address ?? '').slice(0, 240),
        channel: input.channel,
        paymentMethod: input.method,
        status,
        subtotal: cart.subtotal,
        discount: cart.discount,
        discountCode: cart.discountCode && !cart.discountError ? cart.discountCode : null,
        deliveryFee: cart.delivery,
        total: cart.total,
        branch: cart.region,
        consentAt: new Date(),
        reservedUntil: status === 'placed' ? new Date(Date.now() + RESERVATION_MINUTES * 60_000) : null,
        items: { create: cart.lines.map((l) => ({ productId: l.productId, name: l.name, model: l.model, price: l.price, qty: l.qty })) },
        events: { create: [{ status: 'placed', note: 'Order placed', actor: 'customer' }, ...(status !== 'placed' ? [{ status, note: 'Pay on delivery confirmed', actor: 'system' }] : [])] },
        payments: { create: { method: input.method, amount: cart.total, status: 'pending' } },
      },
    });
    if (cart.discountCode && !cart.discountError) await tx.discountCode.update({ where: { code: cart.discountCode }, data: { uses: { increment: 1 } } });
    if (input.method === 'pay_on_delivery') await issueInvoice(tx, o.id, o.total, 'issued');
    return o;
  });
  await clearCart(brand);
  if (input.method === 'pay_on_delivery') await notifyCustomer(order.contactPhone, `${brandName(brand)}: order ${order.number} confirmed. Total ${fmtTZS(order.total)}, pay on delivery. Track: ${order.number}`);
  return { number: order.number, next: input.method === 'pay_on_delivery' ? ('confirmed' as const) : ('pay' as const) };
}

export interface AdvanceInput extends ContactInput {
  months: number;
  nida: string;
  employer: string;
  checkNumber: string;
  jobTitle: string;
  netSalary: number;
  account: string;
  signature: string;
  consents: [boolean, boolean];
  channel: 'web' | 'app' | 'azania';
  customerId?: string | null;
  signerIp?: string;
  /** Mini app: bank-held identity already verified by SSO + PIN. */
  bankVerified?: boolean;
}

/** Salary Advance purchase: application, schedule, signed contract PDF, submission to Azania Bank. */
export async function placeAdvanceOrder(brand: BrandKey, input: AdvanceInput, cartOverride?: { lines: { productId: string; qty: number }[]; region: string }) {
  await releaseExpiredReservations();
  let lines: { productId: string; qty: number; name: string; model: string; price: number }[];
  let region: string;
  let subtotal: number;
  let delivery: number;
  let discount = 0;
  let discountCode: string | null = null;
  if (cartOverride) {
    const ps = await prisma.product.findMany({ where: { id: { in: cartOverride.lines.map((l) => l.productId) }, brandKey: brand, hidden: false } });
    lines = cartOverride.lines.map((l) => {
      const p = ps.find((x) => x.id === l.productId);
      if (!p) throw new CheckoutError('Product not found');
      return { productId: p.id, qty: l.qty, name: p.name, model: p.model, price: p.price };
    });
    region = cartOverride.region;
    subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
    delivery = deliveryFee(region, subtotal);
  } else {
    const cart = await getCart(brand);
    if (!cart.lines.length) throw new CheckoutError('Your cart is empty');
    lines = cart.lines;
    region = cart.region;
    subtotal = cart.subtotal;
    delivery = cart.delivery;
    discount = cart.discount;
    discountCode = cart.discountCode && !cart.discountError ? cart.discountCode : null;
  }
  const total = subtotal - discount + delivery;
  const c = validateContact({ ...input, region });
  if (!isAdvanceTerm(input.months)) throw new CheckoutError('Choose a 3, 6 or 12 month term', 'months');
  const nida = normaliseNida(input.nida);
  if (!nida) throw new CheckoutError('Enter your 20-digit NIDA number', 'nida');
  if (!input.employer.trim()) throw new CheckoutError('Enter your employer', 'employer');
  if (!input.checkNumber.trim()) throw new CheckoutError('Enter your check / employee number', 'checkNumber');
  const account = input.account.replace(/\s+/g, '');
  if (!/^\d{10,16}$/.test(account)) throw new CheckoutError('Enter your Azania Bank salary account number (10–16 digits)', 'account');
  const monthly = monthlyInstalment(total, input.months);
  const aff = assessAffordability(monthly, input.netSalary);
  if (aff.status !== 'within') throw new CheckoutError(`The monthly instalment is ${aff.percent}% of your net salary. Azania Bank allows at most one third. Choose a longer term or a smaller basket.`, 'netSalary');
  if (!input.consents[0] || !input.consents[1]) throw new CheckoutError('Tick both consent boxes to sign', 'consents');
  if (!signatureMatches(input.signature, c.name)) throw new CheckoutError('Type your full name to sign', 'signature');

  const signedAt = new Date();
  const schedule = buildSchedule(total, input.months, signedAt);
  const consents = CONTRACT_CONSENTS.map((text) => ({ text, acceptedAt: signedAt.toISOString() }));

  const { order, app, cno } = await prisma.$transaction(async (tx) => {
    await reserveStock(tx, lines);
    const seq = await nextNumber(tx, `order:${brand}`, brand === 'mruk' ? 10_500 : 20_400);
    const cseq = await nextNumber(tx, 'contract', 88_100);
    const number = orderNumber(brand, seq);
    const o = await tx.order.create({
      data: {
        number,
        brandKey: brand,
        customerId: input.customerId ?? null,
        contactName: c.name,
        contactPhone: c.phone,
        contactEmail: (input.email ?? '').slice(0, 160),
        region,
        addressLine: (input.address ?? '').slice(0, 240),
        channel: input.channel,
        paymentMethod: 'salary_advance',
        status: 'bank_review',
        subtotal,
        discount,
        discountCode,
        deliveryFee: delivery,
        total,
        months: input.months,
        branch: region,
        consentAt: signedAt,
        items: { create: lines.map((l) => ({ productId: l.productId, name: l.name, model: l.model, price: l.price, qty: l.qty })) },
        events: { create: [{ status: 'placed', note: 'Order placed', actor: 'customer' }, { status: 'bank_review', note: 'Salary Advance submitted to Azania Bank', actor: 'system' }] },
        payments: { create: { method: 'salary_advance', amount: total, status: 'pending' } },
      },
    });
    if (discountCode) await tx.discountCode.update({ where: { code: discountCode }, data: { uses: { increment: 1 } } });
    const a = await tx.salaryAdvanceApplication.create({
      data: {
        orderId: o.id,
        fullName: c.name,
        phone: c.phone,
        email: (input.email ?? '').slice(0, 160),
        nidaEnc: encrypt(nida),
        nidaLast4: nida.replace(/\D/g, '').slice(-4),
        employer: input.employer.trim().slice(0, 160),
        checkNumber: input.checkNumber.trim().slice(0, 40),
        jobTitle: input.jobTitle.trim().slice(0, 120),
        netSalaryEnc: encrypt(String(input.netSalary)),
        accountEnc: encrypt(account),
        accountLast4: account.slice(-4),
        termMonths: input.months,
        monthly,
        total,
        ratioPercent: aff.percent,
        status: 'submitted',
        channel: input.channel,
        schedule: { create: schedule.map((s) => ({ n: s.n, dueDate: s.dueDate, amount: s.amount })) },
      },
    });
    return { order: o, app: a, cno: contractNumber(cseq) };
  });

  // Contract PDF (stored with the order).
  const brandRow = await prisma.brand.findUniqueOrThrow({ where: { key: brand } });
  const pdf = await contractPdf({
    number: cno,
    signedAt,
    seller: { legal: brandRow.legal, logoPng: await brandLogo(brand) },
    azaniaLogoPng: await azaniaLogo(),
    customer: { name: c.name, nida, jobTitle: input.jobTitle, employer: input.employer, checkNumber: input.checkNumber, account: `•••• ${account.slice(-4)}`, phone: c.phone },
    orderNumber: order.number,
    items: lines,
    total,
    months: input.months,
    monthly,
    firstDeduction: firstDeductionDate(signedAt),
    schedule,
    terms: contractTerms(input.months, fmtTZS(monthly), fmtDate(firstDeductionDate(signedAt))),
    signature: input.signature.trim(),
    consents,
    signerIp: input.signerIp,
  });
  const pdfKey = `contracts/${cno}.pdf`;
  await integrations.storage.put(pdfKey, pdf, 'application/pdf');
  await prisma.contract.create({ data: { number: cno, applicationId: app.id, pdfKey, sha256: sha256(Buffer.from(pdf)), signedAt, signerName: input.signature.trim(), signerIp: input.signerIp ?? '', consents } });

  const sub = await integrations.bank.submitAdvance({ orderNumber: order.number, contractNumber: cno, fullName: c.name, phone: c.phone, nida, employer: input.employer, checkNumber: input.checkNumber, netSalary: input.netSalary, account, total, months: input.months, monthly });
  await prisma.salaryAdvanceApplication.update({ where: { id: app.id }, data: { bankReference: sub.bankReference } });

  if (!cartOverride) await clearCart(brand);
  await notifyCustomer(c.phone, `${brandName(brand)}: order ${order.number} received. Your Salary Advance (${input.months} x ${fmtTZS(monthly)}) is with Azania Bank for review. Contract ${cno}.`);
  return { number: order.number, contract: cno };
}

function brandName(b: string) {
  return b === 'skywood' ? 'Skywood' : 'Mr UK';
}

async function notifyCustomer(phone: string, text: string) {
  try {
    await integrations.sms.send(phone, text);
  } catch {
    /* notifications never block the order */
  }
}

async function issueInvoice(tx: Prisma.TransactionClient, orderId: string, amount: number, status: 'issued' | 'paid') {
  const existing = await tx.invoice.findFirst({ where: { orderId, status: { not: 'void' } } });
  if (existing) {
    if (status === 'paid' && existing.status !== 'paid') await tx.invoice.update({ where: { id: existing.id }, data: { status: 'paid' } });
    return existing;
  }
  const n = await nextNumber(tx, 'invoice', 1_500);
  return tx.invoice.create({ data: { number: `INV-${new Date().getUTCFullYear()}-${String(n).padStart(5, '0')}`, orderId, amount, status } });
}

/** Mock hosted payment: card or Azania account. */
export async function capturePayment(number: string, method: 'card' | 'azania_account', details: { cardNumber?: string; expiry?: string; cvc?: string; account?: string; pin?: string }) {
  const order = await prisma.order.findUnique({ where: { number } });
  if (!order || order.status !== 'placed' || order.paymentMethod !== method) throw new CheckoutError('This order is not awaiting payment');
  if (order.reservedUntil && order.reservedUntil < new Date()) {
    await releaseExpiredReservations();
    throw new CheckoutError('This payment window has expired and the items were released. Please place the order again.');
  }
  let ok = false;
  let reference = '';
  let message = '';
  if (method === 'card') {
    const digits = (details.cardNumber ?? '').replace(/\D/g, '');
    // Mock gateway: Luhn-valid test card 4242 4242 4242 4242 succeeds; 4000 0000 0000 0002 is declined.
    ok = digits === '4242424242424242' && /^\d{2}\/\d{2}$/.test(details.expiry ?? '') && /^\d{3,4}$/.test(details.cvc ?? '');
    message = ok ? 'Card payment approved' : digits === '4000000000000002' ? 'Card declined by issuer' : 'Card details are not valid (use test card 4242 4242 4242 4242)';
    reference = ok ? `CARD-${Date.now().toString(36).toUpperCase()}` : '';
  } else {
    const r = await integrations.bank.chargeAccount({ account: details.account ?? '', pin: details.pin ?? '', amount: order.total, reference: order.number });
    ok = r.ok;
    reference = r.reference;
    message = r.message;
  }
  if (!ok) {
    await prisma.payment.updateMany({ where: { orderId: order.id, status: 'pending' }, data: { status: 'failed' } });
    await prisma.payment.create({ data: { orderId: order.id, method, amount: order.total, status: 'pending' } });
    throw new CheckoutError(message);
  }
  await prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({ where: { orderId: order.id, status: 'pending' }, data: { status: 'captured', reference } });
    await tx.order.update({ where: { id: order.id }, data: { status: 'approved', reservedUntil: null, events: { create: { status: 'approved', note: `Payment confirmed (${paymentLabel(method)})`, actor: 'system' } } } });
    await issueInvoice(tx, order.id, order.total, 'paid');
  });
  await notifyCustomer(order.contactPhone, `${brandName(order.brandKey)}: payment received for order ${order.number}, ${fmtTZS(order.total)}. We are packing your order.`);
}

/** Cancel unpaid orders whose reservation expired and return their stock. */
export async function releaseExpiredReservations() {
  const expired = await prisma.order.findMany({ where: { status: 'placed', reservedUntil: { lt: new Date() } }, select: { id: true } });
  for (const o of expired) {
    await prisma.$transaction(async (tx) => {
      const r = await tx.order.updateMany({ where: { id: o.id, status: 'placed' }, data: { status: 'cancelled', reservedUntil: null } });
      if (r.count !== 1) return;
      await restock(tx, o.id);
      await tx.orderEvent.create({ data: { orderId: o.id, status: 'cancelled', note: 'Payment not completed in time; stock released', actor: 'system' } });
      await tx.payment.updateMany({ where: { orderId: o.id, status: 'pending' }, data: { status: 'failed' } });
    });
  }
  return expired.length;
}

/** Staff-driven order status change, with stock release and customer SMS. */
export async function transitionOrder(number: string, to: OrderStatus, actor: string, note = '') {
  const o = await prisma.order.findUnique({ where: { number }, include: { advance: true } });
  if (!o) throw new Error('Order not found');
  assertOrderTransition(o.status as OrderStatus, to);
  if (o.paymentMethod === 'salary_advance' && o.status === 'bank_review' && (to === 'approved' || to === 'rejected')) {
    throw new Error('Approve or reject Salary Advance orders from the Salary Advance page');
  }
  await prisma.$transaction(async (tx) => {
    const r = await tx.order.updateMany({ where: { id: o.id, status: o.status }, data: { status: to, reservedUntil: null } });
    if (r.count !== 1) throw new Error('Order changed meanwhile, reload and try again');
    await tx.orderEvent.create({ data: { orderId: o.id, status: to, note, actor } });
    if (releasesStock(to)) {
      await restock(tx, o.id);
      await tx.payment.updateMany({ where: { orderId: o.id, status: 'captured' }, data: { status: 'refunded' } });
      await tx.invoice.updateMany({ where: { orderId: o.id }, data: { status: 'void' } });
    }
    if (to === 'delivered' && o.paymentMethod === 'pay_on_delivery') {
      await tx.payment.updateMany({ where: { orderId: o.id, status: 'pending' }, data: { status: 'captured', reference: 'POD-CASH' } });
      await issueInvoice(tx, o.id, o.total, 'paid');
    }
    if (to === 'cancelled' && o.advance && ['submitted', 'approved'].includes(o.advance.status)) {
      await tx.salaryAdvanceApplication.update({ where: { id: o.advance.id }, data: { status: 'rejected', decisionNote: 'Order cancelled' } });
    }
  });
  const msg: Partial<Record<OrderStatus, string>> = {
    packed: 'is packed at our warehouse',
    out_for_delivery: 'is out for delivery. Our team will call before arrival',
    delivered: 'has been delivered. Thank you for shopping with us',
    cancelled: 'has been cancelled',
  };
  if (msg[to]) await notifyCustomer(o.contactPhone, `${brandName(o.brandKey)}: order ${o.number} ${msg[to]}.`);
}

/** Record Azania Bank's decision on an application (admin action or bank callback). */
export async function decideAdvance(applicationId: string, decision: 'approved' | 'rejected', actor: string, note = '') {
  const a = await prisma.salaryAdvanceApplication.findUnique({ where: { id: applicationId }, include: { order: true } });
  if (!a) throw new Error('Application not found');
  assertAdvanceTransition(a.status as AdvanceStatus, decision);
  await prisma.$transaction(async (tx) => {
    await tx.salaryAdvanceApplication.update({ where: { id: a.id }, data: { status: decision, decidedAt: new Date(), decidedBy: actor, decisionNote: note.slice(0, 500) } });
    if (a.order.status === 'bank_review') {
      await tx.order.update({ where: { id: a.orderId }, data: { status: decision, events: { create: { status: decision, note: decision === 'approved' ? 'Salary Advance approved by Azania Bank' : `Salary Advance declined${note ? `: ${note}` : ''}`, actor } } } });
      await tx.payment.updateMany({ where: { orderId: a.orderId, status: 'pending' }, data: { status: decision === 'approved' ? 'captured' : 'failed', reference: a.bankReference } });
      if (decision === 'approved') await issueInvoice(tx, a.orderId, a.total, 'paid');
      else await restock(tx, a.orderId);
    }
  });
  await notifyCustomer(
    a.phone,
    decision === 'approved'
      ? `${brandName(a.order.brandKey)}: Azania Bank approved your Salary Advance for order ${a.order.number}. ${a.termMonths} x ${fmtTZS(a.monthly)}. We are packing your order.`
      : `${brandName(a.order.brandKey)}: Azania Bank could not approve the Salary Advance for order ${a.order.number}. Please contact support for other payment options.`,
  );
}

/** Ask the bank adapter for a decision (mock: affordability rule). */
export async function requestBankDecision(applicationId: string, actor: string) {
  const a = await prisma.salaryAdvanceApplication.findUniqueOrThrow({ where: { id: applicationId } });
  const d = await integrations.bank.decideAdvance(a.bankReference, { monthly: a.monthly, netSalary: Number(decrypt(a.netSalaryEnc)) });
  if (d.status === 'pending') return d;
  await decideAdvance(applicationId, d.status, actor, d.note);
  return d;
}

export async function advanceLifecycle(applicationId: string, to: 'disbursed' | 'repaying' | 'closed', actor: string) {
  const a = await prisma.salaryAdvanceApplication.findUniqueOrThrow({ where: { id: applicationId } });
  assertAdvanceTransition(a.status as AdvanceStatus, to);
  await prisma.salaryAdvanceApplication.update({ where: { id: a.id }, data: { status: to, decidedBy: actor } });
}

/** Contract PDF bytes (regenerated for seeded contracts without a stored PDF). */
export async function contractFile(contractNo: string) {
  const ct = await prisma.contract.findUnique({ where: { number: contractNo }, include: { application: { include: { order: { include: { items: true } }, schedule: { orderBy: { n: 'asc' } } } } } });
  if (!ct) return null;
  if (ct.pdfKey) {
    const f = await integrations.storage.get(ct.pdfKey);
    if (f) return { ...f, order: ct.application.order };
  }
  const a = ct.application;
  const brandRow = await prisma.brand.findUniqueOrThrow({ where: { key: a.order.brandKey } });
  const pdf = await contractPdf({
    number: ct.number,
    signedAt: ct.signedAt,
    seller: { legal: brandRow.legal, logoPng: await brandLogo(a.order.brandKey) },
    azaniaLogoPng: await azaniaLogo(),
    customer: { name: a.fullName, nida: decrypt(a.nidaEnc), jobTitle: a.jobTitle, employer: a.employer, checkNumber: a.checkNumber, account: `•••• ${a.accountLast4}`, phone: a.phone },
    orderNumber: a.order.number,
    items: a.order.items,
    total: a.total,
    months: a.termMonths,
    monthly: a.monthly,
    firstDeduction: firstDeductionDate(ct.signedAt),
    schedule: a.schedule,
    terms: contractTerms(a.termMonths, fmtTZS(a.monthly), fmtDate(firstDeductionDate(ct.signedAt))),
    signature: ct.signerName,
    consents: ct.consents as { text: string; acceptedAt: string }[],
  });
  const key = `contracts/${ct.number}.pdf`;
  await integrations.storage.put(key, pdf, 'application/pdf');
  await prisma.contract.update({ where: { id: ct.id }, data: { pdfKey: key, sha256: sha256(Buffer.from(pdf)) } });
  return { data: pdf, contentType: 'application/pdf', order: a.order };
}

export async function invoiceFile(invoiceNo: string) {
  const inv = await prisma.invoice.findUnique({ where: { number: invoiceNo }, include: { order: { include: { items: true, brand: true } } } });
  if (!inv) return null;
  const o = inv.order;
  const pdf = await invoicePdf({
    number: inv.number,
    issuedAt: inv.issuedAt,
    status: inv.status,
    seller: { legal: o.brand.legal, logoPng: await brandLogo(o.brandKey), email: o.brand.supportEmail },
    orderNumber: o.number,
    customer: { name: o.contactName, phone: o.contactPhone, region: o.region },
    items: o.items,
    deliveryFee: o.deliveryFee,
    discount: o.discount,
    total: o.total,
    paymentMethod: paymentLabel(o.paymentMethod as PaymentMethod),
  });
  return { data: pdf, contentType: 'application/pdf', order: o };
}
