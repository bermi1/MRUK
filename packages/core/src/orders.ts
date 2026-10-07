import type { PaymentMethod } from './payments';

/** README: placed → bank_review → approved → packed → out_for_delivery → delivered (+ cancelled, rejected). */
export const ORDER_STATUSES = ['placed', 'bank_review', 'approved', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['bank_review', 'approved', 'cancelled'],
  bank_review: ['approved', 'rejected', 'cancelled'],
  approved: ['packed', 'cancelled'],
  packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
  rejected: [],
};

export function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(v);
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function nextOrderStatuses(from: OrderStatus): OrderStatus[] {
  return [...ORDER_TRANSITIONS[from]];
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) throw new Error(`Order cannot move from ${from} to ${to}`);
}

/** Statuses after which reserved stock must be returned to the shelf. */
export function releasesStock(status: OrderStatus): boolean {
  return status === 'cancelled' || status === 'rejected';
}

export function isTerminal(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Awaiting payment',
  bank_review: 'Bank review',
  approved: 'Processing',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

/** Status an order starts in after checkout, by payment method. */
export function initialOrderStatus(method: PaymentMethod, paymentCaptured: boolean): OrderStatus {
  if (method === 'salary_advance') return 'bank_review';
  if (method === 'pay_on_delivery') return 'approved';
  return paymentCaptured ? 'approved' : 'placed';
}

export interface TrackingStep {
  title: string;
  state: 'done' | 'current' | 'pending';
}

export function trackingSteps(status: OrderStatus, method: PaymentMethod): TrackingStep[] {
  const titles = ['Order placed', method === 'salary_advance' ? 'Azania Bank approval' : 'Payment confirmed', 'Packed at warehouse', 'Out for delivery', 'Delivered'];
  // How many steps are complete, and which step is in progress (-1 = none).
  const progress: Record<OrderStatus, [done: number, current: number]> = {
    placed: [1, 1],
    bank_review: [1, 1],
    approved: [2, 2],
    packed: [3, -1],
    out_for_delivery: [3, 3],
    delivered: [5, -1],
    cancelled: [1, -1],
    rejected: [1, -1],
  };
  const [done, current] = progress[status];
  return titles.map((title, i) => ({
    title,
    state: i < done ? 'done' : i === current ? 'current' : 'pending',
  }));
}

/** Order number prefix per brand: MU-10483, SW-20391. */
export function orderNumber(brand: string, seq: number): string {
  return `${brand === 'skywood' ? 'SW' : 'MU'}-${seq}`;
}

export function normaliseOrderNumber(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}
