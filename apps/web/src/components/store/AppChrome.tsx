'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BagIcon, GridIcon, HomeIcon, SearchIcon, TagIcon, UserIcon } from '../icons';

/** Phone chrome (<768px): brand switch on top, bottom bar with a raised centre cart. */
export function AppBar({ brand }: { brand: string }) {
  const path = usePathname();
  const rest = path.replace(/^\/(mruk|skywood)/, '');
  // Keep the user on the same kind of page when switching brand (product/cart pages are brand-specific).
  const keep = /^\/(deals|suppliers|support|track|compare|account)?$/.test(rest) ? rest : '';
  return (
    <header className="appbar m-flex m-only">
      <nav className="brand-switch" aria-label="Brand">
        <Link href={`/mruk${keep}`} className={brand === 'mruk' ? 'on' : ''}>
          Mr UK
        </Link>
        <Link href={`/skywood${keep}`} className={brand === 'skywood' ? 'on' : ''}>
          Skywood
        </Link>
      </nav>
      <Link href={`/${brand}/search`} className="icon-btn" style={{ background: 'var(--surface)' }} aria-label="Search">
        <SearchIcon size={18} color="#12152B" />
      </Link>
    </header>
  );
}

export function TabBar({ brand, cartCount, labels }: { brand: string; cartCount: number; labels: { home: string; shop: string; cart: string; deals: string; account: string } }) {
  const path = usePathname();
  const b = `/${brand}`;
  const on = (p: string) => (p === b ? path === b : path.startsWith(p));
  return (
    <nav className="tabbar m-only" style={{ display: undefined }} aria-label="App">
      <Link href={b} className={on(b) ? 'on' : ''}>
        <HomeIcon />
        {labels.home}
      </Link>
      <Link href={`${b}/c/all`} className={on(`${b}/c`) || on(`${b}/p`) ? 'on' : ''}>
        <GridIcon />
        {labels.shop}
      </Link>
      <Link href={`${b}/cart`} aria-label={`${labels.cart} (${cartCount})`}>
        <span className="cart-fab">
          <BagIcon size={24} color="#fff" />
          <span className="count">{cartCount}</span>
        </span>
      </Link>
      <Link href={`${b}/deals`} className={on(`${b}/deals`) ? 'on' : ''}>
        <TagIcon />
        {labels.deals}
      </Link>
      <Link href={`${b}/account`} className={on(`${b}/account`) ? 'on' : ''}>
        <UserIcon size={22} />
        {labels.account}
      </Link>
    </nav>
  );
}
