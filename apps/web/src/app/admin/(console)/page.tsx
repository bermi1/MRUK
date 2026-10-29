import Link from 'next/link';
import { dashboardSections, greeting } from '@bt/core';
import { TaskList } from '@/components/admin/TaskList';
import { Forbidden } from '@/components/admin/ui';
import { adminFilters } from '@/server/admin/context';
import { loadTasks } from '@/server/admin/taskview';
import { requireStaff, type StaffContext } from '@/server/auth';
import { maybeSweep } from '@/server/task-sweep';
import { Overview } from './_dashboard/Overview';
import { CatalogueWidgets, FinanceWidgets, MarketingWidgets, SupportWidgets, TeamsWidget, WarehouseWidgets } from './_dashboard/RoleWidgets';

export const metadata = { title: 'Dashboard' };

const brandText = (b: string[]) => (b.includes('*') ? 'Mr UK and Skywood' : b.map((x) => (x === 'mruk' ? 'Mr UK' : 'Skywood')).join(' and ') || 'No brand');

/** Shortcuts for the work each permission allows (first six that apply). */
function quickActions(ctx: StaffContext): { href: string; label: string }[] {
  const all: [string, string, string][] = [
    ['orders.write', '/admin/orders?status=approved', 'Orders to pack'],
    ['inventory', '/admin/inventory?show=low', 'Low stock'],
    ['advance.write', '/admin/advance', 'Pay Later queue'],
    ['invoices', '/admin/invoices?status=issued', 'Unpaid invoices'],
    ['tickets', '/admin/tickets?status=new', 'New tickets'],
    ['customers', '/admin/customers', 'Find a customer'],
    ['products.write', '/admin/products', 'Products and photos'],
    ['cms.write', '/admin/cms', 'Edit the website'],
    ['promos.write', '/admin/promos', 'Promotions'],
    ['marketing.write', '/admin/marketing/new', 'New campaign'],
    ['reports', '/admin/reports', 'Reports'],
  ];
  return all.filter(([p]) => ctx.can(p)).slice(0, 6).map(([, href, label]) => ({ href, label }));
}

export default async function Dashboard() {
  const ctx = await requireStaff();
  if (!ctx.can('dashboard')) return <Forbidden what="the dashboard" />;
  await maybeSweep();
  const f = await adminFilters(ctx);
  const { sections } = dashboardSections(ctx.permissions);
  const has = (s: (typeof sections)[number]) => sections.includes(s);
  const tasks = await loadTasks(ctx, f.brands, 'mine', { take: 6 });
  const first = ctx.name.split(' ')[0] ?? ctx.name;

  return (
    <div className="ad-stack" data-role={ctx.role}>
      <section className="ad-card ad-hello" data-testid="dash-hello">
        <div>
          <h2 className="ad-hello-h">
            {greeting()}, {first}
          </h2>
          <p className="ad-sub">
            {ctx.roleName} · {brandText(f.brands)}
            {f.branch ? ` · ${f.branch}` : ''} · {tasks.total ? `${tasks.total} open task${tasks.total === 1 ? '' : 's'} for you` : 'nothing waiting for you'}
          </p>
        </div>
        <nav className="ad-quick" aria-label="Quick actions">
          {quickActions(ctx).map((a) => (
            <Link key={a.href} href={a.href} className="ad-btn line sm">
              {a.label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="ad-card" data-testid="dash-tasks">
        <div className="ad-between">
          <div>
            <h2 className="ad-h">My tasks</h2>
            <p className="ad-sub">Routed to you or your team · most urgent first</p>
          </div>
          <Link href="/admin/tasks" className="ad-wlink">
            {tasks.total > tasks.items.length ? `All ${tasks.total} tasks` : 'Task list'}
          </Link>
        </div>
        <TaskList tasks={tasks.items} showTeam={ctx.role === 'owner'} grid />
      </section>

      {has('teams') && <TeamsWidget f={f} />}
      {has('overview') && <Overview ctx={ctx} f={f} />}
      {has('finance') && <FinanceWidgets f={f} />}
      {has('warehouse') && <WarehouseWidgets f={f} />}
      {has('support') && <SupportWidgets ctx={ctx} f={f} />}
      {has('catalogue') && <CatalogueWidgets f={f} />}
      {has('marketing') && <MarketingWidgets f={f} />}
    </div>
  );
}
