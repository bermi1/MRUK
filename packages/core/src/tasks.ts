/**
 * Task routing: "everything that happens on the site goes to the responsible person".
 * Pure rules (no I/O): an event in, the tasks to open and the tasks to close out.
 * The web app stores them (StaffTask) and sends notifications; see apps/web/src/server/tasks.ts.
 *
 * DEFAULTS (not in README / contract Annex, confirm with the client): due times, SLA hours,
 * subscriber milestones and the cool-down before a dismissed stock task re-opens.
 */
import type { OrderStatus } from './orders';
import type { PaymentMethod } from './payments';

export type TaskRole = 'owner' | 'manager' | 'finance' | 'catalogue' | 'warehouse' | 'support';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
/** Matches the notification switches in Settings › Notifications. */
export type TaskCategory = 'orders' | 'bank' | 'stock' | 'tickets' | 'marketing';
export type TaskEntity = 'Order' | 'Ticket' | 'Product' | 'Brand' | 'Campaign';

export const TASK_KINDS = [
  'order.pack',
  'order.dispatch',
  'order.restock',
  'order.contact',
  'advance.review',
  'advance.declined',
  'ticket.respond',
  'ticket.escalate',
  'stock.reorder',
  'stock.review',
  'catalogue.photos',
  'marketing.milestone',
  'marketing.campaign',
] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_KIND_LABEL: Record<TaskKind, string> = {
  'order.pack': 'Pack order',
  'order.dispatch': 'Dispatch order',
  'order.restock': 'Return stock',
  'order.contact': 'Contact customer',
  'advance.review': 'Pay Later review',
  'advance.declined': 'Pay Later declined',
  'ticket.respond': 'Support ticket',
  'ticket.escalate': 'Escalation',
  'stock.reorder': 'Reorder stock',
  'stock.review': 'Low stock listing',
  'catalogue.photos': 'Missing photos',
  'marketing.milestone': 'Subscriber milestone',
  'marketing.campaign': 'Campaign result',
};

export const ROLE_LABEL: Record<TaskRole, string> = { owner: 'Super admin', manager: 'Store manager', finance: 'Finance', catalogue: 'Catalogue', warehouse: 'Warehouse', support: 'Support' };

/** DEFAULT service levels (minutes / hours). */
export const TASK_DEFAULTS = {
  packMinutes: 4 * 60,
  dispatchMinutes: 24 * 60,
  advanceReviewMinutes: 2 * 60,
  contactMinutes: 4 * 60,
  ticketFirstResponseMinutes: 2 * 60,
  ticketNewSlaHours: 2,
  ticketWaitingSlaHours: 24,
  escalationMinutes: 4 * 60,
  reorderMinutes: 2 * 24 * 60,
  /** A stock task that was marked done is not re-opened by the sweep for this long, even if stock is still low. */
  stockCooldownHours: 72,
  photosCooldownHours: 24,
  lowStock: 6,
  reorderStock: 3,
  subscriberMilestones: [10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000],
} as const;

export interface TaskSpec {
  kind: TaskKind;
  category: TaskCategory;
  role: TaskRole;
  brand: string | null;
  title: string;
  detail: string;
  entity: TaskEntity;
  entityId: string;
  href: string;
  priority: TaskPriority;
  /** Minutes from now; null = no due time. */
  dueMinutes: number | null;
  /** One open task per key. */
  key: string;
  /** Assign to the active staff member of the role (in brand scope) with the fewest open tasks. */
  roundRobin?: boolean;
  /** Do not re-open if the same kind of task for the record was done within this many hours. */
  cooldownHours?: number;
}

export interface CloseSpec {
  entity: TaskEntity;
  entityId: string;
  /** Only these kinds; all kinds when omitted. */
  kinds?: TaskKind[];
}

export interface Routing {
  open: TaskSpec[];
  close: CloseSpec[];
}

export type TaskEvent =
  | { type: 'order.placed'; brand: string; number: string; status: OrderStatus; method: PaymentMethod }
  | { type: 'order.paid'; brand: string; number: string; method: PaymentMethod }
  | { type: 'order.status'; brand: string; number: string; from: OrderStatus; to: OrderStatus; reason?: 'expired' }
  | { type: 'advance.submitted'; brand: string; number: string; applicationId: string }
  | { type: 'advance.decided'; brand: string; number: string; applicationId: string; decision: 'approved' | 'rejected' }
  | { type: 'ticket.created'; brand: string; ticketId: string; number: string; issue: string }
  | { type: 'ticket.status'; brand: string; ticketId: string; number: string; status: string }
  | { type: 'ticket.stale'; brand: string; ticketId: string; number: string; status: string; hours: number }
  | { type: 'stock.level'; brand: string; productId: string; model: string; stock: number; hidden?: boolean }
  | { type: 'catalogue.photos'; brand: string; missing: number }
  | { type: 'subscribers.count'; brand: string; before: number; after: number }
  | { type: 'campaign.result'; brand: string; campaignId: string; name: string; ok: boolean; sent?: number; failed?: number };

const BRAND_NAME: Record<string, string> = { mruk: 'Mr UK', skywood: 'Skywood' };
const brandName = (b: string) => BRAND_NAME[b] ?? b;
const orderHref = (n: string) => `/admin/orders?o=${encodeURIComponent(n)}`;
const none = (): Routing => ({ open: [], close: [] });

function packTask(brand: string, number: string, why: string): TaskSpec {
  return {
    kind: 'order.pack',
    category: 'orders',
    role: 'warehouse',
    brand,
    title: `Pack order ${number}`,
    detail: `${brandName(brand)} · ${why}. Pick, pack and mark Packed.`,
    entity: 'Order',
    entityId: number,
    href: orderHref(number),
    priority: 'high',
    dueMinutes: TASK_DEFAULTS.packMinutes,
    key: `order:${number}:pack`,
  };
}

/** Pure routing rules. Returns tasks to open and tasks to close for one event. */
export function routeEvent(e: TaskEvent): Routing {
  switch (e.type) {
    case 'order.placed':
      // Card / Azania account orders wait for payment (stock is reserved); Pay Later waits for the bank.
      return e.status === 'approved' ? { open: [packTask(e.brand, e.number, e.method === 'pay_on_delivery' ? 'Pay on delivery, confirmed' : 'Payment confirmed')], close: [] } : none();
    case 'order.paid':
      return { open: [packTask(e.brand, e.number, 'Paid in full')], close: [] };
    case 'order.status':
      return routeOrderStatus(e);
    case 'advance.submitted':
      return {
        open: [
          {
            kind: 'advance.review',
            category: 'bank',
            role: 'finance',
            brand: e.brand,
            title: `Pay Later application for ${e.number}`,
            detail: `${brandName(e.brand)} · Check the application and get Azania Bank's decision.`,
            entity: 'Order',
            entityId: e.number,
            href: `/admin/advance?id=${encodeURIComponent(e.applicationId)}`,
            priority: 'high',
            dueMinutes: TASK_DEFAULTS.advanceReviewMinutes,
            key: `order:${e.number}:advance`,
          },
        ],
        close: [],
      };
    case 'advance.decided': {
      const close: CloseSpec[] = [{ entity: 'Order', entityId: e.number, kinds: ['advance.review'] }];
      if (e.decision === 'approved') return { open: [packTask(e.brand, e.number, 'Pay Later approved by Azania Bank')], close };
      return {
        open: [
          {
            kind: 'advance.declined',
            category: 'bank',
            role: 'support',
            brand: e.brand,
            title: `Call customer: Pay Later declined for ${e.number}`,
            detail: `${brandName(e.brand)} · Azania Bank declined. Offer card, Azania account or pay on delivery.`,
            entity: 'Order',
            entityId: e.number,
            href: orderHref(e.number),
            priority: 'high',
            dueMinutes: TASK_DEFAULTS.contactMinutes,
            key: `order:${e.number}:declined`,
          },
        ],
        close,
      };
    }
    case 'ticket.created':
      return {
        open: [
          {
            kind: 'ticket.respond',
            category: 'tickets',
            role: 'support',
            brand: e.brand,
            title: `Reply to ${e.number} (${e.issue})`,
            detail: `${brandName(e.brand)} · First response within ${TASK_DEFAULTS.ticketNewSlaHours} hours.`,
            entity: 'Ticket',
            entityId: e.ticketId,
            href: `/admin/tickets?id=${encodeURIComponent(e.ticketId)}`,
            priority: 'normal',
            dueMinutes: TASK_DEFAULTS.ticketFirstResponseMinutes,
            key: `ticket:${e.ticketId}:respond`,
            roundRobin: true,
          },
        ],
        close: [],
      };
    case 'ticket.status':
      if (e.status === 'resolved') return { open: [], close: [{ entity: 'Ticket', entityId: e.ticketId }] };
      // A reply moves the ticket on: the first-response task is done; escalation stays until resolved.
      if (e.status === 'waiting') return { open: [], close: [{ entity: 'Ticket', entityId: e.ticketId, kinds: ['ticket.respond'] }] };
      return none();
    case 'ticket.stale':
      return routeStaleTicket(e);
    case 'stock.level':
      return routeStock(e);
    case 'catalogue.photos':
      if (e.missing <= 0) return { open: [], close: [{ entity: 'Brand', entityId: e.brand, kinds: ['catalogue.photos'] }] };
      return {
        open: [
          {
            kind: 'catalogue.photos',
            category: 'stock',
            role: 'catalogue',
            brand: e.brand,
            title: `${e.missing} ${brandName(e.brand)} product${e.missing === 1 ? ' has' : 's have'} no photo`,
            detail: 'Products without a photo sell less. Upload one in Products and photos.',
            entity: 'Brand',
            entityId: e.brand,
            href: `/admin/products?b=${e.brand}`,
            priority: 'low',
            dueMinutes: null,
            key: `brand:${e.brand}:photos`,
            cooldownHours: TASK_DEFAULTS.photosCooldownHours,
          },
        ],
        close: [],
      };
    case 'subscribers.count': {
      const m = milestoneCrossed(e.before, e.after);
      if (!m) return none();
      return {
        open: [
          {
            kind: 'marketing.milestone',
            category: 'marketing',
            role: 'manager',
            brand: e.brand,
            title: `${brandName(e.brand)} reached ${m.toLocaleString('en-US')} subscribers`,
            detail: 'A good moment for a welcome offer or a campaign.',
            entity: 'Brand',
            entityId: e.brand,
            href: '/admin/marketing/subscribers',
            priority: 'low',
            dueMinutes: null,
            key: `brand:${e.brand}:subs:${m}`,
          },
        ],
        close: [],
      };
    }
    case 'campaign.result': {
      const failed = e.failed ?? 0;
      return {
        open: [
          {
            kind: 'marketing.campaign',
            category: 'marketing',
            role: 'manager',
            brand: e.brand,
            title: e.ok ? `Campaign sent: ${e.name}` : `Campaign failed to send: ${e.name}`,
            detail: e.ok ? `${e.sent ?? 0} sent${failed ? `, ${failed} failed` : ''}. Review the results.` : 'Fix the problem (promo code, audience) and send it again.',
            entity: 'Campaign',
            entityId: e.campaignId,
            href: `/admin/marketing/${encodeURIComponent(e.campaignId)}`,
            priority: !e.ok ? 'urgent' : failed ? 'high' : 'low',
            dueMinutes: e.ok ? null : 4 * 60,
            key: `campaign:${e.campaignId}:${e.ok ? 'sent' : 'failed'}`,
          },
        ],
        close: [],
      };
    }
  }
}

function routeOrderStatus(e: Extract<TaskEvent, { type: 'order.status' }>): Routing {
  const close: CloseSpec[] = [];
  const open: TaskSpec[] = [];
  switch (e.to) {
    case 'packed':
      close.push({ entity: 'Order', entityId: e.number, kinds: ['order.pack'] });
      open.push({
        kind: 'order.dispatch',
        category: 'orders',
        role: 'warehouse',
        brand: e.brand,
        title: `Dispatch order ${e.number}`,
        detail: `${brandName(e.brand)} · Packed and ready. Hand over to delivery and mark Out for delivery.`,
        entity: 'Order',
        entityId: e.number,
        href: orderHref(e.number),
        priority: 'normal',
        dueMinutes: TASK_DEFAULTS.dispatchMinutes,
        key: `order:${e.number}:dispatch`,
      });
      break;
    case 'out_for_delivery':
      close.push({ entity: 'Order', entityId: e.number, kinds: ['order.pack', 'order.dispatch'] });
      break;
    case 'delivered':
      close.push({ entity: 'Order', entityId: e.number, kinds: ['order.pack', 'order.dispatch', 'advance.review'] });
      break;
    case 'cancelled':
    case 'rejected':
      close.push({ entity: 'Order', entityId: e.number });
      if (e.to === 'rejected') break; // handled by advance.decided
      if (e.reason === 'expired' || e.from === 'placed') {
        open.push({
          kind: 'order.contact',
          category: 'orders',
          role: 'support',
          brand: e.brand,
          title: `Follow up: payment not completed for ${e.number}`,
          detail: `${brandName(e.brand)} · The payment window expired and the items went back on sale. Call to help the customer order again.`,
          entity: 'Order',
          entityId: e.number,
          href: orderHref(e.number),
          priority: 'normal',
          dueMinutes: 24 * 60,
          key: `order:${e.number}:contact`,
        });
        break;
      }
      open.push(
        {
          kind: 'order.restock',
          category: 'orders',
          role: 'warehouse',
          brand: e.brand,
          title: `Put back stock from cancelled order ${e.number}`,
          detail: `${brandName(e.brand)} · Unpack if packed and return the items to the shelf.`,
          entity: 'Order',
          entityId: e.number,
          href: orderHref(e.number),
          priority: e.from === 'packed' ? 'high' : 'normal',
          dueMinutes: 24 * 60,
          key: `order:${e.number}:restock`,
        },
        {
          kind: 'order.contact',
          category: 'orders',
          role: 'support',
          brand: e.brand,
          title: `Confirm cancellation with customer: ${e.number}`,
          detail: `${brandName(e.brand)} · Explain any refund and offer help to re-order.`,
          entity: 'Order',
          entityId: e.number,
          href: orderHref(e.number),
          priority: 'normal',
          dueMinutes: TASK_DEFAULTS.contactMinutes,
          key: `order:${e.number}:contact`,
        },
      );
      break;
    default:
      break;
  }
  return { open, close };
}

function routeStaleTicket(e: Extract<TaskEvent, { type: 'ticket.stale' }>): Routing {
  const sla = ticketSla(e.status, e.hours);
  if (sla !== 'breach') return none();
  if (e.status === 'new') {
    // Not answered in time: raise the first-response task to urgent (same key, so it updates in place).
    const base = routeEvent({ type: 'ticket.created', brand: e.brand, ticketId: e.ticketId, number: e.number, issue: 'no reply yet' }).open[0]!;
    return { open: [{ ...base, title: `Overdue: reply to ${e.number}`, detail: `${brandName(e.brand)} · New for ${Math.floor(e.hours)} hours with no reply.`, priority: 'urgent', dueMinutes: 0 }], close: [] };
  }
  return {
    open: [
      {
        kind: 'ticket.escalate',
        category: 'tickets',
        role: 'manager',
        brand: e.brand,
        title: `Escalated: ${e.number} ${e.status === 'waiting' ? 'waiting' : 'open'} ${Math.floor(e.hours)}h`,
        detail: `${brandName(e.brand)} · No progress for over ${TASK_DEFAULTS.ticketWaitingSlaHours} hours. Check with support or call the customer.`,
        entity: 'Ticket',
        entityId: e.ticketId,
        href: `/admin/tickets?id=${encodeURIComponent(e.ticketId)}`,
        priority: 'urgent',
        dueMinutes: TASK_DEFAULTS.escalationMinutes,
        key: `ticket:${e.ticketId}:escalate`,
      },
    ],
    close: [],
  };
}

function routeStock(e: Extract<TaskEvent, { type: 'stock.level' }>): Routing {
  if (e.stock > TASK_DEFAULTS.lowStock) return { open: [], close: [{ entity: 'Product', entityId: e.productId, kinds: ['stock.reorder', 'stock.review'] }] };
  const urgent = e.stock <= TASK_DEFAULTS.reorderStock;
  const left = e.stock === 0 ? 'out of stock' : `${e.stock} left`;
  const open: TaskSpec[] = [
    {
      kind: 'stock.reorder',
      category: 'stock',
      role: 'warehouse',
      brand: e.brand,
      title: `Reorder ${e.model} (${left})`,
      detail: `${brandName(e.brand)} · At or below the low-stock level of ${TASK_DEFAULTS.lowStock}. Raise a reorder with the supplier and restock.`,
      entity: 'Product',
      entityId: e.productId,
      href: '/admin/inventory?show=low',
      priority: e.stock === 0 ? 'urgent' : urgent ? 'high' : 'normal',
      dueMinutes: TASK_DEFAULTS.reorderMinutes,
      key: `product:${e.productId}:reorder`,
      cooldownHours: TASK_DEFAULTS.stockCooldownHours,
    },
  ];
  if (!e.hidden)
    open.push({
      kind: 'stock.review',
      category: 'stock',
      role: 'catalogue',
      brand: e.brand,
      title: `Low stock on the store: ${e.model} (${left})`,
      detail: `${brandName(e.brand)} · Check the listing: pause promotions or hot picks, or hide it if it cannot be restocked.`,
      entity: 'Product',
      entityId: e.productId,
      href: `/admin/products?b=${e.brand}&q=${encodeURIComponent(e.model)}`,
      priority: e.stock === 0 ? 'high' : 'normal',
      dueMinutes: null,
      key: `product:${e.productId}:review`,
      cooldownHours: TASK_DEFAULTS.stockCooldownHours,
    });
  return { open, close: [] };
}

/** Highest subscriber milestone passed when the count went from `before` to `after` (null if none). */
export function milestoneCrossed(before: number, after: number): number | null {
  let hit: number | null = null;
  for (const m of TASK_DEFAULTS.subscriberMilestones) if (before < m && after >= m) hit = m;
  return hit;
}

/** Ticket service level: new > 2 h without a reply, waiting/open > 24 h without progress. */
export function ticketSla(status: string, hours: number): 'ok' | 'warn' | 'breach' {
  if (status === 'resolved') return 'ok';
  const limit = status === 'new' ? TASK_DEFAULTS.ticketNewSlaHours : TASK_DEFAULTS.ticketWaitingSlaHours;
  if (hours >= limit) return 'breach';
  if (hours >= limit * 0.75) return 'warn';
  return 'ok';
}

export interface AssigneeCandidate {
  id: string;
  openTasks: number;
  lastAssignedAt: Date | null;
}

/** Round robin: fewest open tasks first, then whoever was assigned longest ago (never = first), then id. */
export function pickAssignee(candidates: AssigneeCandidate[]): string | null {
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((a, b) => a.openTasks - b.openTasks || (a.lastAssignedAt?.getTime() ?? 0) - (b.lastAssignedAt?.getTime() ?? 0) || a.id.localeCompare(b.id));
  return sorted[0]!.id;
}

const PRIORITY_RANK: Record<TaskPriority, number> = { low: 0, normal: 1, high: 2, urgent: 3 };

export function priorityRank(p: string): number {
  return PRIORITY_RANK[p as TaskPriority] ?? 1;
}

/** Keep the higher of two priorities (escalations never lower a task). */
export function maxPriority(a: string, b: string): TaskPriority {
  return (priorityRank(a) >= priorityRank(b) ? a : b) as TaskPriority;
}

export function isOverdue(t: { status: string; dueAt: Date | null }, now = new Date()): boolean {
  return t.status === 'open' && !!t.dueAt && t.dueAt.getTime() < now.getTime();
}

/** Sort for a work queue: overdue, then priority, then due time, then oldest. */
export function compareTasks(now = new Date()) {
  return (a: { status: string; priority: string; dueAt: Date | null; createdAt: Date }, b: typeof a) =>
    Number(isOverdue(b, now)) - Number(isOverdue(a, now)) ||
    priorityRank(b.priority) - priorityRank(a.priority) ||
    (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity) ||
    a.createdAt.getTime() - b.createdAt.getTime();
}

/** Roles whose queue a staff member works from. A Super admin also covers the manager queue. */
export function queueRoles(role: string): string[] {
  return role === 'owner' ? ['owner', 'manager'] : [role];
}

export interface TaskViewer {
  id: string;
  role: string;
  /** Brand scope; '*' = all. */
  brands: string[];
  /** May see every team's tasks (owner, manager: permission "tasks.all"). */
  all: boolean;
}

/** Whether a staff member may see (and complete) a task. */
export function canSeeTask(v: TaskViewer, t: { assigneeId: string | null; roleId: string; brandKey: string | null }): boolean {
  const inBrand = !t.brandKey || v.brands.includes('*') || v.brands.includes(t.brandKey);
  if (!inBrand) return false;
  return v.all || t.assigneeId === v.id || queueRoles(v.role).includes(t.roleId);
}

// Dashboards ---------------------------------------------------------------------------------

export type DashboardSection = 'tasks' | 'overview' | 'teams' | 'finance' | 'warehouse' | 'support' | 'catalogue' | 'marketing';

/**
 * Which dashboard widgets a set of permissions gets. Owner and manager (reports + products)
 * keep the full multi-brand overview; other roles get widgets for the work they do.
 * Money (revenue, payment mix) needs "reports": support, catalogue and warehouse never see it.
 */
export function dashboardSections(perms: readonly string[]): { sections: DashboardSection[]; money: boolean } {
  const has = (p: string) => perms.includes('*') || perms.includes(p);
  const money = has('reports');
  const overview = money && has('products');
  const out: DashboardSection[] = ['tasks'];
  if (overview) out.push('overview', 'teams');
  else {
    if (has('advance') && has('invoices') && money) out.push('finance');
    if (has('orders.write') && has('inventory')) out.push('warehouse');
    if (has('tickets')) out.push('support');
    if (has('products')) out.push('catalogue');
  }
  if (has('marketing')) out.push('marketing');
  return { sections: out, money };
}

/** Greeting by East Africa Time hour. */
export function greeting(now = new Date()): string {
  const h = (now.getUTCHours() + 3) % 24;
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
