import { describe, expect, it } from 'vitest';
import {
  ADVANCE_STATUS_LABEL,
  answerFromCatalogue,
  assertAdvanceTransition,
  assertOrderTransition,
  assessAffordability,
  buildSchedule,
  bundlePrice,
  canTransitionAdvance,
  canTransitionOrder,
  checkDiscount,
  compareVerdict,
  contractNumber,
  contractTerms,
  deliveryEta,
  deliveryFee,
  firstDeductionDate,
  fmtDate,
  fmtDateTime,
  fmtTZS,
  fmtTZSCompact,
  formatTzPhone,
  groundedPrompt,
  initialOrderStatus,
  isAdvanceStatus,
  isAdvanceTerm,
  isAffordable,
  isOrderStatus,
  isPaymentMethod,
  isRegion,
  isTerminal,
  isTzPhone,
  maskTzPhone,
  monthlyInstalment,
  nextAdvanceStatuses,
  nextOrderStatuses,
  normaliseNida,
  normaliseOrderNumber,
  normalizeTzPhone,
  orderNumber,
  parseAmount,
  paymentAllowed,
  paymentLabel,
  priceCart,
  releasesStock,
  repaymentProgress,
  retrievePolicies,
  retrieveProducts,
  salePrice,
  shortestAffordableTerm,
  signatureMatches,
  SUPPORT_FALLBACK,
  supportQuickFixes,
  tokenize,
  trackingSteps,
  waDigits,
  type ProductFacts,
} from '../src';

describe('money', () => {
  it('formats TZS without decimals', () => {
    expect(fmtTZS(2450000)).toBe('TZS 2,450,000');
    expect(fmtTZS(204166.67)).toBe('TZS 204,167');
    expect(fmtTZS(-1500)).toBe('-TZS 1,500');
    expect(fmtTZS(Number.NaN)).toBe('TZS 0');
  });
  it('formats compact amounts', () => {
    expect(fmtTZSCompact(84_200_000)).toBe('TZS 84.2M');
    expect(fmtTZSCompact(1_500_000_000)).toBe('TZS 1.5B');
    expect(fmtTZSCompact(12_300)).toBe('TZS 12.3K');
    expect(fmtTZSCompact(500)).toBe('TZS 500');
  });
  it('parses amounts', () => {
    expect(parseAmount('TZS 1,500,000')).toBe(1500000);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(12.6)).toBe(13);
    expect(parseAmount(Number.POSITIVE_INFINITY)).toBe(0);
    expect(parseAmount('abc')).toBe(0);
  });
});

describe('phone', () => {
  it('normalises Tanzanian mobile numbers', () => {
    for (const v of ['+255 754 000 214', '0754000214', '754000214', '255754000214', '00255754000214', '+255-754-000-214']) {
      expect(normalizeTzPhone(v)).toBe('+255754000214');
    }
    expect(normalizeTzPhone('0654000214')).toBe('+255654000214');
  });
  it('rejects invalid numbers', () => {
    expect(normalizeTzPhone('')).toBeNull();
    expect(normalizeTzPhone(undefined)).toBeNull();
    expect(normalizeTzPhone('+254712345678')).toBeNull();
    expect(normalizeTzPhone('0254000214')).toBeNull();
    expect(isTzPhone('12345')).toBe(false);
    expect(isTzPhone('0754000214')).toBe(true);
  });
  it('formats and masks', () => {
    expect(formatTzPhone('0754000214')).toBe('+255 754 000 214');
    expect(formatTzPhone('bad')).toBe('bad');
    expect(formatTzPhone(null)).toBe('');
    expect(maskTzPhone('0754000214')).toBe('+255 754 ••• 214');
    expect(maskTzPhone('bad')).toBe('•••');
    expect(waDigits('+255 700 000 101')).toBe('255700000101');
  });
});

describe('instalments', () => {
  it('validates terms', () => {
    expect(isAdvanceTerm(3)).toBe(true);
    expect(isAdvanceTerm(12)).toBe(true);
    expect(isAdvanceTerm(9)).toBe(false);
  });
  it('computes monthly instalments', () => {
    expect(monthlyInstalment(2450000, 12)).toBe(204167);
    expect(() => monthlyInstalment(100, 0)).toThrow();
  });
  it('builds a schedule that sums exactly to the total', () => {
    const s = buildSchedule(2450000, 12, new Date(Date.UTC(2026, 9, 7)));
    expect(s).toHaveLength(12);
    expect(s.reduce((a, x) => a + x.amount, 0)).toBe(2450000);
    expect(s[0]!.dueDate.toISOString().slice(0, 10)).toBe('2026-11-25');
    expect(s[11]!.dueDate.toISOString().slice(0, 10)).toBe('2027-10-25');
    expect(s[11]!.amount).toBe(2450000 - 204167 * 11);
  });
  it('first deduction rolls over the year', () => {
    expect(firstDeductionDate(new Date(Date.UTC(2026, 11, 30))).toISOString().slice(0, 10)).toBe('2027-01-25');
  });
  it('formats dates', () => {
    expect(fmtDate(new Date(Date.UTC(2026, 10, 25, 9)))).toBe('25 Nov 2026');
    expect(fmtDateTime(new Date(Date.UTC(2026, 10, 25, 9)))).toContain('25 Nov');
  });
  it('tracks repayment progress', () => {
    const s = buildSchedule(900, 3, new Date(Date.UTC(2026, 0, 1))).map((x, i) => ({ ...x, paid: i === 0 }));
    const p = repaymentProgress(s);
    expect(p).toMatchObject({ paid: 300, remaining: 600, percent: 33 });
    expect(p.nextDue?.n).toBe(2);
    expect(repaymentProgress([]).percent).toBe(0);
    expect(repaymentProgress([]).nextDue).toBeNull();
  });
});

describe('affordability', () => {
  it('flags instalments above one third of net salary', () => {
    expect(assessAffordability(400_000, 1_500_000).status).toBe('within');
    expect(assessAffordability(500_000, 1_500_000).status).toBe('within');
    expect(assessAffordability(500_001, 1_500_000).status).toBe('above');
    expect(isAffordable(600_000, 1_500_000)).toBe(false);
  });
  it('handles missing salary', () => {
    expect(assessAffordability(100, 0)).toMatchObject({ status: 'unknown', meter: 0 });
  });
  it('reports percent and meter', () => {
    const a = assessAffordability(250_000, 1_000_000);
    expect(a.percent).toBe(25);
    expect(a.meter).toBe(75);
    expect(a.maxInstalment).toBe(333_333);
    expect(assessAffordability(900_000, 1_000_000).meter).toBe(100);
  });
  it('finds the shortest affordable term', () => {
    expect(shortestAffordableTerm(2_450_000, 1_000_000)).toBe(12);
    expect(shortestAffordableTerm(900_000, 1_000_000)).toBe(3);
    expect(shortestAffordableTerm(9_000_000, 300_000)).toBeNull();
  });
});

describe('delivery and pricing', () => {
  it('charges region fees with free Dar delivery over 500k', () => {
    expect(deliveryFee('Dar es Salaam', 499_999)).toBe(15000);
    expect(deliveryFee('Dar es Salaam', 500_000)).toBe(0);
    expect(deliveryFee('Zanzibar', 5_000_000)).toBe(40000);
    expect(() => deliveryFee('Nairobi', 1)).toThrow();
    expect(isRegion('Arusha')).toBe(true);
    expect(isRegion('Nairobi')).toBe(false);
    expect(deliveryEta('Dar es Salaam')).toBe('tomorrow');
    expect(deliveryEta('Nowhere')).toBe('2–4 days');
  });
  it('prices a cart', () => {
    expect(priceCart([{ price: 260000, qty: 1 }], 'Arusha')).toEqual({ subtotal: 260000, discount: 0, delivery: 35000, total: 295000, count: 1 });
    expect(priceCart([{ price: 300000, qty: 2 }], 'Dar es Salaam', 50000)).toEqual({ subtotal: 600000, discount: 50000, delivery: 0, total: 550000, count: 2 });
    expect(priceCart([], 'Dar es Salaam').total).toBe(0);
  });
  it('prices bundles and sales', () => {
    expect(bundlePrice([1150000, 780000], 12)).toEqual({ was: 1930000, now: 1698400, saving: 231600 });
    expect(salePrice(1000, 15)).toBe(850);
  });
  it('checks discount codes', () => {
    const now = new Date('2026-10-01');
    const rule = { code: 'KARIBU10', percent: 10, active: true, brand: 'mruk', expiresAt: new Date('2026-12-31'), minSubtotal: 100000, maxUses: 5, uses: 1 };
    expect(checkDiscount(rule, 1_000_000, 'mruk', now)).toEqual({ ok: true, amount: 100000 });
    expect(checkDiscount(null, 1, 'mruk')).toMatchObject({ ok: false });
    expect(checkDiscount({ ...rule, active: false }, 1_000_000, 'mruk', now)).toMatchObject({ ok: false, reason: 'Code is not active' });
    expect(checkDiscount(rule, 1_000_000, 'skywood', now)).toMatchObject({ ok: false });
    expect(checkDiscount(rule, 1_000_000, 'mruk', new Date('2027-01-02'))).toMatchObject({ ok: false, reason: 'Code has expired' });
    expect(checkDiscount(rule, 50_000, 'mruk', now)).toMatchObject({ ok: false });
    expect(checkDiscount({ ...rule, uses: 5 }, 1_000_000, 'mruk', now)).toMatchObject({ ok: false });
    expect(checkDiscount({ code: 'X', percent: 200, active: true }, 1000, 'mruk')).toEqual({ ok: true, amount: 900 });
  });
});

describe('payments', () => {
  it('knows the four methods and no mobile money', () => {
    expect(isPaymentMethod('salary_advance')).toBe(true);
    expect(isPaymentMethod('mpesa')).toBe(false);
    expect(paymentLabel('azania_account')).toBe('Azania Bank account');
  });
  it('limits pay on delivery to Dar es Salaam', () => {
    expect(paymentAllowed('pay_on_delivery', 'Dar es Salaam')).toBe(true);
    expect(paymentAllowed('pay_on_delivery', 'Arusha')).toBe(false);
    expect(paymentAllowed('card', 'Arusha')).toBe(true);
  });
});

describe('order state machine', () => {
  it('allows the happy path', () => {
    const path = ['placed', 'bank_review', 'approved', 'packed', 'out_for_delivery', 'delivered'] as const;
    for (let i = 0; i < path.length - 1; i++) expect(canTransitionOrder(path[i]!, path[i + 1]!)).toBe(true);
  });
  it('blocks invalid moves', () => {
    expect(canTransitionOrder('delivered', 'cancelled')).toBe(false);
    expect(canTransitionOrder('out_for_delivery', 'cancelled')).toBe(false);
    expect(() => assertOrderTransition('placed', 'delivered')).toThrow();
    expect(() => assertOrderTransition('placed', 'cancelled')).not.toThrow();
  });
  it('exposes helpers', () => {
    expect(nextOrderStatuses('bank_review')).toEqual(['approved', 'rejected', 'cancelled']);
    expect(isOrderStatus('packed')).toBe(true);
    expect(isOrderStatus('lost')).toBe(false);
    expect(releasesStock('rejected')).toBe(true);
    expect(releasesStock('delivered')).toBe(false);
    expect(isTerminal('delivered')).toBe(true);
    expect(isTerminal('approved')).toBe(false);
  });
  it('picks the initial status by payment method', () => {
    expect(initialOrderStatus('salary_advance', false)).toBe('bank_review');
    expect(initialOrderStatus('pay_on_delivery', false)).toBe('approved');
    expect(initialOrderStatus('card', true)).toBe('approved');
    expect(initialOrderStatus('azania_account', false)).toBe('placed');
  });
  it('builds tracking steps', () => {
    expect(trackingSteps('bank_review', 'salary_advance').map((s) => s.state)).toEqual(['done', 'current', 'pending', 'pending', 'pending']);
    expect(trackingSteps('bank_review', 'salary_advance')[1]!.title).toBe('Azania Bank approval');
    expect(trackingSteps('approved', 'card')[1]!.title).toBe('Payment confirmed');
    expect(trackingSteps('out_for_delivery', 'card').map((s) => s.state)).toEqual(['done', 'done', 'done', 'current', 'pending']);
    expect(trackingSteps('packed', 'card').map((s) => s.state)).toEqual(['done', 'done', 'done', 'pending', 'pending']);
    expect(trackingSteps('delivered', 'card').every((s) => s.state === 'done')).toBe(true);
    expect(trackingSteps('cancelled', 'card').map((s) => s.state)).toEqual(['done', 'pending', 'pending', 'pending', 'pending']);
  });
  it('formats order numbers', () => {
    expect(orderNumber('mruk', 10483)).toBe('MU-10483');
    expect(orderNumber('skywood', 20391)).toBe('SW-20391');
    expect(normaliseOrderNumber(' mu-10483 ')).toBe('MU-10483');
  });
});

describe('salary advance', () => {
  it('follows the advance state machine', () => {
    expect(canTransitionAdvance('submitted', 'approved')).toBe(true);
    expect(canTransitionAdvance('submitted', 'disbursed')).toBe(false);
    expect(canTransitionAdvance('repaying', 'closed')).toBe(true);
    expect(nextAdvanceStatuses('approved')).toEqual(['disbursed']);
    expect(() => assertAdvanceTransition('rejected', 'approved')).toThrow();
    expect(() => assertAdvanceTransition('draft', 'submitted')).not.toThrow();
    expect(isAdvanceStatus('repaying')).toBe(true);
    expect(isAdvanceStatus('nope')).toBe(false);
    expect(ADVANCE_STATUS_LABEL.submitted).toBe('In review');
  });
  it('formats contract numbers and NIDA', () => {
    expect(contractNumber(48213)).toBe('AZB-SA-48213');
    expect(normaliseNida('19900101123450000123')).toBe('19900101-12345-00001-23');
    expect(normaliseNida('19900101-12345-00001-23')).toBe('19900101-12345-00001-23');
    expect(normaliseNida('123')).toBeNull();
  });
  it('produces 8 key terms', () => {
    const t = contractTerms(12, 'TZS 204,167', '25 Nov 2026');
    expect(t).toHaveLength(8);
    expect(t[1]).toContain('12 equal monthly instalments of TZS 204,167');
  });
  it('checks typed signatures', () => {
    expect(signatureMatches('Neema Mushi', 'Neema Mushi')).toBe(true);
    expect(signatureMatches('neema', 'Neema Mushi')).toBe(true);
    expect(signatureMatches('abc', 'Neema Mushi')).toBe(false);
    expect(signatureMatches('John Doe', 'Neema Mushi')).toBe(false);
    expect(signatureMatches('Anyone', '')).toBe(true);
  });
});

const P = (model: string, name: string, price: number, stock: number, features: string[], sub = 'Fridges'): ProductFacts => ({
  id: model.toLowerCase(),
  brand: 'mruk',
  model,
  name,
  category: 'Refrigerators and Freezers',
  sub,
  price,
  stock,
  features,
});
const fridges = [
  P('UK F275', 'French Style Refrigerator', 2450000, 14, ['French style', 'Energy saving', 'Multi-door']),
  P('UK59', 'Double Door Refrigerator', 860000, 18, ['Double door', 'Energy saving']),
  P('UK F47', 'Single Door Refrigerator', 540000, 3, ['Single door']),
];

describe('catalogue AI', () => {
  it('tokenises without stop words', () => {
    expect(tokenize('Which is the best for a family of 6?')).toEqual(['family']);
  });
  it('retrieves products by keywords and synonyms', () => {
    expect(retrieveProducts('energy saving fridge', fridges)[0]!.model).toMatch(/UK/);
    expect(retrieveProducts('uk59', fridges)[0]!.model).toBe('UK59');
    expect(retrieveProducts('the', fridges)).toEqual([]);
    expect(retrieveProducts('power', fridges).length).toBe(2);
  });
  it('retrieves policies', () => {
    const pol = [{ id: 'returns', topic: 'returns', text: 'Unused products can be returned within 7 days.' }];
    expect(retrievePolicies('generator noise', pol)).toHaveLength(0);
    expect(retrievePolicies('returns policy', pol)).toHaveLength(1);
  });
  it('builds a deterministic verdict', () => {
    const v = compareVerdict(fridges);
    expect(v.bestOverall.model).toBe('UK F275');
    expect(v.bestValue.model).toBe('UK F47');
    expect(v.text).toContain('Low stock: UK F47 (3 left)');
    expect(() => compareVerdict([])).toThrow();
  });
  it('answers value, monthly, stock and feature questions from data', () => {
    expect(answerFromCatalogue('Which is best value?', fridges).text).toContain('Best value: Single Door Refrigerator');
    expect(answerFromCatalogue('What is the monthly cost?', fridges, 6).text).toContain('over 6 months');
    expect(answerFromCatalogue('Is it in stock?', fridges).text).toContain('only 3 left');
    const power = answerFromCatalogue('Which uses less power?', fridges);
    expect(power.grounded).toBe(true);
    expect(power.text).toContain('energy saving');
    expect(power.text).toContain("UK F47 doesn't list this");
    expect(answerFromCatalogue('Best for a small shop?', fridges).text).toContain('larger-capacity');
  });
  it('refuses when the data cannot answer', () => {
    const a = answerFromCatalogue('What colour is the warranty card?', fridges);
    expect(a.grounded).toBe(false);
    expect(a.text).toBe(SUPPORT_FALLBACK);
    expect(answerFromCatalogue('', fridges).grounded).toBe(false);
    expect(answerFromCatalogue('anything', []).grounded).toBe(false);
    expect(answerFromCatalogue('Is it good for a family?', [P('X1', 'Kettle', 1, 1, ['Auto shut off'], 'Kettles')]).grounded).toBe(false);
  });
  it('falls back to policy facts', () => {
    const pol = [{ id: 'delivery', topic: 'delivery', text: 'Dar es Salaam next day; other regions 2–4 days.' }];
    expect(answerFromCatalogue('delivery time to Mwanza', fridges, 12, pol)).toMatchObject({ grounded: true, sources: ['delivery'] });
  });
  it('builds a grounded prompt containing only supplied facts', () => {
    const p = groundedPrompt('Compare', { products: fridges });
    expect(p).toContain('Use ONLY');
    expect(p).toContain('UK F275');
    expect(p).toContain(SUPPORT_FALLBACK);
    expect(groundedPrompt('x', {})).toContain('CATALOGUE: []');
  });
  it('gives safe quick fixes', () => {
    expect(supportQuickFixes('Repair')).toContain('1. Check the power');
    expect(supportQuickFixes('Unknown')).toContain('order number');
  });
});
