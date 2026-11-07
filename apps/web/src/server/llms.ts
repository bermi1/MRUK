import 'server-only';
import { fmt } from '@/lib/format';
import { translate, type MessageKey } from '@/lib/i18n';
import { absUrl, productLabel, publicUrl, siteBrands } from '@/lib/site';
import type { BrandKey, ProductView } from '@/lib/types';
import { getBrand, getCategories, getCms, getFlashDeals, getProducts, getSuppliers } from './catalog';
import { payLaterOn } from './paylater';
import { stripPayLater } from '@bt/core';

/**
 * /llms.txt and /llms-full.txt (https://llmstxt.org): a plain Markdown map of the store for AI
 * assistants, built from the live (cached) catalogue. Only facts the storefront already shows:
 * prices, stock, features, delivery/warranty copy and the Pay Later FAQ. No invented policies.
 */

const t = (k: MessageKey, v?: Record<string, string | number>) => translate('en', k, v);

function stockText(stock: number): string {
  if (stock <= 0) return 'out of stock';
  return stock <= 5 ? `limited stock (${stock} left)` : 'in stock';
}

/** Markdown-safe single line. */
const md = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/([[\]])/g, '\\$1').trim();

const PL_FAQ = [
  ['plQ1', 'plA1'],
  ['plQ2', 'plA2'],
  ['plQ3', 'plA3'],
  ['plQ4', 'plA4'],
  ['plQ5', 'plA5'],
] as const;

async function brandSection(key: BrandKey, full: boolean, nested: boolean): Promise<string> {
  const [brand, cms, cats, products, flash, suppliers, payLater] = await Promise.all([getBrand(key), getCms(key), getCategories(key), getProducts(key), getFlashDeals(key), getSuppliers(key), payLaterOn(key)]);
  const deal = new Map(flash.map((f) => [f.id, f]));
  const price = (p: ProductView) => {
    const d = deal.get(p.id);
    return d ? `${fmt(d.dealPrice)} (flash deal, −${d.off}% off ${fmt(p.price)})` : fmt(p.price);
  };
  const L: string[] = [];
  const top = nested ? '##' : '#';
  const h = `${top}#`;
  L.push(`${top} ${brand.name}`, '');
  L.push(`> ${md((payLater ? cms.seo.desc : stripPayLater(cms.seo.desc)) || brand.tagline)} Online store of ${md(brand.legal || brand.name)}, Tanzania. Prices are in Tanzanian shillings (TZS), VAT inclusive.`, '');
  L.push(`- Store: ${publicUrl(key)}`);
  if (brand.whatsapp) L.push(`- WhatsApp support: +${brand.whatsapp.replace(/\D/g, '')} (https://wa.me/${brand.whatsapp.replace(/\D/g, '')})`);
  if (brand.supportEmail) L.push(`- Email: ${brand.supportEmail}`);
  const social = Object.values(cms.social).filter(Boolean);
  if (social.length) L.push(`- Social: ${social.join(', ')}`);
  L.push('');

  L.push(`${h} Policies`, '');
  L.push(`- Delivery: ${t('plA5')}`);
  L.push(`- Warranty and tax: ${t('vatNote')}.`);
  if (payLater) {
    L.push(`- Payment: pay in full (Azania Bank account or card) or monthly with ${t('salaryAdvance')}.`);
    L.push(`- Pay Later: ${t('payLaterIntro')} ${t('plEligNote')} Details: ${publicUrl(key, '/pay-later')}`);
  } else L.push('- Payment: pay in full (Azania Bank account or card).');
  L.push(`- Support and warranty claims: ${publicUrl(key, '/support')}`);
  L.push(`- Showrooms and dealers: ${suppliers.length} locations, ${publicUrl(key, '/suppliers')}`);
  L.push(`- Privacy: ${absUrl('/privacy')}`, '');

  L.push(`${h} Categories`, '');
  for (const c of cats) L.push(`- [${md(c.name)}](${publicUrl(key, `/c/${c.id}`)}): ${c.count} ${c.count === 1 ? 'product' : 'products'}${c.subs.length ? ` (${c.subs.map(md).join(', ')})` : ''}`);
  L.push(`- [All products](${publicUrl(key, '/shop')})`, `- [Deals and bundles](${publicUrl(key, '/deals')})`, '');

  L.push(`${h} Products`, '');
  if (!full) {
    for (const p of products) L.push(`- [${md(productLabel(p))}](${publicUrl(key, `/p/${p.id}`)}): ${price(p)}, ${stockText(p.stock)}`);
    L.push('');
    return L.join('\n');
  }
  for (const c of cats) {
    const list = products.filter((p) => p.cat === c.id);
    if (!list.length) continue;
    L.push(`${h}# ${md(c.name)}`, '');
    for (const p of list) {
      L.push(`${h}## ${md(productLabel(p))}`, '');
      L.push(`- URL: ${publicUrl(key, `/p/${p.id}`)}`);
      L.push(`- Model: ${md(p.model)}`);
      L.push(`- Category: ${md(c.name)}${p.sub ? ` > ${md(p.sub)}` : ''}`);
      L.push(`- Price: ${price(p)}`);
      if (payLater) L.push(`- Pay Later: about ${fmt((deal.get(p.id)?.dealPrice ?? p.price) / 12)} a month over 12 months, subject to Azania Bank approval and terms`);
      L.push(`- Availability: ${stockText(p.stock)}`);
      if (p.features.length) L.push(`- Features: ${p.features.map(md).join('; ')}`);
      if (p.images.length) L.push(`- Images: ${p.images.filter(Boolean).map(absUrl).join(' ')}`);
      L.push('');
    }
  }
  if (payLater) {
    L.push(`${h} ${t('salaryAdvance')}: questions`, '');
    for (const [q, a] of PL_FAQ) L.push(`- **${t(q)}** ${t(a)}`);
    L.push('');
  }
  L.push(`${h} Showrooms and dealers`, '');
  for (const s of suppliers) L.push(`- ${md(s.city)}, ${md(s.area)} (${md(s.type)}): ${md(s.phone)}, ${md(s.hours)}`);
  L.push('');
  return L.join('\n');
}

/** Markdown for this site's brand(s). `full` adds per-product detail, the Pay Later FAQ and showrooms. */
export async function llmsText(full: boolean): Promise<string> {
  const brands = siteBrands();
  const parts = await Promise.all(brands.map((b) => brandSection(b, full, brands.length > 1)));
  const head = parts.length > 1 ? `# Mr UK and Skywood\n\n> Two Tanzanian appliance and electronics brands. Each store below has its own catalogue.\n\n` : '';
  const foot = `\n---\nGenerated from the live catalogue at ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Prices and stock change; the product page is authoritative.${full ? '' : ` Full detail: ${absUrl('/llms-full.txt')}`}\n`;
  return head + parts.join('\n') + foot;
}
