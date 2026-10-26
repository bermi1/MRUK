'use client';
import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { fmt } from '@/lib/format';
import { CatGlyph, glyphKind } from '../../CatGlyph';
import { PImg } from '../../PImg';
import { SafeImg } from '../../SafeImg';
import { PayLaterMenu } from '../PayLaterMenu';
import { fill, useAuthModal, useMegaMenu, useOverlay, useScrolled, type HeaderProps } from '../shared';

/**
 * Skywood header: two quiet rows. Row one: menu and search (left), centred logo, account /
 * compare / bag (right). Row two: every collection plus Pay Later and Deals, always visible,
 * each with a calm dropdown (sub-categories, two pieces, one image). Transparent over the home
 * hero, ivory once the page scrolls. "Menu" opens a full-height index of the collections.
 */
export function SkywoodHeader({ brand, cms, cats, mega, cartCount, compareCount, user, labels }: HeaderProps) {
  const m = useMegaMenu();
  const { openAuth, modal } = useAuthModal(brand, user);
  const scrolled = useScrolled(24);
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const b = `/${brand.key}`;
  const home = path === b;
  const over = home && !scrolled && !m.open && !search;
  const mc = cats.find((c) => c.id === m.open);
  const firstName = user?.name?.split(' ')[0];
  const disc = (id: string, label: string) => (
    <button type="button" ref={m.ref(id)} className="sw-disc" aria-expanded={m.open === id} aria-controls="sw-panel" aria-label={label} onClick={() => m.toggle(id)}>
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
        <path d="M1.5 3l2.5 2.5L6.5 3" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </button>
  );

  return (
    <>
      <div className="sw-ann d-only">
        <p>{cms.announcement}</p>
      </div>
      <header className={`sw-hdr d-only ${over ? 'is-over' : ''} ${scrolled ? 'is-scrolled' : ''}`} onMouseLeave={m.leave} onMouseEnter={m.keep}>
        <div className="sw-hdr-in">
          <div className="sw-left">
            <button type="button" className="sw-menu-btn" onClick={() => setMenu(true)} aria-expanded={menu} aria-controls="sw-index">
              <span className="sw-lines" aria-hidden="true">
                <i />
                <i />
              </span>
              {labels.menu}
            </button>
            <button type="button" className="sw-icon" onClick={() => setSearch((x) => !x)} aria-expanded={search} aria-controls="sw-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M20 20l-4-4" />
              </svg>
              <span className="sw-icon-l">{labels.searchShort}</span>
            </button>
          </div>
          <Link href={b} className="sw-logo" aria-label={`${brand.name} home`}>
            <img src={brand.logo} alt={brand.name} width={104} height={30} />
          </Link>
          <div className="sw-right">
            <button type="button" className="sw-icon" onClick={openAuth}>
              <span className="sw-icon-l">{user ? firstName || labels.account : labels.signIn}</span>
            </button>
            <Link href={`${b}/compare`} className="sw-icon sw-hide-md">
              <span className="sw-icon-l">
                {labels.compare}
                {compareCount > 0 ? ` (${compareCount})` : ''}
              </span>
            </Link>
            <Link href={`${b}/cart`} className="sw-bag">
              {labels.cart}
              <span className="sw-count" data-testid="cart-count" key={cartCount}>
                {cartCount}
              </span>
            </Link>
          </div>
        </div>
        <nav className="sw-cats" aria-label="Categories">
          <ul>
            {cats.map((c) => (
              <li key={c.id} className={m.open === c.id ? 'open' : ''} onMouseEnter={() => m.hover(c.id)}>
                <Link href={`${b}/c/${c.id}`} className={path.startsWith(`${b}/c/${c.id}`) ? 'on' : ''}>
                  {c.short}
                </Link>
                {disc(c.id, `${c.name}: ${labels.featured}`)}
              </li>
            ))}
            <li className="sw-cats-sep" aria-hidden="true" />
            <li className={`sw-cats-pl ${m.open === 'paylater' ? 'open' : ''}`} onMouseEnter={() => m.hover('paylater')}>
              <Link href={`${b}/pay-later`} className={path.startsWith(`${b}/pay-later`) ? 'on' : ''}>
                {labels.payLater}
              </Link>
              {disc('paylater', labels.payLaterHow)}
            </li>
            <li onMouseEnter={m.leave}>
              <Link href={`${b}/deals`} className={path.startsWith(`${b}/deals`) ? 'on' : ''}>
                {labels.deals}
              </Link>
            </li>
          </ul>
        </nav>

        {search && (
          <div id="sw-search" className="sw-search">
            <form
              className="wrap"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get('q');
                setSearch(false);
                router.push(`${b}/search?q=${encodeURIComponent(String(q ?? ''))}`);
              }}
            >
              <label className="sr-only" htmlFor="sw-q">
                {labels.searchShort}
              </label>
              <input id="sw-q" name="q" placeholder={labels.search} autoComplete="off" autoFocus onKeyDown={(e) => e.key === 'Escape' && setSearch(false)} />
              <button type="submit" className="sw-search-go">
                {labels.searchShort} <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>
        )}

        {m.open && (
          <>
            <div className="sw-scrim" onClick={() => m.close()} aria-hidden="true" />
            <div id="sw-panel" className="sw-panel" role="region" aria-label={mc ? mc.name : labels.payLater} onMouseEnter={m.keep}>
              {m.open === 'paylater' ? (
                <div className="wrap">
                  <PayLaterMenu brand={brand.key} labels={labels} className="sw-plm" />
                </div>
              ) : (
                mc && (
                  <div className="wrap sw-panel-in">
                    <div className="sw-panel-subs">
                      <p className="sw-eyebrow">{fill(labels.productsN, { n: mc.count })}</p>
                      <p className="sw-panel-title">{mc.name}</p>
                      <ul>
                        {mc.subs.map((x, i) => (
                          <li key={x} style={{ ['--i' as string]: i }}>
                            <Link href={`${b}/c/${mc.id}?sub=${encodeURIComponent(x)}`}>{x}</Link>
                          </li>
                        ))}
                      </ul>
                      <Link href={`${b}/c/${mc.id}`} className="sw-link">
                        {fill(labels.viewAllN, { n: mc.count })}
                      </Link>
                    </div>
                    <div className="sw-panel-feat">
                      {(mega[mc.id] ?? []).slice(0, 2).map((p, i) => (
                        <Link key={p.id} href={`${b}/p/${p.id}`} className="sw-panel-item" style={{ ['--i' as string]: i }}>
                          <PImg src={p.img} alt="" model={p.model} sub={p.sub} size="md" />
                          <span className="sw-panel-name">{p.name}</span>
                          <span className="sw-panel-price">
                            {fmt(p.price)} <em>· {fill(labels.perMonth, { amount: fmt(p.price / 12) })}</em>
                          </span>
                        </Link>
                      ))}
                    </div>
                    <Link href={`${b}/c/${mc.id}`} className="sw-panel-hero">
                      <span className="sw-panel-art" aria-hidden="true">
                        <CatGlyph kind={glyphKind(mc.id, mc.name)} className="sw-panel-glyph" strokeWidth={0.8} />
                        {mc.img && <SafeImg src={mc.img} alt="" />}
                      </span>
                      <span className="sw-panel-cap">
                        {cms.megaPromo.cat === mc.id ? (
                          <>
                            <span className="sw-eyebrow light">{cms.megaPromo.eyebrow}</span>
                            <span className="sw-panel-cap-t">{cms.megaPromo.title}</span>
                            <span className="sw-link light">{cms.megaPromo.cta}</span>
                          </>
                        ) : (
                          <>
                            <span className="sw-panel-cap-t">{mc.name}</span>
                            <span className="sw-link light">{fill(labels.viewAllN, { n: mc.count })}</span>
                          </>
                        )}
                      </span>
                    </Link>
                  </div>
                )
              )}
            </div>
          </>
        )}
        {modal}
      </header>
      {menu && <SkywoodIndex {...{ brand, cats, labels, cms }} onClose={() => setMenu(false)} />}
    </>
  );
}

/** Full-height collection index (desktop "Menu"). */
function SkywoodIndex({
  brand,
  cats,
  labels,
  cms,
  onClose,
}: Pick<HeaderProps, 'brand' | 'cats' | 'labels' | 'cms'> & {
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [hot, setHot] = useState(cats[0]?.id ?? '');
  const close = useCallback(() => onClose(), [onClose]);
  useOverlay(true, close, panel);
  const b = `/${brand.key}`;
  const h = cats.find((c) => c.id === hot) ?? cats[0];
  return (
    <div className="sw-index" id="sw-index" role="dialog" aria-modal="true" aria-label={labels.menu} ref={panel}>
      <div className="sw-index-top wrap">
        <button type="button" className="sw-index-close" onClick={close} data-autofocus>
          {labels.close} <span aria-hidden="true">×</span>
        </button>
        <img src="/brand/skywood-white.png" alt={brand.name} width={98} height={28} />
        <Link href="/" className="sw-index-brands">
          {labels.allBrands}
        </Link>
      </div>
      <div className="sw-index-body wrap">
        <ol className="sw-index-list">
          {cats.map((c, i) => (
            <li key={c.id} style={{ ['--i' as string]: i }}>
              <Link href={`${b}/c/${c.id}`} onMouseEnter={() => setHot(c.id)} onFocus={() => setHot(c.id)} className={hot === c.id ? 'on' : ''}>
                <span className="sw-index-n">{String(i + 1).padStart(2, '0')}</span>
                {c.name}
              </Link>
            </li>
          ))}
        </ol>
        {h && (
          <div className="sw-index-preview" key={h.id} aria-hidden="true">
            <span className="sw-index-art">
              <CatGlyph kind={glyphKind(h.id, h.name)} className="sw-index-glyph" strokeWidth={0.7} />
              {h.img && <SafeImg src={h.img} alt="" />}
            </span>
            <span className="sw-index-subs">{h.subs.join(' · ')}</span>
          </div>
        )}
      </div>
      <div className="sw-index-foot wrap">
        <Link href={`${b}/deals`}>{labels.deals}</Link>
        <Link href={`${b}/track`}>{labels.track}</Link>
        <Link href={`${b}/suppliers`}>{labels.suppliers}</Link>
        <Link href={`${b}/support`}>{labels.support}</Link>
        <span className="sw-index-ann">{cms.announcement}</span>
      </div>
    </div>
  );
}
