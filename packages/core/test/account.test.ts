import { describe, expect, it } from 'vitest';
import { isActiveOrder, orderStepper, STEPPER_KEYS } from '../src/index';

const T = (h: number) => new Date(Date.UTC(2026, 9, 1, h));

describe('orderStepper', () => {
  it('dates each reached step from the first matching event', () => {
    const s = orderStepper('out_for_delivery', 'card', [
      { status: 'out_for_delivery', at: T(9) },
      { status: 'placed', at: T(1) },
      { status: 'approved', at: T(2) },
      { status: 'packed', at: T(5) },
      { status: 'packed', at: T(6) },
    ])!;
    expect(s.map((x) => x.key)).toEqual([...STEPPER_KEYS]);
    expect(s.map((x) => x.state)).toEqual(['done', 'done', 'done', 'current', 'pending']);
    expect(s[0]!.at).toEqual(T(1));
    expect(s[2]!.at).toEqual(T(5));
    expect(s[3]!.at).toEqual(T(9));
    expect(s[4]!.at).toBeNull();
  });

  it('keeps a Salary Advance order on step 1 while the bank reviews it', () => {
    const s = orderStepper('bank_review', 'salary_advance', [
      { status: 'placed', at: T(1) },
      { status: 'bank_review', at: T(1) },
    ])!;
    expect(s.map((x) => x.state)).toEqual(['done', 'current', 'pending', 'pending', 'pending']);
    expect(s[1]!.at).toBeNull();
  });

  it('never invents a date for a step that has no event', () => {
    const s = orderStepper('delivered', 'card', [
      { status: 'placed', at: T(1) },
      { status: 'delivered', at: T(30) },
    ])!;
    expect(s.every((x) => x.state === 'done')).toBe(true);
    expect(s.map((x) => x.at)).toEqual([T(1), null, null, null, T(30)]);
  });

  it('ignores unknown statuses and returns null for closed orders', () => {
    expect(orderStepper('approved', 'card', [{ status: 'refunded', at: T(1) }])!.every((x) => x.at === null)).toBe(true);
    expect(orderStepper('cancelled', 'card', [])).toBeNull();
    expect(orderStepper('rejected', 'salary_advance', [])).toBeNull();
  });
});

describe('isActiveOrder', () => {
  it('is true until an order is delivered or closed', () => {
    expect(['placed', 'bank_review', 'approved', 'packed', 'out_for_delivery'].every(isActiveOrder)).toBe(true);
    expect(['delivered', 'cancelled', 'rejected', 'nonsense'].some(isActiveOrder)).toBe(false);
  });
});
