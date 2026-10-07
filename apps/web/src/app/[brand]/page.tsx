import Link from 'next/link';
import { AddButton } from '@/components/store/CartButtons';
import { HeroCarousel } from '@/components/store/HeroCarousel';
import { NewArrivals } from '@/components/store/NewArrivals';
import { PImg } from '@/components/store/PImg';
import { CATEGORY_BLURB, REVIEWS } from '@/lib/content';
import { fmt, initials, stockLabel } from '@/lib/format';
import type { BrandKey } from '@/lib/types';
import { getCompareIds } from '@/server/cart';
import { getBrand, getBundles, getCategories, getCms, getProducts, getSuppliers } from '@/server/catalog';
import { getT } from '@/server/locale';

function SecHead({ pill, title, sub, action }: { pill: string; title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="sec-head">
      <div style={{ maxWidth: 660 }}>
        <div className="pill">
          <span className="dot" />
          {pill}
        </div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      {action}
    </div>
  );
}

export default async function BrandHome({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [brand, cms, cats, products, bundles, suppliers, cmp, t] = await Promise.all([getBrand(key), getCms(key), getCategories(key), getProducts(key), getBundles(key), getSuppliers(key), getCompareIds(key), getT()]);
  const b = `/${key}`;
  const byId = (id: string) => products.find((p) => p.id === id);
  const slides = cms.hero
    .map((h) => {
      const p = byId(h.pid) ?? products[0];
      if (!p) return null;
      return { eyebrow: h.eyebrow, title: h.title, sub: h.sub, img: h.img || p.img || cats.find((c) => c.id === p.cat)?.img || '', href: `${b}/p/${p.id}`, price: p.price };
    })
    .filter((s): s is NonNullable<typeof s> => !!s);
  const withImg = products.filter((p) => p.img);
  const spot = withImg[1] ?? products[0];
  const newArrivals = [...products].reverse().slice(0, 8);
  const picks = withImg.slice(0, 4);
  const deal = bundles[0];
  const cities = [...new Set(suppliers.map((s) => s.city))];

  return (
    <div className="wrap" style={{ paddingTop: 20 }}>
      <HeroCarousel slides={slides} dealsHref={`${b}/deals`} labels={{ shopNow: t('shopNow'), seeDeals: t('seeDeals'), perMonth: t('orPerMonth') }} />

      <SecHead pill="SHOP BY CATEGORY" title={`Explore ${brand.name}`} sub={CATEGORY_BLURB[key]} action={<Link href={`${b}/c/all`} className="btn btn-outline btn-sm d-only">{t('viewAll')}</Link>} />
      <div className="grid-3" style={{ marginTop: 24 }}>
        {cats.map((c) => (
          <Link key={c.id} href={`${b}/c/${c.id}`} className="catcard shade-b">
            {c.img && <img src={c.img} alt="" loading="lazy" />}
            <div className="info">
              <div>
                <div className="t">{c.name}</div>
                <div className="s">Explore {c.count} products</div>
              </div>
              <span className="arrow-glass">→</span>
            </div>
          </Link>
        ))}
      </div>

      <NewArrivals items={newArrivals} brand={key} compare={cmp} pill="JUST LANDED" title="New this season" sub={`The latest ${brand.name} arrivals, updated every week.`} />

      {spot && (
        <Link href={`${b}/p/${spot.id}`} className="spot" style={{ marginTop: 64, display: 'grid', gridTemplateColumns: '1.2fr 1fr', borderRadius: 30, overflow: 'hidden', background: 'var(--surface)', minHeight: 420 }}>
          <div style={{ position: 'relative', minHeight: 200 }}>
            <PImg src={spot.img} alt={spot.name} model={spot.model} size="lg" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
            <span className="badge" style={{ position: 'absolute', left: 22, top: 22, background: 'var(--az)', color: '#fff', fontWeight: 600 }}>
              Spotlight
            </span>
          </div>
          <div className="spot-copy" style={{ padding: 48, display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>
            <div className="eyebrow-muted" style={{ fontSize: 12 }}>
              {spot.model}
            </div>
            <h2 style={{ margin: 0, fontSize: 'clamp(22px, 3vw, 40px)', fontWeight: 600, letterSpacing: '-.025em', lineHeight: 1.05 }}>{spot.name}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              {spot.features.map((f) => (
                <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 15 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--p)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                  {f}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28, fontWeight: 600 }}>{fmt(spot.price)}</span>
              <span className="monthly" style={{ fontSize: 14, fontWeight: 500 }}>
                {fmt(spot.price / 12)}/mo with Salary Advance
              </span>
            </div>
            <span className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 6 }}>
              View product
            </span>
          </div>
        </Link>
      )}

      <SecHead pill="CUSTOMER FAVOURITES" title="Customers love these" sub="Our best-rated products, chosen by thousands of Tanzanian homes." action={<Link href={`${b}/c/all`} className="link-u d-only">Shop bestsellers</Link>} />
      <div className="grid-2" style={{ marginTop: 26 }}>
        {picks.map((p) => (
          <Link key={p.id} href={`${b}/p/${p.id}`} className="lrow">
            <PImg src={p.img} alt="" model={p.model} size="md" className="lrow-img" style={{ aspectRatio: '1', height: 'auto' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#B7791F', fontWeight: 600 }}>
                ★★★★★ <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{p.rating.toFixed(1)} · {p.reviews} reviews</span>
              </div>
              <div style={{ fontSize: 'clamp(14px, 1.4vw, 18px)', fontWeight: 600, marginTop: 4 }}>{p.name}</div>
              <div className="d-only" style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 6 }}>{p.features.join(' · ')}</div>
              <div style={{ fontSize: 12.5, color: p.stock <= 5 ? 'var(--warn)' : 'var(--ok)', marginTop: 6, fontWeight: 500 }}>{stockLabel(p.stock)}</div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <div className="d-only" style={{ fontSize: 18, fontWeight: 600 }}>{fmt(p.price)}</div>
              <div className="monthly" style={{ fontSize: 12 }}>
                {fmt(p.price / 12)}/mo
              </div>
              <AddButton brand={key} id={p.id} name={p.name} className="plus p" />
            </div>
          </Link>
        ))}
      </div>

      <SecHead
        pill="REVIEWS"
        title="What our customers say"
        sub="Real feedback from verified buyers across Tanzania."
        action={
          <div className="d-only" style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 'none', borderRadius: 20, background: 'var(--surface)', padding: '14px 20px' }}>
            <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-.02em' }}>4.8</span>
            <div>
              <div style={{ color: '#B7791F', fontSize: 15, letterSpacing: 2 }}>★★★★★</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted2)' }}>1,200+ verified reviews</div>
            </div>
          </div>
        }
      />
      <div className="grid-3 reviews nsb" style={{ marginTop: 26 }}>
        {REVIEWS[key].map((r, i) => {
          const dark = i === 1;
          return (
            <figure key={r.name} style={{ margin: 0, borderRadius: 26, background: dark ? 'var(--p)' : 'var(--surface)', color: dark ? '#fff' : 'var(--text)', padding: 26, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 260 }}>
              <div aria-hidden="true" style={{ fontSize: 44, lineHeight: 0.6, fontFamily: 'Georgia, serif', opacity: 0.35 }}>
                “
              </div>
              <blockquote style={{ margin: 0, fontSize: 16.5, lineHeight: 1.55, flex: 1 }}>{r.q}</blockquote>
              <figcaption style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 14, borderTop: `1px solid ${dark ? 'rgba(255,255,255,.18)' : '#E1E3EB'}` }}>
                <span style={{ width: 44, height: 44, borderRadius: '50%', background: dark ? 'rgba(255,255,255,.16)' : 'var(--p)', color: '#fff', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(r.name)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 12.5, opacity: 0.7 }}>
                    {r.city} · {r.product}
                  </div>
                </div>
                <span style={{ color: '#E3A63B', fontSize: 13, letterSpacing: 1 }}>★★★★★</span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <div className="teasers" style={{ marginTop: 64, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14 }}>
        <Link href={`${b}/deals`} style={{ borderRadius: 28, background: 'var(--p)', color: '#fff', padding: 36, display: 'flex', flexDirection: 'column', minHeight: 260, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -80, bottom: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
          <span className="mono" style={{ fontSize: 12, letterSpacing: '.16em', opacity: 0.75 }}>
            DEALS AND BUNDLES
          </span>
          <div style={{ fontSize: 'clamp(20px, 3vw, 36px)', fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.08, marginTop: 10, maxWidth: 460 }}>{deal ? `${deal.title}: save ${deal.save}%` : 'Bundles and flash deals'}</div>
          <div style={{ fontSize: 15, opacity: 0.8, marginTop: 8 }}>{deal?.items.map((p) => p.name).join(' + ')}</div>
          <span className="btn btn-white btn-sm" style={{ marginTop: 'auto', alignSelf: 'flex-start', paddingTop: 12, paddingBottom: 12 }}>
            See all deals
          </span>
        </Link>
        <Link href={`${b}/suppliers`} style={{ borderRadius: 28, background: 'var(--surface)', padding: 36, display: 'flex', flexDirection: 'column', minHeight: 260 }}>
          <span className="eyebrow">Suppliers near you</span>
          <div style={{ fontSize: 'clamp(20px, 2.4vw, 30px)', fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.1, marginTop: 10 }}>{suppliers.length} showrooms and dealers across Tanzania</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
            {cities.map((c) => (
              <span key={c} style={{ borderRadius: 999, background: '#fff', padding: '6px 12px', fontSize: 13 }}>
                {c}
              </span>
            ))}
          </div>
          <span className="link-u" style={{ marginTop: 'auto', paddingTop: 16, alignSelf: 'flex-start' }}>
            Find the nearest
          </span>
        </Link>
      </div>
    </div>
  );
}
