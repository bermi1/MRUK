import { describe, expect, it } from 'vitest';
import {
  answerFromCatalogue,
  checkoutMethods,
  compareVerdict,
  mentionsPayLater,
  miniAppOpen,
  stripPayLater,
  PAY_LATER_DEFAULT,
  PAY_LATER_KEYS,
  parsePayLater,
  payLaterKey,
  payLaterStates,
  payLaterValue,
  type ProductFacts,
} from '../src';

const items: ProductFacts[] = [
  { id: 'a', brand: 'skywood', model: 'S 06', name: 'Speaker system', category: 'Music', sub: 'Speaker', price: 1_200_000, stock: 9, features: ['Bluetooth', 'Deep bass'] },
  { id: 'b', brand: 'skywood', model: 'S 02', name: 'Mini speaker', category: 'Music', sub: 'Speaker', price: 300_000, stock: 2, features: ['Bluetooth'] },
];

describe('Pay Later switch', () => {
  it('is off by default and for anything but an explicit true', () => {
    expect(PAY_LATER_DEFAULT).toBe(false);
    for (const v of [undefined, null, 'true', 1, [], {}, { enabled: 'yes' }]) expect(parsePayLater(v).enabled).toBe(false);
    expect(parsePayLater({ enabled: true }).enabled).toBe(true);
  });

  it('keeps who changed it and when, dropping bad values', () => {
    const at = new Date('2026-11-01T08:00:00Z');
    const v = payLaterValue(true, 'amani@mruk.co.tz', at);
    expect(parsePayLater(v)).toEqual({ enabled: true, updatedBy: 'amani@mruk.co.tz', at: at.toISOString() });
    expect(parsePayLater({ enabled: false, updatedBy: 5, at: 'not a date' })).toEqual({ enabled: false, updatedBy: '', at: '' });
  });

  it('reads both brands from Setting rows, missing rows are off', () => {
    expect(PAY_LATER_KEYS).toEqual(['payLater.mruk', 'payLater.skywood']);
    const s = payLaterStates([{ key: payLaterKey('mruk'), value: { enabled: true } }, { key: 'other', value: { enabled: true } }]);
    expect(s.mruk.enabled).toBe(true);
    expect(s.skywood.enabled).toBe(false);
  });

  it('offers Salary Advance at checkout only when on', () => {
    expect(checkoutMethods(true)).toContain('salary_advance');
    expect(checkoutMethods(false)).not.toContain('salary_advance');
    expect(checkoutMethods(false)).toEqual(['azania_account', 'card', 'pay_on_delivery']);
  });

  it('opens the Azania mini app while either brand has Pay Later', () => {
    expect(miniAppOpen({ mruk: { enabled: false }, skywood: { enabled: false } })).toBe(false);
    expect(miniAppOpen({ mruk: { enabled: false }, skywood: { enabled: true } })).toBe(true);
  });
});

describe('CMS copy while Pay Later is off', () => {
  it('finds Pay Later promises in English and Kiswahili', () => {
    for (const s of ['Pay monthly with Pay Later by Azania Bank', 'Lipa Baadaye kupitia Azania Bank', 'Take it home today, pay from your salary', 'TZS 20,000/mo']) expect(mentionsPayLater(s)).toBe(true);
    expect(mentionsPayLater('Up to 15% off generators this month')).toBe(false);
  });

  it('drops only the sentences that mention it', () => {
    expect(stripPayLater('Refrigerators, TVs and generators. Pay monthly with Pay Later by Azania Bank.')).toBe('Refrigerators, TVs and generators.');
    expect(stripPayLater('Take it home today, pay from your salary with Pay Later by Azania Bank')).toBe('');
    expect(stripPayLater('Beyond limits.')).toBe('Beyond limits.');
  });
});

describe('catalogue AI with Pay Later off', () => {
  const noPayLater = (s: string) => expect(s).not.toMatch(/\/mo|month|pay later|salary|instal|azania/i);

  it('verdict leaves out monthly prices', () => {
    expect(compareVerdict(items, 12).text).toMatch(/\/mo over 12 months/);
    noPayLater(compareVerdict(items, 12, false).text);
  });

  it('monthly and Pay Later questions get full prices only', () => {
    for (const q of ['What is the monthly price?', 'Can I pay later with Azania?', 'Instalments over 6 months?']) {
      const a = answerFromCatalogue(q, items, 6, [], false);
      expect(a.grounded).toBe(true);
      noPayLater(a.text);
      expect(a.text).toContain('TZS 300,000');
    }
  });

  it('value answers keep the price but not the monthly line', () => {
    expect(answerFromCatalogue('Which is best value?', items, 12).text).toMatch(/Pay Later/);
    const a = answerFromCatalogue('Which is best value?', items, 12, [], false);
    noPayLater(a.text);
    expect(a.text).toMatch(/Best value: Mini speaker/);
  });
});
