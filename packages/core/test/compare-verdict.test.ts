import { describe, expect, it } from 'vitest';
import { buildVerdict, parseVerdict, sameCategory, verdictPrompt, verdictText, type CompareFacts } from '../src';

const F = (model: string, name: string, price: number, features: string[], extra: Partial<CompareFacts> = {}): CompareFacts => ({
  id: model.toLowerCase(),
  brand: 'mruk',
  model,
  name,
  category: 'Refrigerators and Freezers',
  sub: 'Fridges',
  price,
  stock: 12,
  features,
  rating: 4.5,
  reviews: 100,
  ...extra,
});

const big = F('UK F275', 'French Style Refrigerator', 2_450_000, ['French style', 'Energy saving', 'Multi-door', 'Water dispenser'], { rating: 4.9, reviews: 220 });
const mid = F('UK59', 'Double Door Refrigerator', 860_000, ['Double door', 'Energy saving'], { stock: 3 });
const small = F('UK F47', 'Single Door Refrigerator', 540_000, ['Single door']);

describe('compare verdict', () => {
  it('enforces one category', () => {
    expect(sameCategory([big, mid])).toBe(true);
    expect(sameCategory([big, { ...small, category: 'Generators' }])).toBe(false);
    expect(sameCategory([])).toBe(true);
  });

  it('recommends, values and lists pros/cons only from listed features (EN)', () => {
    const v = buildVerdict([big, mid, small], { lang: 'en' });
    expect(v.pick).toBe('UK F275');
    expect(v.recommendation).toBe('Choose French Style Refrigerator for the most listed features (4). Choose Single Door Refrigerator to save TZS 1,910,000.');
    expect(v.value).toContain('Best value: Single Door Refrigerator at TZS 540,000.');
    expect(v.value).toContain('Double Door Refrigerator costs TZS 320,000 more and adds: Double door, Energy saving.');
    expect(v.value).not.toMatch(/month/i);
    const bigV = v.products.find((p) => p.model === 'UK F275')!;
    expect(bigV.pros.join(' ')).toContain('Only one here with: French style, Multi-door, Water dispenser');
    expect(bigV.pros.join(' ')).toContain('Best rated (4.9★, 220 reviews)');
    expect(bigV.cons).toContain('Highest price');
    expect(v.products.find((p) => p.model === 'UK59')!.cons).toContain('Only 3 left');
    expect(v.products.find((p) => p.model === 'UK F47')!.cons.join(' ')).toContain('Does not list: French style');
    // Needs come from features that are actually listed, and tell the products apart.
    expect(v.needs.find((n) => n.need === 'cold water on tap')).toEqual({ need: 'cold water on tap', model: 'UK F275', because: 'lists “Water dispenser”' });
    expect(v.needs.find((n) => n.need === 'small spaces')?.model).toBe('UK F47');
    expect(v.needs.some((n) => /quiet|music/.test(n.need))).toBe(false);
    expect(v.notSpecified).toMatch(/not specified/);
    // Never a word about a feature nobody listed.
    expect(verdictText(v)).not.toMatch(/no-frost|inverter|litre|quiet/i);
  });

  it('speaks natural Kiswahili from the same facts', () => {
    const v = buildVerdict([big, mid], { lang: 'sw', payLater: true, months: 12 });
    expect(v.lang).toBe('sw');
    expect(v.recommendation).toBe('Chagua French Style Refrigerator kwa sifa nyingi zaidi zilizoorodheshwa (4). Chagua Double Door Refrigerator ili uokoe TZS 1,590,000.');
    expect(v.value).toContain('Thamani bora kwa pesa: Double Door Refrigerator kwa TZS 860,000. Kuanzia TZS 71,667 kwa mwezi kwa miezi 12 kupitia Lipa Baadaye.');
    expect(v.needs[0]!.because).toMatch(/^ina “/);
    expect(v.products[0]!.pros.join(' ')).toContain('Ndiyo pekee yenye');
    expect(v.notSpecified).toContain('hakijaelezwa');
  });

  it('handles ties, a single product, deals and products without features', () => {
    const a = F('A1', 'Alpha', 500_000, ['X']);
    const b = F('B1', 'Beta', 400_000, ['Y'], { listPrice: 450_000 });
    expect(buildVerdict([a, b]).recommendation).toBe('They list the same number of features; Beta wins on price.');
    expect(buildVerdict([a, b]).pick).toBe('B1');
    expect(buildVerdict([a, b]).value).toContain('TZS 400,000 (flash deal, was TZS 450,000)');
    expect(buildVerdict([b, a]).recommendation).toContain('Beta');
    const one = buildVerdict([a]);
    expect(one.recommendation).toBe('Best value: Alpha at TZS 500,000.');
    const bare = buildVerdict([a, F('N1', 'Bare', 300_000, [], { stock: 0 })], { lang: 'sw' });
    expect(bare.products[1]!.cons).toEqual(['Sifa hazijaelezwa kwenye katalogi yetu', 'Haijaorodhesha: X', 'Imeisha']);
    expect(() => buildVerdict([])).toThrow();
  });

  it('builds a grounded LLM prompt and rejects LLM output naming unknown products', () => {
    const ref = buildVerdict([big, mid], { lang: 'sw' });
    const p = verdictPrompt([big, mid], ref, { lang: 'sw', months: 12, payLater: false });
    expect(p).toContain('ONLY this catalogue data');
    expect(p).toContain('haijaelezwa');
    expect(p).toContain('Do not mention monthly prices');
    expect(p).toContain('"Water dispenser"');
    const good = JSON.stringify({ ...ref, products: ref.products.map(({ model, pros, cons }) => ({ model, pros, cons })) });
    expect(parseVerdict(good, [big, mid], 'sw')?.pick).toBe(ref.pick);
    expect(parseVerdict('```json\n' + good + '\n```', [big, mid], 'sw')).not.toBeNull();
    expect(parseVerdict(JSON.stringify({ ...ref, pick: 'UK X999' }), [big, mid], 'sw')).toBeNull();
    expect(parseVerdict('not json', [big, mid], 'en')).toBeNull();
    expect(parseVerdict(null, [big, mid], 'en')).toBeNull();
  });
});
