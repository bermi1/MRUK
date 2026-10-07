import Link from 'next/link';
import { staffLogoutAction } from '@/app/actions/admin';
import { NavLink, PageTitle } from '@/components/admin/NavLink';
import { TopControls } from '@/components/admin/TopControls';
import { ICON } from '@/components/admin/ui';
import { initials } from '@/lib/format';
import { adminFilters, branchOptions, navCounts } from '@/server/admin/context';
import { bankMode } from '@/server/admin/files';
import { requireStaff } from '@/server/auth';

export const dynamic = 'force-dynamic';

const TITLES: Record<string, string> = {
  '': 'Dashboard',
  orders: 'Orders',
  invoices: 'Invoices',
  advance: 'Salary Advance',
  customers: 'Customers',
  products: 'Products and photos',
  inventory: 'Inventory',
  catalog: 'Brands and categories',
  promos: 'Promotions and deals',
  cms: 'Website CMS',
  tickets: 'Support tickets',
  reports: 'Reports',
  settings: 'Settings and users',
  search: 'Search',
};

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaff();
  const f = await adminFilters(ctx);
  const [counts, branches] = await Promise.all([navCounts(ctx, f), branchOptions()]);
  const nav: { group?: string; href: string; label: string; d: string; perm: string; badge?: number }[] = [
    { group: 'SALES', href: '/admin', label: 'Dashboard', d: ICON.dash, perm: 'dashboard' },
    { href: '/admin/orders', label: 'Orders', d: ICON.orders, perm: 'orders', badge: counts.orders },
    { href: '/admin/invoices', label: 'Invoices', d: ICON.invoice, perm: 'invoices' },
    { href: '/admin/advance', label: 'Salary Advance', d: ICON.adv, perm: 'advance', badge: counts.advances },
    { href: '/admin/customers', label: 'Customers', d: ICON.cust, perm: 'customers' },
    { group: 'CATALOGUE', href: '/admin/products', label: 'Products and photos', d: ICON.prod, perm: 'products' },
    { href: '/admin/inventory', label: 'Inventory', d: ICON.inv, perm: 'inventory', badge: counts.lowStock },
    { href: '/admin/catalog', label: 'Brands and categories', d: ICON.cat, perm: 'catalog' },
    { group: 'MARKETING', href: '/admin/promos', label: 'Promotions and deals', d: ICON.promo, perm: 'promos' },
    { href: '/admin/cms', label: 'Website CMS', d: ICON.cms, perm: 'cms' },
    { group: 'SYSTEM', href: '/admin/tickets', label: 'Support tickets', d: ICON.tk, perm: 'tickets', badge: counts.tickets },
    { href: '/admin/reports', label: 'Reports', d: ICON.rep, perm: 'reports' },
    { href: '/admin/settings', label: 'Settings and users', d: ICON.set, perm: 'settings' },
  ];
  const visible = nav.filter((n) => ctx.can(n.perm));
  // Keep group headings when the first item of a group is hidden.
  let lastGroup = '';
  const groupOf = (i: number) => {
    for (let k = nav.indexOf(visible[i]!); k >= 0; k--) if (nav[k]!.group) return nav[k]!.group!;
    return '';
  };
  const mode = bankMode();
  return (
    <div className="ad-shell">
      <aside className="ad-side" aria-label="Admin navigation">
        <Link href="/admin" className="ad-brand">
          <span className="logo">
            <img src="/brand/mruk.png" alt="Mr UK" />
          </span>
          <span>
            <b>Commerce OS</b>
            <small>Mr UK and Skywood</small>
          </span>
        </Link>
        <nav>
          {visible.map((n, i) => {
            const g = groupOf(i);
            const head = g !== lastGroup ? g : '';
            lastGroup = g;
            return (
              <div key={n.href}>
                {head && <div className="ad-grp">{head}</div>}
                <NavLink href={n.href} label={n.label} d={n.d} badge={n.badge} />
              </div>
            );
          })}
        </nav>
        <div className="ad-spacer" />
        <div className="ad-bank">
          <span className="ic">
            <img src="/brand/azania-mark.png" alt="" />
          </span>
          <span>
            <b>Azania Bank link</b>
            <small>● Connected · {mode === 'mock' ? 'mock' : 'live'}</small>
          </span>
        </div>
        <div className="ad-user">
          <span className="av" aria-hidden="true">
            {initials(ctx.name)}
          </span>
          <span style={{ minWidth: 0 }}>
            <b>{ctx.name}</b>
            <small>{ctx.roleName}</small>
          </span>
          <form action={staffLogoutAction}>
            <button type="submit" className="ad-signout">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="ad-main">
        <header className="ad-top">
          <PageTitle titles={TITLES} />
          <form action="/admin/search" className="ad-search" role="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8A8EA3" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input name="q" type="search" placeholder="Search orders, SKUs, customers, invoices" aria-label="Search orders, products, customers and invoices" maxLength={80} />
          </form>
          <TopControls brand={f.brand} brands={f.allowed} branch={f.branch ?? 'all'} branches={branches} />
        </header>
        <main className="ad-body" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
