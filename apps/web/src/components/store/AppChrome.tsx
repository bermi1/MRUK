'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BagIcon, GridIcon, HomeIcon, SearchIcon, UserIcon } from '../icons';

/** Phone header (<768px): menu drawer, logo, search. Everything else lives in the drawer. */
export function AppBar({ brand, brandName, menu, searchLabel }: { brand: 'mruk' | 'skywood'; brandName: string; menu?: React.ReactNode; searchLabel: string }) {
  const sky = brand === 'skywood';
  return (
    <header className={`appbar appbar-${brand} m-only`}>
      {menu}
      <Link href={`/${brand}`} className="appbar-logo" aria-label={`${brandName} home`}>
        <img src={sky ? '/brand/skywood.png' : '/brand/mruk.png'} alt={brandName} width={sky ? 98 : 41} height={28} />
      </Link>
      <Link href={`/${brand}/search`} className="appbar-search" aria-label={searchLabel}>
        <SearchIcon size={20} color="currentColor" />
      </Link>
    </header>
  );
}

/** Phone bottom bar: exactly four destinations (Home, Shop, Cart, Account). */
export function TabBar({ brand, cartCount, labels }: { brand: string; cartCount: number; labels: { home: string; shop: string; cart: string; account: string } }) {
  const path = usePathname();
  const b = `/${brand}`;
  const on = (...ps: string[]) => ps.some((p) => (p === b ? path === b : path.startsWith(p)));
  const tab = (active: boolean) => (active ? { className: 'on', 'aria-current': 'page' as const } : {});
  return (
    <nav className="tabbar m-only" aria-label="App">
      <Link href={b} {...tab(on(b))}>
        <HomeIcon />
        <span>{labels.home}</span>
      </Link>
      <Link href={`${b}/shop`} {...tab(on(`${b}/shop`, `${b}/c/`, `${b}/p/`, `${b}/search`))}>
        <GridIcon />
        <span>{labels.shop}</span>
      </Link>
      <Link href={`${b}/cart`} {...tab(on(`${b}/cart`, `${b}/checkout`))} aria-label={`${labels.cart} (${cartCount})`}>
        <span className="tab-ico">
          <BagIcon size={22} />
          {cartCount > 0 && (
            <span className="tab-badge" key={cartCount}>
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </span>
        <span>{labels.cart}</span>
      </Link>
      <Link href={`${b}/account`} {...tab(on(`${b}/account`, `${b}/signup`))}>
        <UserIcon size={22} />
        <span>{labels.account}</span>
      </Link>
    </nav>
  );
}
