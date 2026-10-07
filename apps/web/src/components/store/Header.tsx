'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { BrandView, CategoryView, CmsView } from '@/lib/types';
import { fmt } from '@/lib/format';
import { BagIcon, CompareIcon, SearchIcon, UserIcon } from '../icons';
import { AuthModal, type SessionUser } from './AuthModal';
import { PImg } from './PImg';

export interface MegaProduct {
  id: string;
  model: string;
  name: string;
  price: number;
  img: string;
}

interface Props {
  brand: BrandView;
  cms: Pick<CmsView, 'announcement' | 'megaPromo'>;
  cats: CategoryView[];
  mega: Record<string, MegaProduct[]>;
  cartCount: number;
  compareCount: number;
  user: SessionUser | null;
  labels: { track: string; suppliers: string; support: string; signIn: string; compare: string; cart: string; deals: string; search: string; allBrands: string };
}

export function Header({ brand, cms, cats, mega, cartCount, compareCount, user, labels }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [auth, setAuth] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const path = usePathname();
  const router = useRouter();
  const b = `/${brand.key}`;

  useEffect(() => {
    setOpen(null);
  }, [path]);

  useEffect(() => {
    const openAuth = () => setAuth(true);
    window.addEventListener('bt-open-auth', openAuth);
    return () => window.removeEventListener('bt-open-auth', openAuth);
  }, []);

  // Mega menu opens on hover after 120 ms (README interactions).
  const enter = (id: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(id), 120);
  };
  const leave = () => {
    window.clearTimeout(timer.current);
    setOpen(null);
  };
  const mc = cats.find((c) => c.id === open);
  const pageOn = (seg: string) => path.startsWith(`${b}/${seg}`);
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="hdr d-only" onMouseLeave={leave}>
      <div className="ann">
        <div className="wrap">
          <div className="msg">
            <span className="dot" />
            {cms.announcement}
          </div>
          <nav aria-label="Help">
            <Link href={`${b}/track`}>{labels.track}</Link>
            <Link href={`${b}/suppliers`}>{labels.suppliers}</Link>
            <Link href={`${b}/support`}>{labels.support}</Link>
          </nav>
        </div>
      </div>
      <div className="hdr-main">
        <div className="wrap">
          <Link href="/" className="exit-pill">
            {labels.allBrands}
          </Link>
          <Link href={b} className={`hdr-logo ${brand.key}`} aria-label={`${brand.name} home`}>
            <img src={brand.logo} alt={brand.name} />
          </Link>
          <form
            className="hdr-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get('q');
              router.push(`${b}/search?q=${encodeURIComponent(String(q ?? ''))}`);
            }}
          >
            <SearchIcon />
            <label className="sr-only" htmlFor="hdr-q">
              Search
            </label>
            <input id="hdr-q" name="q" placeholder={labels.search} autoComplete="off" />
          </form>
          <div className="hdr-actions">
            <button type="button" className="hdr-btn soft" onClick={() => setAuth(true)}>
              <UserIcon />
              <span className="lbl">{user ? `Hi, ${firstName || 'there'}` : labels.signIn}</span>
            </button>
            <Link href={`${b}/compare`} className="hdr-btn outline">
              <CompareIcon />
              <span className="lbl">{labels.compare}</span>
              {compareCount > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--monthly)' }}>{compareCount}</span>}
            </Link>
            <Link href={`${b}/cart`} className="hdr-btn solid">
              <BagIcon color="#fff" />
              <span className="lbl">{labels.cart}</span>
              <span className="count" data-testid="cart-count">{cartCount}</span>
            </Link>
          </div>
        </div>
      </div>
      <nav className="hdr-cats" aria-label="Categories">
        <div className="wrap">
          {cats.map((c) => (
            <Link key={c.id} href={`${b}/c/${c.id}`} className={`navcat ${pageOn(`c/${c.id}`) ? 'on' : ''} ${open === c.id ? 'open' : ''}`} onMouseEnter={() => enter(c.id)} onFocus={() => setOpen(c.id)}>
              {c.short}
              <span className="caret">▼</span>
            </Link>
          ))}
          <span className="navsep" />
          {(
            [
              ['deals', labels.deals],
              ['suppliers', labels.suppliers],
              ['support', labels.support],
            ] as const
          ).map(([k, l]) => (
            <Link key={k} href={`${b}/${k}`} className={`navcat ${pageOn(k) ? 'on open' : ''}`} onMouseEnter={leave}>
              {l}
            </Link>
          ))}
        </div>
      </nav>
      {mc && (
        <>
          <div className="mega-scrim" onClick={leave} />
          <div className="mega" role="region" aria-label={`${mc.name} menu`}>
            <div className="wrap">
              <div className="mega-subs">
                <div className="eyebrow-muted" style={{ marginBottom: 12 }}>
                  SHOP {mc.name.toUpperCase()}
                </div>
                {mc.subs.map((s) => (
                  <Link key={s} href={`${b}/c/${mc.id}?sub=${encodeURIComponent(s)}`}>
                    {s}
                  </Link>
                ))}
                <Link href={`${b}/c/${mc.id}`} style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: 'var(--monthly)' }}>
                  View all {mc.count} →
                </Link>
              </div>
              <div>
                <div className="eyebrow-muted" style={{ marginBottom: 12 }}>
                  FEATURED
                </div>
                <div className="mega-feat">
                  {(mega[mc.id] ?? []).map((p) => (
                    <Link key={p.id} href={`${b}/p/${p.id}`} className="mega-item">
                      <PImg src={p.img} alt="" model={p.model} size="xs" style={{ height: 96 }} />
                      <div>
                        <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                          {p.model}
                        </div>
                        <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.25, marginTop: 2 }}>{p.name}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--monthly)', marginTop: 4 }}>{fmt(p.price)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <Link href={`${b}/c/${cms.megaPromo.cat}`} className="mega-promo">
                <div style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }} />
                <div className="mono" style={{ fontSize: 11, letterSpacing: '.14em', opacity: 0.75 }}>
                  {cms.megaPromo.eyebrow}
                </div>
                <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.15, marginTop: 8 }}>{cms.megaPromo.title}</div>
                <span style={{ marginTop: 16, fontSize: 14, fontWeight: 600, borderBottom: '1.5px solid #fff', alignSelf: 'flex-start' }}>{cms.megaPromo.cta} →</span>
              </Link>
            </div>
          </div>
        </>
      )}
      {auth && <AuthModal brand={brand.key} user={user} onClose={() => setAuth(false)} />}
    </div>
  );
}
