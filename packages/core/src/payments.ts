/** Payment methods in this phase. No mobile money (CLAUDE.md, out of scope). */
export const PAYMENT_METHODS = ['salary_advance', 'azania_account', 'card', 'pay_on_delivery'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_INFO: Record<PaymentMethod, { title: string; sub: string; mono: string; tile: string; azania: boolean }> = {
  salary_advance: { title: 'Salary Advance', sub: 'Azania Bank · monthly', mono: 'AZ', tile: '#0098DA', azania: true },
  azania_account: { title: 'Azania Bank account', sub: 'Direct bank payment', mono: 'AB', tile: '#0078B4', azania: true },
  card: { title: 'Card', sub: 'Visa, Mastercard', mono: 'CD', tile: '#12152B', azania: false },
  pay_on_delivery: { title: 'Pay on delivery', sub: 'Dar es Salaam only', mono: 'PD', tile: '#5E6378', azania: false },
};

export function isPaymentMethod(v: string): v is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(v);
}

/** Pay on delivery is only offered in Dar es Salaam. */
export function paymentAllowed(method: PaymentMethod, region: string): boolean {
  if (method === 'pay_on_delivery') return region === 'Dar es Salaam';
  return true;
}

export function paymentLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_INFO[method].title;
}
