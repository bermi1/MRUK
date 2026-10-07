import 'server-only';
import { prisma, type Prisma } from '@bt/db';
import { answerFromCatalogue, compareVerdict, groundedPrompt, normalizeTzPhone, retrieveProducts, supportQuickFixes, type PolicyFact } from '@bt/core';
import type { BrandKey, ProductView } from '@/lib/types';
import { integrations } from './integrations';
import { limit } from './ratelimit';
import { toFacts } from './catalog';

/** Policy facts the support assistant may quote (from the storefront FAQ). */
export const POLICIES: PolicyFact[] = [
  { id: 'salary-advance', topic: 'salary advance azania bank monthly pay instalment', text: 'Choose Salary Advance at checkout, verify with Azania Bank, and repay monthly from your salary over 3, 6 or 12 months. The instalment can be at most one third of your net salary. Approval is by Azania Bank.' },
  { id: 'delivery', topic: 'delivery shipping time arrive region', text: 'Dar es Salaam: next day. Other regions: 2–4 days. Delivery is free in Dar es Salaam on orders of TZS 500,000 or more. Showroom pickup is ready in 24 hours.' },
  { id: 'warranty', topic: 'warranty guarantee repair claim broken fault', text: 'Products carry a 2-year manufacturer warranty. Send a support request with your order number and a photo; a technician from the nearest service centre will contact you.' },
  { id: 'returns', topic: 'return refund exchange', text: 'Unused products in original packaging can be returned within 7 days. Contact support to arrange collection.' },
  { id: 'payment', topic: 'payment pay card visa mastercard cash mobile money', text: 'We accept Azania Bank Salary Advance, Azania Bank account, Visa and Mastercard cards, and pay on delivery in Dar es Salaam. Mobile money is not available yet.' },
];

export async function aiVerdict(items: ProductView[], months: number) {
  await limit('ai', 20, 10 * 60);
  const facts = items.map(toFacts);
  const base = compareVerdict(facts, months);
  const out = await integrations.ai.complete(groundedPrompt(`Give a short verdict: best overall, best value (mention the monthly price over ${months} months), and who each product suits.`, { products: facts }));
  return { text: out ?? base.text, source: out ? integrations.ai.name : 'catalogue' };
}

export async function aiAnswer(items: ProductView[], question: string, months: number) {
  await limit('ai', 20, 10 * 60);
  const q = question.slice(0, 300);
  const facts = items.map(toFacts);
  const det = answerFromCatalogue(q, facts, months, POLICIES);
  if (!det.grounded) return { text: det.text, grounded: false };
  const out = await integrations.ai.complete(groundedPrompt(`Answer the customer question in at most 80 words: ${q}`, { products: facts, policies: POLICIES }));
  return { text: out ?? det.text, grounded: true };
}

/** Store-wide assistant: retrieve relevant products first, then answer only from them. */
export async function aiStoreAnswer(products: ProductView[], question: string) {
  const facts = products.map(toFacts);
  const hits = retrieveProducts(question, facts, 4);
  return aiAnswer(products.filter((p) => hits.some((h) => h.id === p.id)), question, 12);
}

export async function aiTips(issue: string, product: ProductView | null, description: string) {
  await limit('ai', 20, 10 * 60);
  const base = supportQuickFixes(issue);
  const out = await integrations.ai.complete(
    groundedPrompt(`A customer has an issue (${issue}) with ${product ? `${product.name} (${product.model})` : 'a home appliance'}: "${description.slice(0, 400)}". Give 3 short, safe troubleshooting steps a customer can try at home, then say when to wait for a technician. Plain numbered list, max 90 words. Never suggest opening the unit or handling gas or wiring.`, { products: product ? [toFacts(product)] : [], policies: POLICIES }),
  );
  return out ?? base;
}

export interface TicketInput {
  brand: BrandKey;
  issue: string;
  name: string;
  phone: string;
  orderNumber?: string;
  productId?: string;
  description: string;
  photo?: { data: Uint8Array; contentType: string } | null;
  channel?: string;
}

export const ISSUES = ['Repair', 'Installation', 'Warranty claim', 'Delivery', 'Other'] as const;

export async function createTicket(t: TicketInput) {
  const phone = normalizeTzPhone(t.phone);
  if (!t.name.trim()) throw new Error('Enter your name');
  if (!phone) throw new Error('Enter a valid Tanzanian phone number');
  if (!(ISSUES as readonly string[]).includes(t.issue)) throw new Error('Choose an issue type');
  if (t.description.trim().length < 5) throw new Error('Describe the problem in a few words');
  await limit('ticket', 5, 60 * 60, phone);
  const ticket = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const c = await tx.counter.upsert({ where: { key: 'ticket' }, create: { key: 'ticket', value: 4_200 }, update: { value: { increment: 1 } } });
    const number = `TK-${c.value}`;
    return tx.ticket.create({
      data: {
        number,
        brandKey: t.brand,
        issue: t.issue,
        name: t.name.trim().slice(0, 120),
        phone,
        orderNumber: (t.orderNumber ?? '').trim().toUpperCase().slice(0, 20),
        productId: (t.productId ?? '').slice(0, 80),
        description: t.description.trim().slice(0, 2000),
        channel: t.channel ?? 'web',
        messages: { create: { author: t.name.trim().slice(0, 120), body: t.description.trim().slice(0, 2000) } },
      },
    });
  });
  if (t.photo) {
    const ext = t.photo.contentType === 'image/png' ? 'png' : t.photo.contentType === 'image/webp' ? 'webp' : 'jpg';
    const key = `tickets/${ticket.number}.${ext}`;
    await integrations.storage.put(key, t.photo.data, t.photo.contentType);
    await prisma.ticket.update({ where: { id: ticket.id }, data: { photoKey: key } });
  }
  await integrations.sms.send(phone, `${t.brand === 'skywood' ? 'Skywood' : 'Mr UK'} support: we received request ${ticket.number}. We will call you within 2 working hours.`).catch(() => undefined);
  return { number: ticket.number, phone };
}
