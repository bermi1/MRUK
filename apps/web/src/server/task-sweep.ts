import 'server-only';
import { prisma } from '@bt/db';
import { TASK_DEFAULTS } from '@bt/core';
import { releaseExpiredReservations } from './orders';
import { checkPhotos, checkStock, emitTaskEvent } from './tasks';

const SWEEP_KEY = 'tasks.sweepAt';
const HOUR = 3_600_000;

/**
 * Periodic sweep (cron route, and lazily from the dashboard at most every few minutes):
 * - ticket SLAs: new > 2 h raises the reply task to urgent; waiting/open > 24 h escalates to the manager;
 * - low stock and missing photos (catches changes made outside the admin, e.g. a database import);
 * - expired payment reservations;
 * - closes tasks whose record already moved on (safety net for any missed hook).
 */
export async function sweepTasks(now = new Date()) {
  const out = { expired: 0, escalated: 0, stock: 0, closed: 0 };
  out.expired = await releaseExpiredReservations().catch(() => 0);

  const stale = await prisma.ticket.findMany({
    where: {
      OR: [
        { status: 'new', createdAt: { lt: new Date(now.getTime() - TASK_DEFAULTS.ticketNewSlaHours * HOUR) } },
        { status: { in: ['open', 'waiting'] }, updatedAt: { lt: new Date(now.getTime() - TASK_DEFAULTS.ticketWaitingSlaHours * HOUR) } },
      ],
    },
    select: { id: true, number: true, brandKey: true, status: true, createdAt: true, updatedAt: true },
    take: 200,
  });
  for (const t of stale) {
    const since = t.status === 'new' ? t.createdAt : t.updatedAt;
    await emitTaskEvent({ type: 'ticket.stale', brand: t.brandKey, ticketId: t.id, number: t.number, status: t.status, hours: (now.getTime() - since.getTime()) / HOUR });
    out.escalated++;
  }

  const low = await prisma.product.findMany({ where: { stock: { lte: TASK_DEFAULTS.lowStock } }, select: { id: true } });
  // Products with open stock tasks are re-checked too, so restocked ones close.
  const withTasks = await prisma.staffTask.findMany({ where: { entity: 'Product', status: 'open' }, select: { entityId: true }, distinct: ['entityId'] });
  const ids = [...new Set([...low.map((p) => p.id), ...withTasks.map((t) => t.entityId)])];
  await checkStock(ids);
  out.stock = low.length;
  for (const b of ['mruk', 'skywood']) await checkPhotos(b);

  out.closed = await reconcile();
  await prisma.setting.upsert({ where: { key: SWEEP_KEY }, create: { key: SWEEP_KEY, value: now.toISOString() }, update: { value: now.toISOString() } });
  return out;
}

/** Close open order / ticket tasks whose record is already past that step. */
async function reconcile(): Promise<number> {
  const open = await prisma.staffTask.findMany({ where: { status: 'open', entity: { in: ['Order', 'Ticket'] } }, select: { id: true, key: true, kind: true, entity: true, entityId: true } });
  if (!open.length) return 0;
  const [orders, tickets] = await Promise.all([
    prisma.order.findMany({ where: { number: { in: open.filter((t) => t.entity === 'Order').map((t) => t.entityId) } }, select: { number: true, status: true, advance: { select: { status: true } } } }),
    prisma.ticket.findMany({ where: { id: { in: open.filter((t) => t.entity === 'Ticket').map((t) => t.entityId) } }, select: { id: true, status: true } }),
  ]);
  const o = new Map(orders.map((x) => [x.number, x]));
  const tk = new Map(tickets.map((x) => [x.id, x.status]));
  let n = 0;
  for (const t of open) {
    let stale = false;
    if (t.entity === 'Order') {
      const ord = o.get(t.entityId);
      if (!ord) stale = true;
      else if (t.kind === 'order.pack') stale = ord.status !== 'approved';
      else if (t.kind === 'order.dispatch') stale = ord.status !== 'packed';
      else if (t.kind === 'advance.review') stale = ord.advance?.status !== 'submitted';
    } else {
      const st = tk.get(t.entityId);
      stale = !st || st === 'resolved' || (t.kind === 'ticket.respond' && st === 'waiting');
    }
    if (stale) {
      const r = await prisma.staffTask.updateMany({ where: { id: t.id, status: 'open' }, data: { status: 'done', doneAt: new Date(), doneBy: 'system', doneNote: 'Closed automatically: the record moved on', key: `${t.key}~${t.id}` } });
      n += r.count;
    }
  }
  return n;
}

/** Run the sweep if the last one is older than `minutes` (cheap check; used on dashboard loads). */
export async function maybeSweep(minutes = 5) {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SWEEP_KEY } });
    const last = row ? Date.parse(String(row.value)) : 0;
    if (Number.isFinite(last) && Date.now() - last < minutes * 60_000) return null;
    // Claim the slot first so parallel page loads do not all sweep.
    await prisma.setting.upsert({ where: { key: SWEEP_KEY }, create: { key: SWEEP_KEY, value: new Date().toISOString() }, update: { value: new Date().toISOString() } });
    return await sweepTasks();
  } catch (err) {
    console.error('[tasks] sweep', err instanceof Error ? err.message : 'unknown error');
    return null;
  }
}
