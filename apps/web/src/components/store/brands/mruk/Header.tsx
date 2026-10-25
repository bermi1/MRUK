'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { fmt } from '@/lib/format';
import { BagIcon, CompareIcon, SearchIcon, UserIcon } from '../../../icons';
import { CatGlyph, glyphKind } from '../../CatGlyph';
import { PImg } from '../../PImg';
import { SafeImg } from '../../SafeImg';
import { fill, useAuthModal, useMegaMenu, useScrolled, type HeaderProps } from '../shared';

const Caret = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Mr UK header: utility bar → main bar (all-categories, logo, prominent search, account,
 * compare, cart) → category bar. Full-width mega menu with category tiles, sub-categories,
 * featured products and the CMS promo. The utility bar scrolls away; the rest stays pinned.
 */
export function MrukHeader({ brand, cms, cats, mega, cartCount, compareCount, user, labels }: HeaderProps) {
  const m = useMegaMenu();
  const { openAuth, modal } = useAuthModal(brand, user);
  const scrolled = useScrolled(40);
  const path = usePathname();
  const router = useRouter();
  const b = `/${brand.key}`;
  const mc = cats.find((c) => c.id === m.open);
  const promoCat = cats.find((c) => c.id === cms.megaPromo.cat);
  const on = (seg: string) => path.startsWith(`${b}/${seg}`);
  const firstName = user?.name?.split(' ')[0];
  const promo = (
      <Link href={`${b}/c/${cms.megaPromo.cat}`} className="mu-promo">
        <span className="mu-promo-art" aria-hidden="true">
          <CatGlyph kind={glyphKind(promoCat?.id ?? '', promoCat?.name)} className="mu-promo-glyph" strokeWidth={1.1} />
          {promoCat?.img && <SafeImg src={promoCat.img} alt="" />}
        </span>
        <span className="mu-promo-eyebrow">{cms.megaPromo.eyebrow}</span>
        <span className="mu-promo-title">{cms.megaPromo.title}</span>
        <span className="mu-promo-cta">
          {cms.megaPromo.cta} <span aria-hidden="true">→</span>
        </span>
      </Link>
  );

  return (
    <header className={`mu-hdr d-only ${scrolled ? 'is-scrolled' : ''} ${m.open ? 'is-open' : ''}`} onMouseLeave={m.leave} onMouseEnter={m.keep}>
      <div className="mu-util">
        <div className="wrap">
          <p className="mu-ann">
            <span className="mu-ann-dot" aria-hidden="true" />
            {cms.announcement}
          </p>
          <nav aria-label={labels.helpAndServices}>
            <Link href={`${b}/track`}>{labels.track}</Link>
            <Link href={`${b}/suppliers`}>{labels.suppliers}</Link>
            <Link href={`${b}/support`}>{labels.support}</Link>
            <Link href="/" className="mu-util-brands">
              {labels.allBrands}
            </Link>
          </nav>
        </div>
      </div>

      <div className="mu-main">
        <div className="wrap">
          <button type="button" ref={m.ref('all')} className={`mu-allcats ${m.open === 'all' ? 'on' : ''}`} aria-expanded={m.open === 'all'} aria-controls="mu-mega" onClick={() => m.toggle('all')}>
            <span className="mu-burger" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            {labels.allCategories}
          </button>
          <Link href={b} className="mu-logo" aria-label={`${brand.name} home`}>
            <img src={brand.logo} alt={brand.name} width={150} height={44} />
          </Link>
          <form
            className="mu-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get('q');
              router.push(`${b}/search?q=${encodeURIComponent(String(q ?? ''))}`);
            }}
          >
            <label className="sr-only" htmlFor="mu-q">
              {labels.searchShort}
            </label>
            <input id="mu-q" name="q" placeholder={labels.search} autoComplete="off" />
            <button type="submit" aria-label={labels.searchShort}>
              <SearchIcon size={18} color="#fff" />
            </button>
          </form>
          <div className="mu-actions">
            <button type="button" className="mu-act" onClick={openAuth}>
              <UserIcon size={20} />
              <span>
                <small>{user ? `Hi, ${firstName || 'there'}` : labels.signIn}</small>
                {labels.account}
              </span>
            </button>
            <Link href={`${b}/compare`} className="mu-act">
              <CompareIcon size={20} />
              <span>
                <small>{compareCount > 0 ? compareCount : '—'}</small>
                {labels.compare}
              </span>
            </Link>
            <Link href={`${b}/cart`} className="mu-cart">
              <BagIcon size={20} color="#fff" />
              <span>{labels.cart}</span>
              <span className="mu-count" data-testid="cart-count">
                {cartCount}
              </span>
            </Link>
          </div>
        </div>
      </div>

      <nav className="mu-nav" aria-label="Categories">
        <div className="wrap">
          <ul>
            {cats.map((c) => (
              <li key={c.id} className={`${m.open === c.id ? 'open' : ''} ${on(`c/${c.id}`) ? 'on' : ''}`} onMouseEnter={() => m.hover(c.id)}>
                <Link href={`${b}/c/${c.id}`}>{c.short}</Link>
                <button type="button" ref={m.ref(c.id)} aria-expanded={m.open === c.id} aria-controls="mu-mega" aria-label={`${c.name}: ${labels.featured}`} onClick={() => m.toggle(c.id)}>
                  <Caret />
                </button>
              </li>
            ))}
          </ul>
          <div className="mu-nav-end" onMouseEnter={m.leave}>
            <Link href={`${b}/deals`} className={`mu-deals ${on('deals') ? 'on' : ''}`}>
              <span aria-hidden="true">%</span>
              {labels.deals}
            </Link>
            <Link href={`${b}/suppliers`} className={on('suppliers') ? 'on' : ''}>
              {labels.suppliers}
            </Link>
          </div>
        </div>
      </nav>

      {m.open && (
        <>
          <div className="mu-scrim" onClick={() => m.close()} aria-hidden="true" />
          <div id="mu-mega" className="mu-mega" role="region" aria-label={mc ? mc.name : labels.allCategories} onMouseEnter={m.keep}>
            <div className="wrap">
              {m.open === 'all' || !mc ? (
                <div className="mu-mega-all">
                  <div className="mu-tiles">
                    {cats.map((c, i) => (
                      <Link key={c.id} href={`${b}/c/${c.id}`} className="mu-tile" style={{ ['--i' as string]: i }}>
                        <span className="mu-tile-art">
                          <CatGlyph kind={glyphKind(c.id, c.name)} className="mu-tile-glyph" />
                          {c.img && <SafeImg src={c.img} alt="" />}
                        </span>
                        <span className="mu-tile-name">{c.name}</span>
                        <span className="mu-tile-count">{fill(labels.productsN, { n: c.count })}</span>
                      </Link>
                    ))}
                  </div>
                  {promo}
                </div>
              ) : (
                <div className="mu-mega-cat">
                  <div className="mu-mega-subs">
                    <p className="mu-kicker">{mc.name}</p>
                    <ul>
                      {mc.subs.map((s, i) => (
                        <li key={s} style={{ ['--i' as string]: i }}>
                          <Link href={`${b}/c/${mc.id}?sub=${encodeURIComponent(s)}`}>{s}</Link>
                        </li>
                      ))}
                    </ul>
                    <Link href={`${b}/c/${mc.id}`} className="mu-viewall">
                      {fill(labels.viewAllN, { n: mc.count })} <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                  <div>
                    <p className="mu-kicker">{labels.featured}</p>
                    <div className="mu-feat">
                      {(mega[mc.id] ?? []).map((p, i) => (
                        <Link key={p.id} href={`${b}/p/${p.id}`} className="mu-feat-item" style={{ ['--i' as string]: i }}>
                          <PImg src={p.img} alt="" model={p.model} sub={p.sub} size="sm" />
                          <span className="mu-feat-model">{p.model}</span>
                          <span className="mu-feat-name">{p.name}</span>
                          <span className="mu-feat-price">{fmt(p.price)}</span>
                          <span className="mu-feat-mo">{fill(labels.perMonth, { amount: fmt(p.price / 12) })}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  {promo}
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {modal}
    </header>
  );
}
