/**
 * AI compare verdict, deterministic and bilingual (English / Kiswahili).
 *
 * Built only from catalogue fields staff enter in the admin: name, model, category,
 * sub-category, feature/spec bullets, price (with any live deal), stock and rating.
 * It never adds a spec: needs are matched only when a listed feature contains the
 * keyword, and anything the catalogue does not list is reported as "not specified".
 * An LLM adapter may rephrase it (see verdictPrompt), but is given the same facts only.
 */
import { fmtTZS } from './money';
import { LOW_STOCK } from './pricing';
import type { ProductFacts } from './catalogue-ai';

export type Lang = 'en' | 'sw';

export interface CompareFacts extends ProductFacts {
  rating?: number;
  reviews?: number;
}

export interface ProductVerdict {
  model: string;
  name: string;
  pros: string[];
  cons: string[];
}

export interface VerdictView {
  lang: Lang;
  /** Recommended product (model) and the one-line reason. */
  pick: string;
  recommendation: string;
  value: string;
  needs: { need: string; model: string; because: string }[];
  products: ProductVerdict[];
  notSpecified: string;
  /** Models the verdict talks about (always a subset of the input). */
  sources: string[];
}

export const COMPARE_MAX = 3;

/** Same-category rule for comparisons: true when every product shares the first one's category. */
export function sameCategory(items: { category: string }[]): boolean {
  return items.every((p) => p.category === items[0]?.category);
}

const NEEDS: { re: RegExp; en: string; sw: string }[] = [
  { re: /energy|inverter|saving|efficien|eco\b|a\+/i, en: 'lower electricity bills', sw: 'kupunguza gharama za umeme' },
  { re: /large|capacity|litre|liter|\d+\s?l\b|multi-door|double door|french|side by side|family|xl\b/i, en: 'a big family or storing more', sw: 'familia kubwa au kuhifadhi zaidi' },
  { re: /commercial|business|shop|heavy duty|industrial/i, en: 'a shop or business use', sw: 'duka au matumizi ya biashara' },
  { re: /quiet|silent|low noise|whisper/i, en: 'quiet rooms', sw: 'vyumba vyenye utulivu' },
  { re: /no[- ]?frost|frost[- ]free|auto(matic)?[- ]defrost/i, en: 'less upkeep (no manual defrosting)', sw: 'matunzo kidogo (bila kuyeyusha barafu)' },
  { re: /dispenser|water/i, en: 'cold water on tap', sw: 'maji baridi muda wote' },
  { re: /bluetooth|usb|aux|wireless|fm|radio|karaoke|mic/i, en: 'playing music from phones and radio', sw: 'kucheza muziki kutoka simu na redio' },
  { re: /compact|portable|single door|mini|small|slim/i, en: 'small spaces', sw: 'nafasi ndogo' },
  { re: /smart|wi-?fi|app\b|remote|android|netflix|youtube/i, en: 'smart, easy control', sw: 'udhibiti rahisi wa kisasa' },
  { re: /\d+\s?(hp|kva|kw|w)\b|watt|power|motor|turbo|fast/i, en: 'power and speed', sw: 'nguvu na kasi' },
  { re: /auto|automatic|timer|program/i, en: 'hands-free, automatic use', sw: 'matumizi ya kujiendesha' },
];

const L = {
  en: {
    pickBoth: (n: string, f: number) => `${n} is the clear choice: it lists the most features (${f}) and has the lowest price.`,
    pick: (n: string, f: number, v: string, save: string) => `Choose ${n} for the most listed features (${f}). Choose ${v} to save ${save}.`,
    pickTie: (n: string) => `They list the same number of features; ${n} wins on price.`,
    valueOnly: (n: string, p: string) => `Best value: ${n} at ${p}.`,
    valueMore: (n: string, more: string, adds: string) => `${n} costs ${more} more${adds ? ` and adds: ${adds}` : ' but lists no extra features'}.`,
    monthly: (m: string, months: number) => ` From ${m}/month over ${months} months with Pay Later.`,
    deal: (was: string) => ` (flash deal, was ${was})`,
    lowest: 'Lowest price',
    highest: 'Highest price',
    onlyHas: (f: string) => `Only one here with: ${f}`,
    lacks: (f: string) => `Does not list: ${f}`,
    noFeatures: 'Features not specified in our catalogue',
    out: 'Out of stock',
    low: (n: number) => `Only ${n} left`,
    rating: (r: string, n: number) => `Best rated (${r}★, ${n} reviews)`,
    because: (f: string) => `lists “${f}”`,
    notSpecified: 'Anything not listed above (for example exact dimensions, energy rating or warranty terms beyond our standard 2 years) is not specified in our catalogue. Ask our team before you buy.',
  },
  sw: {
    pickBoth: (n: string, f: number) => `${n} ndiyo chaguo bora: ina sifa nyingi zaidi zilizoorodheshwa (${f}) na bei ya chini zaidi.`,
    pick: (n: string, f: number, v: string, save: string) => `Chagua ${n} kwa sifa nyingi zaidi zilizoorodheshwa (${f}). Chagua ${v} ili uokoe ${save}.`,
    pickTie: (n: string) => `Zina idadi sawa ya sifa; ${n} inashinda kwa bei.`,
    valueOnly: (n: string, p: string) => `Thamani bora kwa pesa: ${n} kwa ${p}.`,
    valueMore: (n: string, more: string, adds: string) => `${n} inagharimu ${more} zaidi${adds ? ` na inaongeza: ${adds}` : ' lakini haina sifa za ziada zilizoorodheshwa'}.`,
    monthly: (m: string, months: number) => ` Kuanzia ${m} kwa mwezi kwa miezi ${months} kupitia Lipa Baadaye.`,
    deal: (was: string) => ` (ofa ya muda, awali ${was})`,
    lowest: 'Bei ya chini zaidi',
    highest: 'Bei ya juu zaidi',
    onlyHas: (f: string) => `Ndiyo pekee yenye: ${f}`,
    lacks: (f: string) => `Haijaorodhesha: ${f}`,
    noFeatures: 'Sifa hazijaelezwa kwenye katalogi yetu',
    out: 'Imeisha',
    low: (n: number) => `Zimebaki ${n} tu`,
    rating: (r: string, n: number) => `Imekadiriwa juu zaidi (${r}★, maoni ${n})`,
    because: (f: string) => `ina “${f}”`,
    notSpecified: 'Chochote kisichoorodheshwa hapo juu (kwa mfano vipimo kamili, kiwango cha matumizi ya umeme au masharti ya dhamana zaidi ya miaka 2 ya kawaida) hakijaelezwa kwenye katalogi yetu. Uliza timu yetu kabla ya kununua.',
  },
};

const list = (xs: string[], max = 3) => xs.slice(0, max).join(', ');

/** Deterministic verdict from catalogue fields only. */
export function buildVerdict(items: CompareFacts[], opts: { lang?: Lang; months?: number; payLater?: boolean } = {}): VerdictView {
  if (!items.length) throw new Error('Nothing to compare');
  const lang: Lang = opts.lang === 'sw' ? 'sw' : 'en';
  const months = opts.months ?? 12;
  const t = L[lang];
  const norm = (f: string) => f.trim().toLowerCase();
  const byPrice = [...items].sort((a, b) => a.price - b.price);
  const cheapest = byPrice[0]!;
  const dearest = byPrice[byPrice.length - 1]!;
  const best = [...items].sort((a, b) => b.features.length - a.features.length || (b.rating ?? 0) - (a.rating ?? 0) || a.price - b.price)[0]!;
  const priceText = (p: CompareFacts) => fmtTZS(p.price) + (p.listPrice && p.listPrice > p.price ? t.deal(fmtTZS(p.listPrice)) : '');

  let recommendation: string;
  if (items.length === 1) recommendation = t.valueOnly(best.name, priceText(best));
  else if (best.features.length === cheapest.features.length) recommendation = t.pickTie(cheapest.name);
  else if (best === cheapest) recommendation = t.pickBoth(best.name, best.features.length);
  else recommendation = t.pick(best.name, best.features.length, cheapest.name, fmtTZS(best.price - cheapest.price));
  const pick = items.length > 1 && best.features.length === cheapest.features.length ? cheapest : best;

  const cheapSet = new Set(cheapest.features.map(norm));
  const value = [
    t.valueOnly(cheapest.name, priceText(cheapest)) + (opts.payLater ? t.monthly(fmtTZS(cheapest.price / months), months) : ''),
    ...byPrice.slice(1).map((p) => t.valueMore(p.name, fmtTZS(p.price - cheapest.price), list(p.features.filter((f) => !cheapSet.has(norm(f)))))),
  ].join(' ');

  const needs: VerdictView['needs'] = [];
  for (const n of NEEDS) {
    const hits = items.map((p) => ({ p, f: p.features.find((f) => n.re.test(f)) })).filter((x): x is { p: CompareFacts; f: string } => !!x.f);
    if (!hits.length || (hits.length === items.length && items.length > 1)) continue; // only needs that tell them apart
    const h = hits.sort((a, b) => a.p.price - b.p.price)[0]!;
    needs.push({ need: n[lang], model: h.p.model, because: t.because(h.f) });
  }

  const topRated = items.length > 1 ? [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] : undefined;
  const products: ProductVerdict[] = items.map((p) => {
    const others = items.filter((o) => o !== p);
    const otherFeats = new Set(others.flatMap((o) => o.features.map(norm)));
    const mine = new Set(p.features.map(norm));
    const unique = p.features.filter((f) => !otherFeats.has(norm(f)));
    // "Does not list" only against the same kind of product (a hood is not missing a hob's burners).
    const missing = [...new Set(others.filter((o) => o.sub === p.sub).flatMap((o) => o.features))].filter((f) => !mine.has(norm(f)));
    const pros: string[] = [];
    const cons: string[] = [];
    if (unique.length && others.length) pros.push(t.onlyHas(list(unique)));
    if (others.length && p === cheapest && cheapest.price < dearest.price) pros.push(t.lowest);
    if (topRated && p === topRated && (p.rating ?? 0) > Math.max(...others.map((o) => o.rating ?? 0))) pros.push(t.rating((p.rating ?? 0).toFixed(1), p.reviews ?? 0));
    if (!p.features.length) cons.push(t.noFeatures);
    if (missing.length) cons.push(t.lacks(list(missing)));
    if (others.length && p === dearest && cheapest.price < dearest.price) cons.push(t.highest);
    if (p.stock <= 0) cons.push(t.out);
    else if (p.stock <= LOW_STOCK) cons.push(t.low(p.stock));
    return { model: p.model, name: p.name, pros, cons };
  });

  return { lang, pick: pick.model, recommendation, value, needs, products, notSpecified: t.notSpecified, sources: items.map((p) => p.model) };
}

/** Plain-text rendering (for logs, sharing and as the LLM's reference answer). */
export function verdictText(v: VerdictView): string {
  const h = v.lang === 'sw' ? { needs: 'Inafaa zaidi kwa', pros: 'Faida', cons: 'Hasara' } : { needs: 'Best for', pros: 'Pros', cons: 'Cons' };
  return [
    v.recommendation,
    v.value,
    ...v.needs.map((n) => `${h.needs} ${n.need}: ${n.model} (${n.because})`),
    ...v.products.map((p) => `${p.name}: ${h.pros}: ${p.pros.join('; ') || '—'}. ${h.cons}: ${p.cons.join('; ') || '—'}.`),
    v.notSpecified,
  ].join('\n');
}

/** Prompt for an LLM adapter: same facts, same JSON shape, in the requested language. */
export function verdictPrompt(items: CompareFacts[], reference: VerdictView, opts: { lang: Lang; months: number; payLater: boolean }): string {
  const data = items.map((p) => ({
    model: p.model,
    name: p.name,
    category: p.category,
    type: p.sub,
    priceTZS: p.price,
    ...(p.listPrice && p.listPrice > p.price ? { listPriceTZS: p.listPrice } : {}),
    stock: p.stock,
    rating: p.rating,
    reviews: p.reviews,
    features: p.features,
  }));
  return [
    'You are a product advisor for Mr UK and Skywood, appliance stores in Tanzania.',
    'Compare the products below using ONLY this catalogue data, which staff entered in our admin. Never invent specifications, capacities, energy ratings, dimensions, prices or warranty terms.',
    opts.lang === 'sw'
      ? 'Write in natural, everyday Kiswahili (Tanzania). Where information is missing, say "haijaelezwa".'
      : 'Write in clear, natural English. Where information is missing, say "not specified".',
    'Prices are in Tanzanian shillings (TZS), written like "TZS 1,250,000". priceTZS is what the customer pays today; listPriceTZS (when present) is the price before a flash deal.',
    opts.payLater ? `You may mention the monthly price over ${opts.months} months with Pay Later by Azania Bank (price / ${opts.months}).` : 'Do not mention monthly prices, instalments, Pay Later or salary advances.',
    'Reply with JSON only, no markdown, in exactly this shape: {"pick": model, "recommendation": string, "value": string, "needs": [{"need": string, "model": model, "because": string}], "products": [{"model": model, "pros": [string], "cons": [string]}], "notSpecified": string}.',
    'Every "model" must be one of the models in the data. Keep each string under 40 words.',
    '',
    `CATALOGUE: ${JSON.stringify(data)}`,
    `REFERENCE (deterministic, from the same data; improve the wording, keep the facts): ${JSON.stringify(reference)}`,
  ].join('\n');
}

/** Parse and validate an LLM verdict; null when it is malformed or names a product we did not supply. */
export function parseVerdict(raw: string | null, items: CompareFacts[], lang: Lang): VerdictView | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')) as Partial<VerdictView> & { products?: { model: string; pros: string[]; cons: string[] }[] };
    const models = new Set(items.map((p) => p.model));
    const str = (x: unknown) => typeof x === 'string' && x.trim().length > 0 && x.length < 600;
    const strs = (x: unknown) => Array.isArray(x) && x.every(str);
    if (!str(j.pick) || !models.has(j.pick!) || !str(j.recommendation) || !str(j.value) || !str(j.notSpecified)) return null;
    if (!Array.isArray(j.needs) || !j.needs.every((n) => n && str(n.need) && str(n.because) && models.has(n.model))) return null;
    if (!Array.isArray(j.products) || !j.products.every((p) => p && models.has(p.model) && strs(p.pros) && strs(p.cons))) return null;
    return {
      lang,
      pick: j.pick!,
      recommendation: j.recommendation!,
      value: j.value!,
      needs: j.needs.slice(0, 8),
      products: j.products.map((p) => ({ model: p.model, name: items.find((i) => i.model === p.model)!.name, pros: p.pros.slice(0, 5), cons: p.cons.slice(0, 5) })),
      notSpecified: j.notSpecified!,
      sources: items.map((p) => p.model),
    };
  } catch {
    return null;
  }
}
