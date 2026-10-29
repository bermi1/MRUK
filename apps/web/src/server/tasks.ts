import 'server-only';
import { prisma, type Prisma } from '@bt/db';
import { canSeeTask, maxPriority, pickAssignee, priorityRank, queueRoles, routeEvent, type CloseSpec, type TaskEvent, type TaskSpec, type TaskViewer } from '@bt/core';
import type { StaffContext } from './auth';
import { env } from './env';
import { integrations } from './integrations';

/**
 * Task routing (the "responsible person"): events from checkout, payments, the bank, support,
 * stock and marketing become StaffTask rows for the right team and brand.
 * Hooks call emitTaskEvent(), which NEVER throws: a routing problem must not break checkout.
 */
export async function emitTaskEvent(e: TaskEvent, actor = 'system'): Promise<void> {
  try {
    const r = routeEvent(e);
    for (const c of r.close) await closeTasks(c, actor);
    for (const s of r.open) await openTask(s, actor);
  } catch (err) {
    console.error('[tasks]', e.type, err instanceof Error ? err.message : 'unknown error');
  }
}

/** Re-check stock for products whose quantity changed (opens or closes reorder tasks). */
export async function checkStock(productIds: string[]): Promise<void> {
  try {
    if (!productIds.length) return;
    const ps = await prisma.product.findMany({ where: { id: { in: [...new Set(productIds)] } }, select: { id: true, brandKey: true, model: true, stock: true, hidden: true } });
    for (const p of ps) await emitTaskEvent({ type: 'stock.level', brand: p.brandKey, productId: p.id, model: p.model, stock: p.stock, hidden: p.hidden });
  } catch (err) {
    console.error('[tasks] stock', err instanceof Error ? err.message : 'unknown error');
  }
}

/** Re-check stock for the items of an order (after stock was returned). */
export async function checkOrderStock(orderId: string): Promise<void> {
  try {
    await checkStock((await prisma.orderItem.findMany({ where: { orderId }, select: { productId: true } })).map((i) => i.productId));
  } catch (err) {
    console.error('[tasks] stock', err instanceof Error ? err.message : 'unknown error');
  }
}

/** Re-count products without a photo for a brand (one catalogue task per brand). */
export async function checkPhotos(brand: string): Promise<void> {
  try {
    const missing = await prisma.product.count({ where: { brandKey: brand, hidden: false, images: { isEmpty: true } } });
    await emitTaskEvent({ type: 'catalogue.photos', brand, missing });
  } catch (err) {
    console.error('[tasks] photos', err instanceof Error ? err.message : 'unknown error');
  }
}

async function closeTasks(c: CloseSpec, actor: string) {
  const open = await prisma.staffTask.findMany({ where: { entity: c.entity, entityId: c.entityId, status: 'open', ...(c.kinds ? { kind: { in: c.kinds } } : {}) }, select: { id: true, key: true } });
  for (const t of open) await markDone(t.id, t.key, actor, 'Closed automatically: the record moved on');
}

async function markDone(id: string, key: string, by: string, note: string) {
  await prisma.staffTask.updateMany({ where: { id, status: 'open' }, data: { status: 'done', doneAt: new Date(), doneBy: by, doneNote: note.slice(0, 300), key: `${key}~${id}` } });
}

/** Active staff of a role who may work on a brand. */
async function roleStaff(role: string, brand: string | null) {
  const staff = await prisma.staffUser.findMany({ where: { roleId: role, active: true }, select: { id: true, name: true, brands: true, phone: true, email: true, notifyVia: true } });
  return staff.filter((s) => !brand || s.brands.includes('*') || s.brands.includes(brand));
}

async function roundRobin(role: string, brand: string | null): Promise<string | null> {
  const staff = await roleStaff(role, brand);
  if (!staff.length) return null;
  const ids = staff.map((s) => s.id);
  const [open, last] = await Promise.all([
    prisma.staffTask.groupBy({ by: ['assigneeId'], where: { assigneeId: { in: ids }, status: 'open' }, _count: { _all: true } }),
    prisma.staffTask.groupBy({ by: ['assigneeId'], where: { assigneeId: { in: ids }, roleId: role }, _max: { createdAt: true } }),
  ]);
  return pickAssignee(staff.map((s) => ({ id: s.id, openTasks: open.find((o) => o.assigneeId === s.id)?._count._all ?? 0, lastAssignedAt: last.find((l) => l.assigneeId === s.id)?._max.createdAt ?? null })));
}

/** Open (or update in place) the task for a spec. Returns the task id, or null when nothing was opened. */
export async function openTask(s: TaskSpec, actor = 'system'): Promise<string | null> {
  const existing = await prisma.staffTask.findUnique({ where: { key: s.key } });
  const dueAt = s.dueMinutes === null ? null : new Date(Date.now() + s.dueMinutes * 60_000);
  if (existing) {
    const priority = maxPriority(existing.priority, s.priority);
    const raised = priority !== existing.priority;
    if (raised || existing.title !== s.title || existing.detail !== s.detail) {
      await prisma.staffTask.update({ where: { id: existing.id }, data: { title: s.title, detail: s.detail, priority, ...(raised && dueAt && (!existing.dueAt || dueAt < existing.dueAt) ? { dueAt } : {}) } });
      if (raised && priorityRank(priority) >= 3) await notifyTask(existing.id);
    }
    return existing.id;
  }
  if (s.cooldownHours) {
    const recent = await prisma.staffTask.findFirst({ where: { entity: s.entity, entityId: s.entityId, kind: s.kind, status: 'done', doneAt: { gte: new Date(Date.now() - s.cooldownHours * 3_600_000) } }, select: { id: true } });
    if (recent) return null;
  }
  const assigneeId = s.roundRobin ? await roundRobin(s.role, s.brand) : null;
  try {
    const t = await prisma.staffTask.create({
      data: { kind: s.kind, category: s.category, title: s.title, detail: s.detail, roleId: s.role, assigneeId, brandKey: s.brand, entity: s.entity, entityId: s.entityId, href: s.href, priority: s.priority, dueAt, key: s.key, createdBy: actor },
    });
    if (assigneeId && s.entity === 'Ticket') {
      const name = (await prisma.staffUser.findUnique({ where: { id: assigneeId }, select: { name: true } }))?.name;
      if (name) await prisma.ticket.updateMany({ where: { id: s.entityId, assignee: '' }, data: { assignee: name } });
    }
    await notifyTask(t.id);
    return t.id;
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') return null; // opened in parallel
    throw e;
  }
}

/** Hand the tasks for a record to one staff member (e.g. a ticket assigned in the inbox). */
export async function assignEntityTasks(entity: string, entityId: string, staffId: string, kinds?: string[]) {
  try {
    await prisma.staffTask.updateMany({ where: { entity, entityId, status: 'open', ...(kinds ? { kind: { in: kinds } } : {}) }, data: { assigneeId: staffId } });
  } catch (err) {
    console.error('[tasks] assign', err instanceof Error ? err.message : 'unknown error');
  }
}

// Notifications ---------------------------------------------------------------------------------

/** Settings › Notifications switches (default on). */
async function categoryOn(category: string): Promise<boolean> {
  const row = await prisma.setting.findUnique({ where: { key: 'notifications' } });
  const v = (row?.value ?? {}) as Record<string, boolean>;
  return v[category] ?? true;
}

/**
 * Tell the responsible people that a task was assigned: the assignee, or everyone in the
 * role and brand when it sits in the team queue. Only channels each person opted in to.
 * Message text carries no customer PII (order / ticket numbers and product models only);
 * nothing about recipients is logged.
 */
export async function notifyTask(taskId: string): Promise<string[]> {
  try {
    const t = await prisma.staffTask.findUnique({ where: { id: taskId } });
    if (!t || t.status !== 'open' || !(await categoryOn(t.category))) return [];
    const people = t.assigneeId
      ? await prisma.staffUser.findMany({ where: { id: t.assigneeId, active: true }, select: { id: true, name: true, brands: true, phone: true, email: true, notifyVia: true } })
      : await roleStaff(t.roleId, t.brandKey);
    const link = `${env.APP_URL.replace(/\/$/, '')}/admin/tasks`;
    const urgent = priorityRank(t.priority) >= 3 ? 'URGENT: ' : '';
    const text = `Commerce OS: ${urgent}${t.title}. ${link}`;
    const used = new Set<string>();
    for (const p of people) {
      for (const ch of p.notifyVia) {
        try {
          if (ch === 'sms' && p.phone) await integrations.sms.send(p.phone, text);
          else if (ch === 'whatsapp' && p.phone) await integrations.whatsapp.send(p.phone, text);
          else if (ch === 'email' && p.email) await integrations.email.send(p.email, `${urgent}New task: ${t.title}`, `${t.title}\n${t.detail}\n\nOpen your tasks: ${link}`);
          else continue;
          used.add(ch);
        } catch {
          console.error('[tasks] notification failed', ch);
        }
      }
    }
    if (used.size) await prisma.staffTask.update({ where: { id: t.id }, data: { notifiedVia: [...new Set([...t.notifiedVia, ...used])] } });
    return [...used];
  } catch (err) {
    console.error('[tasks] notify', err instanceof Error ? err.message : 'unknown error');
    return [];
  }
}

// Queries ----------------------------------------------------------------------------------------

export type TaskScope = 'mine' | 'role' | 'all';

/** Owner and manager (permission "tasks.all") can see every team's queue. */
export function seesAllTasks(ctx: StaffContext): boolean {
  return ctx.can('tasks.all');
}

export function viewer(ctx: StaffContext): TaskViewer {
  return { id: ctx.id, role: ctx.role, brands: ctx.brands, all: seesAllTasks(ctx) };
}

/**
 * Tasks a staff member can see, narrowed to the header brand filter.
 * mine = assigned to me, or in my role queue with no assignee ("my work");
 * role = everything in my role queue; all = every team (owner / manager only).
 */
export function taskWhere(ctx: StaffContext, brands: string[], scope: TaskScope): Prisma.StaffTaskWhereInput {
  const brand: Prisma.StaffTaskWhereInput = { OR: [{ brandKey: null }, { brandKey: { in: brands } }] };
  const roles = queueRoles(ctx.role);
  if (scope === 'all' && seesAllTasks(ctx)) return brand;
  if (scope === 'role') return { AND: [brand, { OR: [{ roleId: { in: roles } }, { assigneeId: ctx.id }] }] };
  return { AND: [brand, { OR: [{ assigneeId: ctx.id }, { roleId: { in: roles }, assigneeId: null }] }] };
}

export async function myOpenTaskCount(ctx: StaffContext, brands: string[]): Promise<number> {
  return prisma.staffTask.count({ where: { AND: [taskWhere(ctx, brands, 'mine'), { status: 'open' }] } });
}

export async function completeTask(ctx: StaffContext, id: string, note: string) {
  const t = await prisma.staffTask.findUnique({ where: { id } });
  if (!t) throw new Error('Task not found');
  if (!canSeeTask(viewer(ctx), t)) throw new Error('This task is not for you');
  if (t.status !== 'open') throw new Error('This task is already done');
  await markDone(t.id, t.key, ctx.name, note || `Done by ${ctx.name}`);
  return t;
}

export async function claimTask(ctx: StaffContext, id: string) {
  const t = await prisma.staffTask.findUnique({ where: { id } });
  if (!t || t.status !== 'open') throw new Error('Task not found or already done');
  if (!canSeeTask(viewer(ctx), t)) throw new Error('This task belongs to another team');
  await prisma.staffTask.update({ where: { id: t.id }, data: { assigneeId: ctx.id } });
  return t;
}

