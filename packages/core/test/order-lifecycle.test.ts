import { describe, expect, it } from 'vitest';
import {
  assertOrderTransition,
  canTransitionOrder,
  checkoutMethods,
  defaultCheckoutMethod,
  initialOrderStatus,
  isActiveOrder,
  needsAzania,
  nextOrderStatuses,
  orderStepper,
  paymentAllowed,
  releasesStock,
  trackingSteps,
  type OrderStatus,
} from '../src';

/** The order process without Azania Bank: card (mock gateway) and pay on delivery (Dar es Salaam). */
describe('order lifecycle without Azania', () => {
  it('marks only Salary Advance and the Azania account as Azania methods', () => {
    expect(needsAzania('salary_advance')).toBe(true);
    expect(needsAzania('azania_account')).toBe(true);
    expect(needsAzania('card')).toBe(false);
    expect(needsAzania('pay_on_delivery')).toBe(false);
    expect(checkoutMethods(false).some(needsAzania)).toBe(false);
  });

  it('preselects only a method on offer for the region', () => {
    expect(defaultCheckoutMethod(false, 'Dar es Salaam')).toBe('card');
    expect(defaultCheckoutMethod(false, 'Dar es Salaam', 'salary_advance')).toBe('card');
    expect(defaultCheckoutMethod(false, 'Dar es Salaam', 'azania_account')).toBe('card');
    expect(defaultCheckoutMethod(false, 'Dar es Salaam', 'pay_on_delivery')).toBe('pay_on_delivery');
    expect(defaultCheckoutMethod(false, 'Arusha', 'pay_on_delivery')).toBe('card');
    expect(defaultCheckoutMethod(false, 'Arusha', 'nonsense')).toBe('card');
    // Pay Later on keeps the previous behaviour.
    expect(defaultCheckoutMethod(true, 'Dar es Salaam')).toBe('salary_advance');
    expect(defaultCheckoutMethod(true, 'Mwanza', 'azania_account')).toBe('azania_account');
  });

  it('allows pay on delivery in Dar es Salaam only', () => {
    expect(paymentAllowed('pay_on_delivery', 'Dar es Salaam')).toBe(true);
    for (const r of ['Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Zanzibar', '']) expect(paymentAllowed('pay_on_delivery', r)).toBe(false);
    expect(paymentAllowed('card', 'Zanzibar')).toBe(true);
  });

  it('starts card orders awaiting payment and pay on delivery confirmed', () => {
    expect(initialOrderStatus('card', false)).toBe('placed');
    expect(initialOrderStatus('card', true)).toBe('approved');
    expect(initialOrderStatus('pay_on_delivery', false)).toBe('approved');
  });

  it('walks a card order from payment to delivery, one step at a time', () => {
    const path: OrderStatus[] = ['placed', 'approved', 'packed', 'out_for_delivery', 'delivered'];
    for (let i = 1; i < path.length; i++) expect(() => assertOrderTransition(path[i - 1]!, path[i]!)).not.toThrow();
    // No skipping steps, no going back.
    expect(canTransitionOrder('approved', 'out_for_delivery')).toBe(false);
    expect(canTransitionOrder('approved', 'delivered')).toBe(false);
    expect(canTransitionOrder('packed', 'approved')).toBe(false);
    expect(canTransitionOrder('delivered', 'cancelled')).toBe(false);
    expect(() => assertOrderTransition('delivered', 'packed')).toThrow('Order cannot move from delivered to packed');
  });

  it('cancels before dispatch only, and cancelling returns stock', () => {
    for (const s of ['placed', 'approved', 'packed'] as const) expect(nextOrderStatuses(s)).toContain('cancelled');
    expect(nextOrderStatuses('out_for_delivery')).toEqual(['delivered']);
    expect(releasesStock('cancelled')).toBe(true);
    expect(releasesStock('delivered')).toBe(false);
    expect(isActiveOrder('out_for_delivery')).toBe(true);
    expect(isActiveOrder('delivered')).toBe(false);
    expect(isActiveOrder('cancelled')).toBe(false);
  });

  it('never tells a pay on delivery customer that payment is confirmed', () => {
    expect(trackingSteps('approved', 'pay_on_delivery')[1]).toEqual({ title: 'Order confirmed', state: 'done' });
    expect(trackingSteps('approved', 'card')[1]!.title).toBe('Payment confirmed');
    expect(trackingSteps('packed', 'pay_on_delivery').map((s) => s.state)).toEqual(['done', 'done', 'done', 'pending', 'pending']);
    expect(trackingSteps('delivered', 'pay_on_delivery').every((s) => s.state === 'done')).toBe(true);
  });

  it('dates each stepper step from its event and closes cancelled orders', () => {
    const t0 = new Date('2026-11-01T08:00:00Z');
    const at = (h: number) => new Date(t0.getTime() + h * 3_600_000);
    const events = [
      { status: 'placed', at: at(0) },
      { status: 'approved', at: at(1) },
      { status: 'packed', at: at(3) },
      { status: 'out_for_delivery', at: at(5) },
    ];
    const s = orderStepper('out_for_delivery', 'pay_on_delivery', events)!;
    expect(s.map((x) => x.state)).toEqual(['done', 'done', 'done', 'current', 'pending']);
    expect(s.map((x) => x.at)).toEqual([at(0), at(1), at(3), at(5), null]);
    expect(orderStepper('cancelled', 'card', events)).toBeNull();
  });
});
