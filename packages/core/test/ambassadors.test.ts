import { describe, expect, it } from 'vitest';
import { ambassadorTotals, commissionFor, normaliseCode, suggestAmbassadorCode } from '../src/index';

describe('ambassadors', () => {
  it('suggests a readable personal code', () => {
    expect(suggestAmbassadorCode('Neema Mushi', 10)).toBe('NEEMA10');
    expect(suggestAmbassadorCode('  joséphine  ', 7)).toBe('JOSEPHINE07');
    expect(suggestAmbassadorCode('', 3)).toBe('AMB03');
  });
  it('accepts only 4–20 letters and digits', () => {
    expect(normaliseCode(' neema10 ')).toBe('NEEMA10');
    expect(normaliseCode('ab')).toBeNull();
    expect(normaliseCode('NEEMA-10')).toBeNull();
  });
  it('pays commission on the net sale, delivery excluded', () => {
    expect(commissionFor({ subtotal: 1_000_000, discount: 50_000 }, 3)).toBe(28_500);
  });
  it('earns on delivered orders, shows in-progress as pending, ignores cancelled, subtracts payouts', () => {
    const t = ambassadorTotals(
      [
        { status: 'delivered', subtotal: 1_000_000, discount: 50_000 },
        { status: 'confirmed', subtotal: 200_000, discount: 10_000 },
        { status: 'cancelled', subtotal: 900_000, discount: 45_000 },
      ],
      3,
      10_000,
    );
    expect(t).toEqual({ orders: 2, sales: 950_000, earned: 28_500, pending: 5_700, paid: 10_000, owed: 18_500 });
  });
});
