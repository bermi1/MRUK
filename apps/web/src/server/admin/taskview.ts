import 'server-only';
import { prisma, type Prisma } from '@bt/db';
import { compareTasks, isOverdue, queueRoles, ROLE_LABEL, TASK_KIND_LABEL, type TaskKind, type TaskRole } from '@bt/core';
import type { StaffContext } from '../auth';
import { seesAllTasks, taskWhere, type TaskScope } from '../tasks';
import { ago, durationLabel } from './context';

/** Plain, serialisable task for lists (client components). No customer PII: titles hold numbers and models only. */
export interface TaskView {
  id: string;
  title: string;
  detail: string;
  href: string;
  kind: string;
  kindLabel: string;
  roleLabel: string;
  brand: string | null;
  priority: string;
  status: string;
  overdue: boolean;
  due: string | null;
  age: string;
  assignee: string | null;
  mine: boolean;
  canClaim: boolean;
  done: string | null;
}

export interface TaskQuery {
  status?: 'open' | 'done';
  kind?: string;
  role?: string;
  take?: number;
}

export async function loadTasks(ctx: StaffContext, brands: string[], scope: TaskScope, q: TaskQuery = {}): Promise<{ items: TaskView[]; total: number }> {
  const status = q.status ?? 'open';
  const where: Prisma.StaffTaskWhereInput = {
    AND: [taskWhere(ctx, brands, scope), { status }, ...(q.kind ? [{ kind: q.kind }] : []), ...(q.role ? [{ roleId: q.role }] : [])],
  };
  const take = q.take ?? 50;
  const [rows, total] = await Promise.all([
    prisma.staffTask.findMany({
      where,
      include: { assignee: { select: { name: true } } },
      orderBy: status === 'open' ? [{ createdAt: 'asc' }] : [{ doneAt: 'desc' }],
      take: status === 'open' ? 400 : take,
    }),
    prisma.staffTask.count({ where }),
  ]);
  const now = new Date();
  if (status === 'open') rows.sort(compareTasks(now));
  const roles = queueRoles(ctx.role);
  const all = seesAllTasks(ctx);
  return {
    total,
    items: rows.slice(0, take).map((t) => {
      const overdue = isOverdue(t, now);
      return {
        id: t.id,
        title: t.title,
        detail: t.detail,
        href: t.href,
        kind: t.kind,
        kindLabel: TASK_KIND_LABEL[t.kind as TaskKind] ?? t.kind,
        roleLabel: ROLE_LABEL[t.roleId as TaskRole] ?? t.roleId,
        brand: t.brandKey,
        priority: t.priority,
        status: t.status,
        overdue,
        due: t.status !== 'open' || !t.dueAt ? null : overdue ? `Overdue ${durationLabel(now.getTime() - t.dueAt.getTime())}` : `Due in ${durationLabel(t.dueAt.getTime() - now.getTime())}`,
        age: ago(t.createdAt),
        assignee: t.assignee?.name ?? null,
        mine: t.assigneeId === ctx.id,
        canClaim: t.status === 'open' && t.assigneeId !== ctx.id && (roles.includes(t.roleId) || all),
        done: t.doneAt ? `${t.doneBy ?? 'system'} · ${ago(t.doneAt)} ago` : null,
      };
    }),
  };
}

/** Open tasks per team (owner / manager overview), within the brand filter. */
export async function openTasksByRole(brands: string[]) {
  const now = new Date();
  const rows = await prisma.staffTask.findMany({ where: { status: 'open', OR: [{ brandKey: null }, { brandKey: { in: brands } }] }, select: { roleId: true, dueAt: true, status: true, priority: true } });
  const out = new Map<string, { open: number; overdue: number; urgent: number }>();
  for (const r of rows) {
    const v = out.get(r.roleId) ?? { open: 0, overdue: 0, urgent: 0 };
    v.open++;
    if (isOverdue(r, now)) v.overdue++;
    if (r.priority === 'urgent') v.urgent++;
    out.set(r.roleId, v);
  }
  return out;
}
