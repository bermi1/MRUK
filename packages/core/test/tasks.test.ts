import { describe, expect, it } from 'vitest';
import {
  canSeeTask,
  compareTasks,
  dashboardSections,
  greeting,
  isOverdue,
  maxPriority,
  milestoneCrossed,
  pickAssignee,
  priorityRank,
  queueRoles,
  routeEvent,
  TASK_KIND_LABEL,
  TASK_KINDS,
  ticketSla,
} from '../src/index';

const kinds = (r: ReturnType<typeof routeEvent>) => r.open.map((t) => `${t.role}:${t.kind}`);

describe('order routing', () => {
  it('sends confirmed new orders to the warehouse to pack', () => {
    const r = routeEvent({ type: 'order.placed', brand: 'mruk', number: 'MU-10501', status: 'approved', method: 'pay_on_delivery' });
    expect(kinds(r)).toEqual(['warehouse:order.pack']);
    expect(r.open[0]).toMatchObject({ brand: 'mruk', entity: 'Order', entityId: 'MU-10501', key: 'order:MU-10501:pack', href: '/admin/orders?o=MU-10501', category: 'orders' });
    expect(r.open[0]!.detail).toContain('Pay on delivery');
    expect(routeEvent({ type: 'order.placed', brand: 'mruk', number: 'MU-1', status: 'approved', method: 'card' }).open[0]!.detail).toContain('Payment confirmed');
  });
  it('waits for payment or the bank before packing', () => {
    expect(routeEvent({ type: 'order.placed', brand: 'mruk', number: 'MU-1', status: 'placed', method: 'card' })).toEqual({ open: [], close: [] });
    expect(routeEvent({ type: 'order.placed', brand: 'skywood', number: 'SW-1', status: 'bank_review', method: 'salary_advance' }).open).toHaveLength(0);
  });
  it('card / Azania payment creates the pack task', () => {
    expect(kinds(routeEvent({ type: 'order.paid', brand: 'skywood', number: 'SW-20401', method: 'card' }))).toEqual(['warehouse:order.pack']);
  });
  it('packed closes pack and opens dispatch; out for delivery closes dispatch', () => {
    const p = routeEvent({ type: 'order.status', brand: 'mruk', number: 'MU-1', from: 'approved', to: 'packed' });
    expect(p.close).toEqual([{ entity: 'Order', entityId: 'MU-1', kinds: ['order.pack'] }]);
    expect(kinds(p)).toEqual(['warehouse:order.dispatch']);
    const o = routeEvent({ type: 'order.status', brand: 'mruk', number: 'MU-1', from: 'packed', to: 'out_for_delivery' });
    expect(o.open).toHaveLength(0);
    expect(o.close[0]!.kinds).toContain('order.dispatch');
    expect(routeEvent({ type: 'order.status', brand: 'mruk', number: 'MU-1', from: 'out_for_delivery', to: 'delivered' }).close[0]!.kinds).toContain('order.pack');
    expect(routeEvent({ type: 'order.status', brand: 'mruk', number: 'MU-1', from: 'placed', to: 'approved' })).toEqual({ open: [], close: [] });
  });
  it('cancelled orders go to warehouse (restock) and support (contact), closing everything else', () => {
    const r = routeEvent({ type: 'order.status', brand: 'mruk', number: 'MU-9', from: 'packed', to: 'cancelled' });
    expect(r.close).toEqual([{ entity: 'Order', entityId: 'MU-9' }]);
    expect(kinds(r)).toEqual(['warehouse:order.restock', 'support:order.contact']);
    expect(r.open[0]!.priority).toBe('high');
    expect(routeEvent({ type: 'order.status', brand: 'mruk', number: 'MU-9', from: 'approved', to: 'cancelled' }).open[0]!.priority).toBe('normal');
  });
  it('expired reservations go to support to follow up', () => {
    const r = routeEvent({ type: 'order.status', brand: 'skywood', number: 'SW-9', from: 'placed', to: 'cancelled', reason: 'expired' });
    expect(kinds(r)).toEqual(['support:order.contact']);
    expect(r.open[0]!.title).toContain('payment not completed');
  });
  it('rejected only closes tasks (the bank decision routes the follow-up)', () => {
    expect(routeEvent({ type: 'order.status', brand: 'mruk', number: 'MU-9', from: 'bank_review', to: 'rejected' }).open).toHaveLength(0);
  });
});

describe('Pay Later routing', () => {
  it('submitted applications go to finance', () => {
    const r = routeEvent({ type: 'advance.submitted', brand: 'mruk', number: 'MU-2', applicationId: 'app1' });
    expect(kinds(r)).toEqual(['finance:advance.review']);
    expect(r.open[0]).toMatchObject({ href: '/admin/advance?id=app1', category: 'bank', priority: 'high' });
  });
  it('approval closes the review and sends the order to the warehouse', () => {
    const r = routeEvent({ type: 'advance.decided', brand: 'mruk', number: 'MU-2', applicationId: 'a', decision: 'approved' });
    expect(r.close).toEqual([{ entity: 'Order', entityId: 'MU-2', kinds: ['advance.review'] }]);
    expect(kinds(r)).toEqual(['warehouse:order.pack']);
  });
  it('a decline sends support to contact the customer', () => {
    const r = routeEvent({ type: 'advance.decided', brand: 'skywood', number: 'SW-2', applicationId: 'a', decision: 'rejected' });
    expect(kinds(r)).toEqual(['support:advance.declined']);
  });
});

describe('ticket routing', () => {
  it('new tickets go to support by round robin', () => {
    const r = routeEvent({ type: 'ticket.created', brand: 'mruk', ticketId: 't1', number: 'TK-1', issue: 'Repair' });
    expect(r.open[0]).toMatchObject({ role: 'support', roundRobin: true, key: 'ticket:t1:respond', href: '/admin/tickets?id=t1' });
  });
  it('a reply closes the first-response task; resolving closes all', () => {
    expect(routeEvent({ type: 'ticket.status', brand: 'mruk', ticketId: 't1', number: 'TK-1', status: 'waiting' }).close).toEqual([{ entity: 'Ticket', entityId: 't1', kinds: ['ticket.respond'] }]);
    expect(routeEvent({ type: 'ticket.status', brand: 'mruk', ticketId: 't1', number: 'TK-1', status: 'resolved' }).close).toEqual([{ entity: 'Ticket', entityId: 't1' }]);
    expect(routeEvent({ type: 'ticket.status', brand: 'mruk', ticketId: 't1', number: 'TK-1', status: 'open' })).toEqual({ open: [], close: [] });
  });
  it('new > 2h raises the reply task to urgent; waiting > 24h escalates to the manager', () => {
    const late = routeEvent({ type: 'ticket.stale', brand: 'mruk', ticketId: 't1', number: 'TK-1', status: 'new', hours: 3 });
    expect(late.open[0]).toMatchObject({ kind: 'ticket.respond', priority: 'urgent', key: 'ticket:t1:respond' });
    const esc = routeEvent({ type: 'ticket.stale', brand: 'mruk', ticketId: 't1', number: 'TK-1', status: 'waiting', hours: 30 });
    expect(kinds(esc)).toEqual(['manager:ticket.escalate']);
    expect(esc.open[0]!.title).toContain('waiting 30h');
    expect(routeEvent({ type: 'ticket.stale', brand: 'mruk', ticketId: 't1', number: 'TK-1', status: 'open', hours: 26 }).open[0]!.title).toContain('open 26h');
    expect(routeEvent({ type: 'ticket.stale', brand: 'mruk', ticketId: 't1', number: 'TK-1', status: 'waiting', hours: 5 }).open).toHaveLength(0);
  });
  it('SLA levels', () => {
    expect(ticketSla('new', 1)).toBe('ok');
    expect(ticketSla('new', 1.6)).toBe('warn');
    expect(ticketSla('new', 2)).toBe('breach');
    expect(ticketSla('waiting', 25)).toBe('breach');
    expect(ticketSla('resolved', 500)).toBe('ok');
  });
});

describe('stock and catalogue routing', () => {
  it('low stock goes to warehouse (reorder) and catalogue (listing)', () => {
    const r = routeEvent({ type: 'stock.level', brand: 'mruk', productId: 'p1', model: 'UK-1', stock: 5 });
    expect(kinds(r)).toEqual(['warehouse:stock.reorder', 'catalogue:stock.review']);
    expect(r.open[0]!.priority).toBe('normal');
    expect(r.open[0]!.cooldownHours).toBe(72);
    expect(routeEvent({ type: 'stock.level', brand: 'mruk', productId: 'p1', model: 'UK-1', stock: 2 }).open[0]!.priority).toBe('high');
    const out = routeEvent({ type: 'stock.level', brand: 'mruk', productId: 'p1', model: 'UK-1', stock: 0 });
    expect(out.open.map((t) => t.priority)).toEqual(['urgent', 'high']);
    expect(out.open[0]!.title).toContain('out of stock');
  });
  it('hidden products only need a reorder', () => {
    expect(kinds(routeEvent({ type: 'stock.level', brand: 'mruk', productId: 'p1', model: 'UK-1', stock: 1, hidden: true }))).toEqual(['warehouse:stock.reorder']);
  });
  it('healthy stock closes stock tasks', () => {
    expect(routeEvent({ type: 'stock.level', brand: 'mruk', productId: 'p1', model: 'UK-1', stock: 7 })).toEqual({ open: [], close: [{ entity: 'Product', entityId: 'p1', kinds: ['stock.reorder', 'stock.review'] }] });
  });
  it('products without a photo go to catalogue, per brand', () => {
    expect(routeEvent({ type: 'catalogue.photos', brand: 'skywood', missing: 3 }).open[0]).toMatchObject({ role: 'catalogue', title: '3 Skywood products have no photo', key: 'brand:skywood:photos' });
    expect(routeEvent({ type: 'catalogue.photos', brand: 'mruk', missing: 1 }).open[0]!.title).toBe('1 Mr UK product has no photo');
    expect(routeEvent({ type: 'catalogue.photos', brand: 'mruk', missing: 0 }).close).toHaveLength(1);
  });
});

describe('marketing routing', () => {
  it('subscriber milestones go to the manager', () => {
    expect(milestoneCrossed(9, 10)).toBe(10);
    expect(milestoneCrossed(10, 11)).toBeNull();
    expect(milestoneCrossed(20, 60)).toBe(50);
    expect(kinds(routeEvent({ type: 'subscribers.count', brand: 'mruk', before: 99, after: 100 }))).toEqual(['manager:marketing.milestone']);
    expect(routeEvent({ type: 'subscribers.count', brand: 'mruk', before: 100, after: 101 }).open).toHaveLength(0);
  });
  it('campaign results go to the manager; failures are urgent', () => {
    const ok = routeEvent({ type: 'campaign.result', brand: 'mruk', campaignId: 'c1', name: 'Eid', ok: true, sent: 10 });
    expect(ok.open[0]).toMatchObject({ role: 'manager', priority: 'low', key: 'campaign:c1:sent' });
    expect(ok.open[0]!.detail).toBe('10 sent. Review the results.');
    expect(routeEvent({ type: 'campaign.result', brand: 'mruk', campaignId: 'c1', name: 'Eid', ok: true, sent: 8, failed: 2 }).open[0]!.priority).toBe('high');
    expect(routeEvent({ type: 'campaign.result', brand: 'mruk', campaignId: 'c1', name: 'Eid', ok: true }).open[0]!.detail).toContain('0 sent');
    expect(routeEvent({ type: 'campaign.result', brand: 'mruk', campaignId: 'c1', name: 'Eid', ok: false }).open[0]).toMatchObject({ priority: 'urgent', key: 'campaign:c1:failed' });
  });
});

describe('assignment, visibility and ordering', () => {
  it('round robin picks the least busy, then the longest idle', () => {
    expect(pickAssignee([])).toBeNull();
    expect(pickAssignee([{ id: 'a', openTasks: 3, lastAssignedAt: null }, { id: 'b', openTasks: 1, lastAssignedAt: new Date() }])).toBe('b');
    expect(pickAssignee([{ id: 'a', openTasks: 1, lastAssignedAt: new Date(2000) }, { id: 'b', openTasks: 1, lastAssignedAt: new Date(1000) }])).toBe('b');
    expect(pickAssignee([{ id: 'b', openTasks: 0, lastAssignedAt: null }, { id: 'a', openTasks: 0, lastAssignedAt: null }])).toBe('a');
  });
  it('staff see their own and their role queue, within brand scope', () => {
    const daudi = { id: 'd', role: 'warehouse', brands: ['mruk'], all: false };
    expect(canSeeTask(daudi, { assigneeId: null, roleId: 'warehouse', brandKey: 'mruk' })).toBe(true);
    expect(canSeeTask(daudi, { assigneeId: null, roleId: 'warehouse', brandKey: 'skywood' })).toBe(false);
    expect(canSeeTask(daudi, { assigneeId: null, roleId: 'finance', brandKey: 'mruk' })).toBe(false);
    expect(canSeeTask(daudi, { assigneeId: 'd', roleId: 'support', brandKey: null })).toBe(true);
    expect(canSeeTask({ id: 'o', role: 'owner', brands: ['*'], all: true }, { assigneeId: null, roleId: 'finance', brandKey: 'skywood' })).toBe(true);
    expect(queueRoles('owner')).toEqual(['owner', 'manager']);
    expect(queueRoles('support')).toEqual(['support']);
  });
  it('priorities and queue order', () => {
    expect(priorityRank('urgent')).toBe(3);
    expect(priorityRank('weird')).toBe(1);
    expect(maxPriority('normal', 'urgent')).toBe('urgent');
    expect(maxPriority('high', 'low')).toBe('high');
    const now = new Date(10_000_000);
    expect(isOverdue({ status: 'open', dueAt: new Date(1) }, now)).toBe(true);
    expect(isOverdue({ status: 'done', dueAt: new Date(1) }, now)).toBe(false);
    expect(isOverdue({ status: 'open', dueAt: null }, now)).toBe(false);
    const t = (id: string, priority: string, due: number | null, created = 0) => ({ id, status: 'open', priority, dueAt: due === null ? null : new Date(due), createdAt: new Date(created) });
    const list = [t('norm-new', 'normal', null, 2), t('late', 'low', 1), t('urgent', 'urgent', null), t('high-later', 'high', 30_000_000), t('high-soon', 'high', 20_000_000), t('norm-old', 'normal', null, 1)];
    expect(list.sort(compareTasks(now)).map((x) => x.id)).toEqual(['late', 'urgent', 'high-soon', 'high-later', 'norm-old', 'norm-new']);
  });
  it('labels every kind', () => {
    for (const k of TASK_KINDS) expect(TASK_KIND_LABEL[k]).toBeTruthy();
  });
});

describe('role dashboards', () => {
  const PERMS = {
    manager: ['dashboard', 'orders', 'orders.write', 'advance', 'invoices', 'customers', 'products', 'products.write', 'inventory', 'catalog', 'promos', 'cms', 'marketing', 'tickets', 'reports'],
    finance: ['dashboard', 'orders', 'advance', 'advance.write', 'invoices', 'invoices.write', 'customers', 'reports'],
    catalogue: ['dashboard', 'products', 'products.write', 'inventory', 'catalog', 'cms', 'cms.write', 'promos', 'promos.write'],
    warehouse: ['dashboard', 'orders', 'orders.write', 'inventory'],
    support: ['dashboard', 'orders', 'customers', 'tickets', 'tickets.write'],
  };
  it('owner and manager keep the full overview', () => {
    expect(dashboardSections(['*'])).toEqual({ sections: ['tasks', 'overview', 'teams', 'marketing'], money: true });
    expect(dashboardSections(PERMS.manager).sections).toEqual(['tasks', 'overview', 'teams', 'marketing']);
  });
  it('each role gets its own widgets and only finance sees money', () => {
    expect(dashboardSections(PERMS.finance)).toEqual({ sections: ['tasks', 'finance'], money: true });
    expect(dashboardSections(PERMS.warehouse)).toEqual({ sections: ['tasks', 'warehouse'], money: false });
    expect(dashboardSections(PERMS.support)).toEqual({ sections: ['tasks', 'support'], money: false });
    expect(dashboardSections(PERMS.catalogue)).toEqual({ sections: ['tasks', 'catalogue'], money: false });
    expect(dashboardSections(['dashboard', 'marketing']).sections).toEqual(['tasks', 'marketing']);
  });
  it('greets by East Africa Time', () => {
    expect(greeting(new Date('2026-01-01T05:00:00Z'))).toBe('Good morning');
    expect(greeting(new Date('2026-01-01T11:00:00Z'))).toBe('Good afternoon');
    expect(greeting(new Date('2026-01-01T17:00:00Z'))).toBe('Good evening');
  });
});
