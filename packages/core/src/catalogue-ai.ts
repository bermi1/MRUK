/**
 * Catalogue-grounded answers for AI compare and support.
 *
 * The rule (MASTER_PROMPT): answers come only from catalogue and policy data.
 * If the data can't answer, say so and point to support. This module does the
 * retrieval and a deterministic answer; an LLM adapter may rephrase, but it is
 * only ever given the facts retrieved here.
 */
import { fmtTZS } from './money';

export interface ProductFacts {
  id: string;
  brand: string;
  model: string;
  name: string;
  category: string;
  sub: string;
  price: number;
  stock: number;
  features: string[];
}

export interface PolicyFact {
  id: string;
  topic: string;
  text: string;
}

const STOP = new Set('a an the is are of for to and or in on with my me i we you it this that which what who how do does can best most more less than be at by from about'.split(' '));

const SYNONYMS: Record<string, string[]> = {
  power: ['energy', 'saving', 'efficient', 'inverter', 'watt', 'w', 'electricity'],
  electricity: ['energy', 'saving', 'efficient', 'inverter'],
  energy: ['saving', 'efficient', 'inverter'],
  cheap: ['price', 'value'],
  quiet: ['noise', 'silent', 'minimal'],
  noise: ['quiet', 'minimal'],
  big: ['large', 'capacity', 'litres', 'multi-door', 'commercial'],
  family: ['large', 'capacity', 'multi-door', 'double', 'litres'],
  shop: ['commercial', 'large', 'capacity'],
  water: ['dispenser', 'pump', 'flow'],
  farm: ['pump', 'flow', 'agriculture', 'sprayer'],
  outage: ['generator', 'hours', 'ac', 'dc'],
  bluetooth: ['wireless'],
  frost: ['no-frost', 'defrost'],
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.\-\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ''))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function expand(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const t of tokens) for (const s of SYNONYMS[t] ?? []) out.add(s);
  return [...out];
}

function productText(p: ProductFacts): string {
  return [p.model, p.name, p.category, p.sub, ...p.features].join(' ').toLowerCase();
}

/** Keyword retrieval with synonym expansion. Returns products with score > 0, best first. */
export function retrieveProducts(query: string, products: ProductFacts[], k = 5): ProductFacts[] {
  const q = expand(tokenize(query));
  if (!q.length) return [];
  return products
    .map((p) => {
      const text = productText(p);
      const score = q.reduce((a, t) => a + (text.includes(t) ? (p.model.toLowerCase().includes(t) ? 3 : 1) : 0), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.p);
}

export function retrievePolicies(query: string, policies: PolicyFact[], k = 3): PolicyFact[] {
  const q = expand(tokenize(query));
  return policies
    .map((f) => ({ f, score: q.filter((t) => `${f.topic} ${f.text}`.toLowerCase().includes(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.f);
}

export interface Verdict {
  bestOverall: ProductFacts;
  bestValue: ProductFacts;
  text: string;
}

/** Deterministic verdict from catalogue fields only. */
export function compareVerdict(items: ProductFacts[], months = 12): Verdict {
  if (!items.length) throw new Error('Nothing to compare');
  const bestValue = [...items].sort((a, b) => a.price - b.price)[0]!;
  const bestOverall = [...items].sort((a, b) => b.features.length - a.features.length || b.price - a.price)[0]!;
  const lines = [
    `Best overall: ${bestOverall.name} (${bestOverall.model}), with ${bestOverall.features.join(', ').toLowerCase()}.`,
    `Best value: ${bestValue.name} at ${fmtTZS(bestValue.price)}, or ${fmtTZS(bestValue.price / months)}/mo over ${months} months.`,
    items.map((p) => `${p.model} suits buyers who need ${(p.features[0] ?? p.sub).toLowerCase()}.`).join(' '),
  ];
  const low = items.filter((p) => p.stock <= 5);
  if (low.length) lines.push(`Low stock: ${low.map((p) => `${p.model} (${p.stock} left)`).join(', ')}.`);
  return { bestOverall, bestValue, text: lines.join('\n') };
}

export const SUPPORT_FALLBACK =
  "I can only answer from our catalogue and policy data, and it doesn't cover that. Please contact our support team on WhatsApp or send a support request, and a person will help.";

export interface GroundedAnswer {
  grounded: boolean;
  text: string;
  sources: string[];
}

/**
 * Answer a free-text question about specific products using only their data.
 * Returns grounded=false with the support fallback when the data can't answer.
 */
export function answerFromCatalogue(question: string, items: ProductFacts[], months = 12, policies: PolicyFact[] = []): GroundedAnswer {
  const q = question.toLowerCase();
  const toks = expand(tokenize(question));
  if (!items.length || !toks.length) return { grounded: false, text: SUPPORT_FALLBACK, sources: [] };
  const src = (ps: ProductFacts[]) => ps.map((p) => p.model);

  if (/(monthly|salary|instal|per month|\/mo)/.test(q)) {
    return {
      grounded: true,
      text: `With Salary Advance over ${months} months: ${items.map((p) => `${p.model} ${fmtTZS(p.price / months)}/mo`).join(', ')}. Terms of 3, 6 or 12 months are available, subject to Azania Bank approval.`,
      sources: src(items),
    };
  }
  if (/(cheap|value|price|cost|afford|budget|lowest)/.test(q)) {
    const s = [...items].sort((a, b) => a.price - b.price);
    const best = s[0]!;
    return {
      grounded: true,
      text: `Best value: ${best.name} (${best.model}) at ${fmtTZS(best.price)}, or ${fmtTZS(best.price / months)}/mo with Salary Advance. Prices: ${s.map((p) => `${p.model} ${fmtTZS(p.price)}`).join(', ')}.`,
      sources: src(s),
    };
  }
  if (/(stock|available|availability|left)/.test(q)) {
    return { grounded: true, text: items.map((p) => `${p.model}: ${p.stock <= 0 ? 'out of stock' : p.stock <= 5 ? `only ${p.stock} left` : 'in stock'}`).join('. ') + '.', sources: src(items) };
  }

  // Feature questions: which listed products mention the asked-about features?
  const matches = items
    .map((p) => ({ p, hits: p.features.filter((f) => toks.some((t) => f.toLowerCase().includes(t))) }))
    .filter((x) => x.hits.length);
  if (matches.length) {
    return {
      grounded: true,
      text:
        matches.map((m) => `${m.p.name} (${m.p.model}) lists: ${m.hits.join(', ').toLowerCase()}.`).join(' ') +
        (matches.length < items.length ? ` ${items.filter((p) => !matches.some((m) => m.p === p)).map((p) => p.model).join(', ')} ${matches.length < items.length - 1 ? "don't" : "doesn't"} list this.` : ''),
      sources: src(matches.map((m) => m.p)),
    };
  }

  // Size/use questions answered from category and features we do have.
  if (/(family|shop|small|large|big|home|commercial)/.test(q)) {
    const big = items.filter((p) => /large|commercial|multi|double|french|side by side|litre|capacity/i.test(p.features.join(' ') + ' ' + p.name));
    if (big.length) {
      return { grounded: true, text: `From the catalogue, the larger-capacity options are: ${big.map((p) => `${p.name} (${p.model})`).join(', ')}. Exact capacity is only listed where shown in the features.`, sources: src(big) };
    }
  }

  const pol = retrievePolicies(question, policies, 1)[0];
  if (pol) return { grounded: true, text: pol.text, sources: [pol.id] };
  return { grounded: false, text: SUPPORT_FALLBACK, sources: [] };
}

/** Prompt for an LLM adapter. The model sees only retrieved facts and must refuse otherwise. */
export function groundedPrompt(task: string, facts: { products?: ProductFacts[]; policies?: PolicyFact[] }): string {
  return [
    'You are a product advisor for Mr UK and Skywood in Tanzania.',
    'Use ONLY the catalogue and policy data below. Never invent specifications, prices or policies.',
    `If the data does not answer the question, reply exactly: "${SUPPORT_FALLBACK}"`,
    'Prices are in Tanzanian shillings (TZS), no decimals. Plain text, no markdown, at most 110 words.',
    '',
    `CATALOGUE: ${JSON.stringify((facts.products ?? []).map((p) => ({ model: p.model, name: p.name, type: p.sub, priceTZS: p.price, inStock: p.stock, features: p.features })))}`,
    `POLICIES: ${JSON.stringify((facts.policies ?? []).map((f) => f.text))}`,
    '',
    `TASK: ${task}`,
  ].join('\n');
}

const TIPS: Record<string, string[]> = {
  Repair: [
    'Check the power: socket, plug and fuse, and try another outlet.',
    'Unplug for 5 minutes, then restart.',
    'Make sure the unit is level with space around it for airflow.',
  ],
  Installation: [
    'Keep the packaging and manual; the technician will need the model number.',
    'Clear space and make sure there is a grounded socket nearby.',
    'For gas cookers and hobs, do not connect gas yourself; wait for the technician.',
  ],
  'Warranty claim': [
    'Find your order number or receipt; it is in the SMS we sent.',
    'Take a clear photo of the model label and the fault.',
    'Do not open the unit; this can void the 2-year warranty.',
  ],
  Delivery: [
    'Track the order with your order number on the Track order page.',
    'Keep your phone on; the delivery team calls before arrival.',
    'Regions outside Dar es Salaam take 2–4 days.',
  ],
  Other: ['Describe the problem with as much detail as you can.', 'Add a photo if it helps.', 'Include your order number if you have one.'],
};

/** Safe, static quick fixes used when no AI provider is configured. */
export function supportQuickFixes(issue: string): string {
  const t = TIPS[issue] ?? TIPS.Other!;
  return `${t.map((x, i) => `${i + 1}. ${x}`).join('\n')}\nIf it still fails or you smell burning, stop using it. A technician will call you after you send this request.`;
}
