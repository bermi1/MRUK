import 'server-only';
import { prisma, type Prisma } from '@bt/db';
import { answerFromCatalogue, buildVerdict, groundedPrompt, normalizeTzPhone, parseVerdict, retrieveProducts, supportQuickFixes, verdictPrompt, type Lang, type PolicyFact, type VerdictView } from '@bt/core';
import type { BrandKey, ProductView } from '@/lib/types';
import { integrations } from './integrations';
import { toWebp } from './images';
import { limit } from './ratelimit';
import { toFacts } from './catalog';
import { emitTaskEvent } from './tasks';

/** Policy facts the support assistant may quote (from the storefront FAQ). */
export const POLICIES: PolicyFact[] = [
  { id: 'salary-advance', topic: 'pay later salary advance azania bank monthly pay instalment', text: 'Choose Pay Later at checkout, verify with Azania Bank, and repay monthly from your salary over 3, 6 or 12 months. The instalment can be at most one third of your net salary. Approval is by Azania Bank.' },
  { id: 'delivery', topic: 'delivery shipping time arrive region', text: 'Dar es Salaam: next day. Other regions: 2–4 days. Delivery is free in Dar es Salaam on orders of TZS 500,000 or more. Showroom pickup is ready in 24 hours.' },
  { id: 'warranty', topic: 'warranty guarantee repair claim broken fault', text: 'Products carry a 2-year manufacturer warranty. Send a support request with your order number and a photo; a technician from the nearest service centre will contact you.' },
  { id: 'returns', topic: 'return refund exchange', text: 'Unused products in original packaging can be returned within 7 days. Contact support to arrange collection.' },
  { id: 'payment', topic: 'payment pay card visa mastercard cash mobile money', text: 'We accept Pay Later by Azania Bank, Azania Bank account, Visa and Mastercard cards, and pay on delivery in Dar es Salaam. Mobile money is not available yet.' },
];

/** Policies the assistant may quote: nothing about Pay Later while the brand has it switched off. */
export function policiesFor(payLater: boolean): PolicyFact[] {
  if (payLater) return POLICIES;
  return POLICIES.filter((p) => p.id !== 'salary-advance').map((p) =>
    p.id === 'payment' ? { ...p, topic: 'payment pay card visa mastercard cash mobile money', text: 'We accept Azania Bank account, Visa and Mastercard cards, and pay on delivery in Dar es Salaam. Mobile money is not available yet.' } : p,
  );
}

const NO_PAY_LATER = 'Do not mention monthly prices, instalments, Pay Later or salary advances; these products are sold for payment in full.';

/** Verdicts per product set + language + Pay Later + product updatedAt/price (bounded, per server instance). */
const verdictCache = new Map<string, { v: VerdictView; source: string }>();
const VERDICT_CACHE_MAX = 300;

/**
 * AI compare verdict in English or Kiswahili, grounded in the catalogue fields staff entered.
 * The deterministic verdict (@bt/core buildVerdict) always exists; with an AI provider set the
 * model rephrases it from the same facts and its JSON is validated (unknown products → rejected).
 */
export async function aiCompareVerdict(items: { view: ProductView; updatedAt: Date }[], opts: { lang: Lang; months: number; payLater: boolean }) {
  const key = [opts.lang, opts.payLater ? `pl${opts.months}` : 'full', ...items.map((i) => `${i.view.id}@${i.updatedAt.getTime()}:${i.view.price}:${i.view.stock}`)].join('|');
  const hit = verdictCache.get(key);
  if (hit) return { ...hit, cached: true };
  await limit('ai', 20, 10 * 60);
  const facts = items.map((i) => toFacts(i.view));
  const base = buildVerdict(facts, opts);
  const llm = parseVerdict(await integrations.ai.complete(verdictPrompt(facts, base, opts)), facts, opts.lang);
  const out = { v: llm ?? base, source: llm ? integrations.ai.name : 'catalogue' };
  if (verdictCache.size >= VERDICT_CACHE_MAX) verdictCache.delete(verdictCache.keys().next().value!);
  verdictCache.set(key, out);
  return { ...out, cached: false };
}

export async function aiAnswer(items: ProductView[], question: string, months: number, payLater = true) {
  await limit('ai', 20, 10 * 60);
  const q = question.slice(0, 300);
  const facts = items.map(toFacts);
  const policies = policiesFor(payLater);
  const det = answerFromCatalogue(q, facts, months, policies, payLater);
  if (!det.grounded) return { text: det.text, grounded: false };
  // With Pay Later off, monthly/Pay Later questions get the deterministic full-price answer only.
  if (!payLater && det.sources.length && /(month|salary|instal|\/mo|pay later|credit|loan|azania|advance)/i.test(q)) return { text: det.text, grounded: true };
  const out = await integrations.ai.complete(groundedPrompt(`Answer the customer question in at most 80 words: ${q}${payLater ? '' : ` ${NO_PAY_LATER}`}`, { products: facts, policies }));
  return { text: out ?? det.text, grounded: true };
}

/** Store-wide assistant: retrieve relevant products first, then answer only from them. */
export async function aiStoreAnswer(products: ProductView[], question: string, payLater = true) {
  const facts = products.map(toFacts);
  const hits = retrieveProducts(question, facts, 4);
  return aiAnswer(products.filter((p) => hits.some((h) => h.id === p.id)), question, 12, payLater);
}

export async function aiTips(issue: string, product: ProductView | null, description: string, payLater = true) {
  await limit('ai', 20, 10 * 60);
  const base = supportQuickFixes(issue);
  const out = await integrations.ai.complete(
    groundedPrompt(`A customer has an issue (${issue}) with ${product ? `${product.name} (${product.model})` : 'a home appliance'}: "${description.slice(0, 400)}". Give 3 short, safe troubleshooting steps a customer can try at home, then say when to wait for a technician. Plain numbered list, max 90 words. Never suggest opening the unit or handling gas or wiring.`, { products: product ? [toFacts(product)] : [], policies: policiesFor(payLater) }),
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
  // Customer photos are stored as WebP like every other image (rotated, metadata such as GPS stripped).
  let photo: Uint8Array | null = null;
  if (t.photo) {
    try {
      photo = await toWebp(t.photo.data);
    } catch {
      throw new Error('The photo could not be read. Attach a JPG, PNG or WebP image.');
    }
  }
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
  if (photo) {
    const key = `tickets/${ticket.number}.webp`;
    await integrations.storage.put(key, photo, 'image/webp');
    await prisma.ticket.update({ where: { id: ticket.id }, data: { photoKey: key } });
  }
  await emitTaskEvent({ type: 'ticket.created', brand: t.brand, ticketId: ticket.id, number: ticket.number, issue: t.issue });
  await integrations.sms.send(phone, `${t.brand === 'skywood' ? 'Skywood' : 'Mr UK'} support: we received request ${ticket.number}. We will call you within 2 working hours.`).catch(() => undefined);
  return { number: ticket.number, phone };
}
