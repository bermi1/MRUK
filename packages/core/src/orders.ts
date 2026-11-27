import { staffConfirmed, type PaymentMethod } from './payments';

/**
 * placed (New: Order desk calls the customer) → confirmed (invoice sent; Finance checks the payment)
 * → approved (cleared for dispatch: Storekeeper) → [packed] → out_for_delivery → delivered (+ cancelled, rejected).
 * Pay Later orders go placed → bank_review → approved. Card / Azania account orders paid online start at approved.
 */
export const ORDER_STATUSES = ['placed', 'confirmed', 'bank_review', 'approved', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['confirmed', 'bank_review', 'approved', 'cancelled'],
  // Finance: paid or cleared → approved; not paid → back to the Order desk (placed) to follow up.
  confirmed: ['approved', 'placed', 'cancelled'],
  bank_review: ['approved', 'rejected', 'cancelled'],
  approved: ['packed', 'out_for_delivery', 'cancelled'],
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
  placed: 'Order received',
  confirmed: 'Confirmed, awaiting payment',
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
  // Pay on delivery / pay before delivery: the Order desk calls and confirms first.
  if (method === 'pay_on_delivery' || method === 'pay_before_delivery') return 'placed';
  return paymentCaptured ? 'approved' : 'placed';
}

export interface TrackingStep {
  title: string;
  state: 'done' | 'current' | 'pending';
}

/**
 * Customer-facing step names, shared by tracking, the account stepper and the confirmation page
 * (the web app translates each key; TRACK_STEP_TITLE is the English source).
 */
export type TrackStepKey = 'received' | 'confirmedByPhone' | 'paymentConfirmed' | 'bankApproval' | 'readyForDispatch' | 'packed' | 'outForDelivery' | 'delivered';

export const TRACK_STEP_TITLE: Record<TrackStepKey, string> = {
  received: 'Order received',
  confirmedByPhone: 'Confirmed by phone',
  paymentConfirmed: 'Payment confirmed',
  bankApproval: 'Azania Bank approval',
  readyForDispatch: 'Ready for dispatch',
  packed: 'Packed',
  outForDelivery: 'Out for delivery',
  delivered: 'Delivered',
};

const byPhone = (method: PaymentMethod) => method === 'pay_on_delivery' || method === 'pay_before_delivery';

/** The five step names for an order paid this way (same order as trackingSteps / orderStepper). */
export function trackingStepKeys(method: PaymentMethod): TrackStepKey[] {
  // Orders confirmed by phone: received → confirmed (invoice) → cleared → out for delivery → delivered.
  if (byPhone(method)) return ['received', 'confirmedByPhone', method === 'pay_on_delivery' ? 'readyForDispatch' : 'paymentConfirmed', 'outForDelivery', 'delivered'];
  return ['received', method === 'salary_advance' ? 'bankApproval' : 'paymentConfirmed', 'packed', 'outForDelivery', 'delivered'];
}

export function trackingSteps(status: OrderStatus, method: PaymentMethod): TrackingStep[] {
  const titles = trackingStepKeys(method).map((k) => TRACK_STEP_TITLE[k]);
  // Pay on delivery is confirmed without a payment: the customer pays when the order arrives.
  if (byPhone(method)) {
    const p2: Record<OrderStatus, [number, number]> = { placed: [1, 1], confirmed: [2, 2], bank_review: [1, 1], approved: [3, -1], packed: [3, -1], out_for_delivery: [3, 3], delivered: [5, -1], cancelled: [1, -1], rejected: [1, -1] };
    const [d2, c2] = p2[status];
    return titles.map((title, i) => ({ title, state: i < d2 ? 'done' : i === c2 ? 'current' : 'pending' }));
  }
  // How many steps are complete, and which step is in progress (-1 = none).
  const progress: Record<OrderStatus, [done: number, current: number]> = {
    placed: [1, 1],
    confirmed: [1, 1],
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

/** Customer dashboard stepper: placed → paid/approved → packed → out for delivery → delivered. */
export const STEPPER_KEYS = ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered'] as const;
export type StepperKey = (typeof STEPPER_KEYS)[number];

export interface StepperStep {
  key: StepperKey;
  /** Customer-facing step name (same as tracking). */
  label: TrackStepKey;
  state: 'done' | 'current' | 'pending';
  /** When the order reached this step (first matching OrderEvent), or null when not recorded. */
  at: Date | null;
}

const STEP_OF_STATUS: Partial<Record<OrderStatus, number>> = { placed: 0, confirmed: 1, approved: 1, packed: 2, out_for_delivery: 3, delivered: 4 };

/**
 * Stepper state from the order status, with each step dated from the order's events.
 * Steps without an event of their own keep `at: null` (we never invent a timestamp).
 * Closed orders (cancelled / rejected) return null: the caller shows a "closed" note instead.
 */
export function orderStepper(status: OrderStatus, method: PaymentMethod, events: { status: string; at: Date }[]): StepperStep[] | null {
  if (status === 'cancelled' || status === 'rejected') return null;
  const states = trackingSteps(status, method).map((s) => s.state);
  const labels = trackingStepKeys(method);
  const at: (Date | null)[] = STEPPER_KEYS.map(() => null);
  for (const e of [...events].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    const i = isOrderStatus(e.status) ? STEP_OF_STATUS[e.status] : undefined;
    if (i !== undefined && !at[i]) at[i] = e.at;
  }
  return STEPPER_KEYS.map((key, i) => ({ key, label: labels[i]!, state: states[i]!, at: states[i] === 'pending' ? null : (at[i] ?? null) }));
}

/** Orders still moving (the dashboard's "Active" filter). */
export function isActiveOrder(status: string): boolean {
  return isOrderStatus(status) && !isTerminal(status);
}

/**
 * Who may move an order between two statuses (permission names, see packages/core/src/roles.ts):
 * the Order desk confirms or cancels new orders, Finance approves payment or sends it back,
 * the Storekeeper dispatches and marks delivered. Pay Later bank decisions are taken on their own page.
 */
export function transitionPermission(from: OrderStatus, to: OrderStatus): string {
  if (from === 'placed' && (to === 'confirmed' || to === 'cancelled')) return 'orders.confirm';
  if (from === 'confirmed' && to === 'cancelled') return 'orders.confirm';
  if ((from === 'confirmed' || from === 'placed') && (to === 'approved' || to === 'placed')) return 'payments.approve';
  if (from === 'bank_review' || to === 'bank_review') return 'advance.write';
  return 'orders.dispatch';
}

/** Status words for the customer: an online payment not made yet reads "Awaiting payment"; a phone order "Order received". */
export function customerStatusLabel(status: OrderStatus, method: string): string {
  if (status === 'placed' && !staffConfirmed(method)) return 'Awaiting payment';
  return ORDER_STATUS_LABEL[status];
}
