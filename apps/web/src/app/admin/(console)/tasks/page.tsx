import Link from 'next/link';
import { prisma } from '@bt/db';
import { ROLE_LABEL, TASK_KIND_LABEL, TASK_KINDS, type TaskRole } from '@bt/core';
import { TaskList } from '@/components/admin/TaskList';
import { Forbidden } from '@/components/admin/ui';
import { adminFilters } from '@/server/admin/context';
import { loadTasks } from '@/server/admin/taskview';
import { requireStaff } from '@/server/auth';
import { maybeSweep } from '@/server/task-sweep';
import { seesAllTasks, taskWhere, type TaskScope } from '@/server/tasks';

export const metadata = { title: 'My tasks' };

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('dashboard')) return <Forbidden what="tasks" />;
  await maybeSweep();
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const all = seesAllTasks(ctx);
  const scopes: { key: TaskScope; label: string }[] = [
    { key: 'mine', label: 'Mine' },
    { key: 'role', label: ctx.role === 'owner' ? 'Owner and manager' : `${ROLE_LABEL[ctx.role as TaskRole] ?? ctx.roleName} team` },
    ...(all ? [{ key: 'all' as const, label: 'All teams' }] : []),
  ];
  const scope = scopes.find((s) => s.key === sp.view)?.key ?? 'mine';
  const status = sp.status === 'done' ? 'done' : 'open';
  const kind = (TASK_KINDS as readonly string[]).includes(sp.kind ?? '') ? sp.kind! : '';
  const role = scope === 'all' && sp.role && sp.role in ROLE_LABEL ? sp.role : '';
  const [{ items, total }, counts] = await Promise.all([
    loadTasks(ctx, f.brands, scope, { status, kind: kind || undefined, role: role || undefined, take: 100 }),
    Promise.all(scopes.map((s) => prisma.staffTask.count({ where: { AND: [taskWhere(ctx, f.brands, s.key), { status: 'open' }] } }))),
  ]);
  const href = (p: Record<string, string>) => {
    const q = { view: scope, status, ...(kind ? { kind } : {}), ...(role ? { role } : {}), ...p };
    return `/admin/tasks?${new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][])}`;
  };

  return (
    <div className="ad-stack">
      <section className="ad-card ad-stack s12">
        <div className="ad-between">
          <div>
            <h2 className="ad-h">Work routed to you</h2>
            <p className="ad-sub">Orders, Pay Later, tickets, stock and marketing land here for the team responsible. They close by themselves when the order, ticket or product moves on.</p>
          </div>
          <Link className="ad-btn line sm" href="/admin/account">
            Notification settings
          </Link>
        </div>
        <nav className="ad-tabs" aria-label="Task lists">
          {scopes.map((s, i) => (
            <Link key={s.key} className="ad-tab" href={`/admin/tasks?view=${s.key}`} aria-current={s.key === scope ? 'true' : undefined}>
              {s.label} <span>{counts[i]}</span>
            </Link>
          ))}
        </nav>
        <form action="/admin/tasks" className="ad-filters" role="search" aria-label="Filter tasks">
          <input type="hidden" name="view" value={scope} />
          <label className="ad-field">
            Status
            <select name="status" defaultValue={status}>
              <option value="open">Open</option>
              <option value="done">Done</option>
            </select>
          </label>
          <label className="ad-field">
            Type
            <select name="kind" defaultValue={kind}>
              <option value="">All types</option>
              {TASK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {TASK_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          {scope === 'all' && (
            <label className="ad-field">
              Team
              <select name="role" defaultValue={role}>
                <option value="">All teams</option>
                {Object.entries(ROLE_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="submit" className="ad-btn line">
            Apply
          </button>
        </form>
      </section>
      <section className="ad-card">
        <div className="ad-between" style={{ marginBottom: 6 }}>
          <h2 className="ad-h">
            {status === 'open' ? 'Open' : 'Done'} · {total}
          </h2>
          {status === 'open' ? (
            <Link href={href({ status: 'done' })} style={{ fontSize: 13, fontWeight: 600 }}>
              Show done
            </Link>
          ) : (
            <Link href={href({ status: 'open' })} style={{ fontSize: 13, fontWeight: 600 }}>
              Show open
            </Link>
          )}
        </div>
        <p className="ad-sub ad-phone-only">Tip: swipe a task left to mark it done.</p>
        <TaskList tasks={items} showTeam={scope !== 'mine' || ctx.role === 'owner'} empty={status === 'open' ? 'Nothing waiting here. Nice work.' : 'No finished tasks yet.'} />
      </section>
    </div>
  );
}
