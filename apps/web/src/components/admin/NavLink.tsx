'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLink({ href, label, d, badge }: { href: string; label: string; d: string; badge?: number }) {
  const path = usePathname();
  const on = href === '/admin' ? path === '/admin' : path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} className="ad-nav" aria-current={on ? 'page' : undefined}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
        <path d={d} />
      </svg>
      <span className="l">{label}</span>
      {badge ? (
        <span className="ad-badge" aria-label={`${badge} need attention`}>
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}

export function PageTitle({ titles }: { titles: Record<string, string> }) {
  const path = usePathname();
  const seg = path.split('/')[2] ?? '';
  return <h1 className="ad-title">{titles[seg] ?? 'Dashboard'}</h1>;
}
