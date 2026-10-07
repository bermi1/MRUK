import Link from 'next/link';
import { PImg } from '@/components/store/PImg';
import { fmt } from '@/lib/format';
import type { ProductView } from '@/lib/types';
import { getAllProducts, getBrand, getBundles, getCategories, getCms, getSuppliers } from '@/server/catalog';
import '@/styles/landing.css';

const BRAND_COLOR = { mruk: '#1D2366', skywood: '#8A6A2F' } as const;

export default async function Landing() {
  const [all, mrukCms, skyCms, mrukCats, skyCats, mrukBundles, skyBundles, suppliers, mruk, sky] = await Promise.all([
    getAllProducts(),
    getCms('mruk'),
    getCms('skywood'),
    getCategories('mruk'),
    getCategories('skywood'),
    getBundles('mruk'),
    getBundles('skywood'),
    getSuppliers(),
    getBrand('mruk'),
    getBrand('skywood'),
  ]);
  // Hot products: staff picks from admin first, then alternate brands (products with photos).
  const picked = [...mrukCms.hot, ...skyCms.hot].map((id) => all.find((p) => p.id === id)).filter((p): p is ProductView => !!p);
  const mu = all.filter((p) => p.brand === 'mruk' && p.img);
  const sw = all.filter((p) => p.brand === 'skywood' && p.img);
  const mixed: ProductView[] = [];
  for (let k = 0; k < 6; k++) {
    if (mu[k]) mixed.push(mu[k]!);
    if (sw[k]) mixed.push(sw[k]!);
  }
  const hot = [...picked, ...mixed.filter((p) => !picked.includes(p))].slice(0, 6);
  const combos = [...mrukBundles.slice(0, 2).map((b) => ({ ...b, brand: 'mruk' as const })), ...skyBundles.slice(0, 2).map((b) => ({ ...b, brand: 'skywood' as const }))];
  const catCount = mrukCats.length + skyCats.length;

  return (
    <div className="landing">
      <header className="l-nav">
        <div className="wrap l-nav-in">
          <Link href="/" className="l-logos" aria-label="Mr UK and Skywood home">
            <img src="/brand/mruk.png" alt="Mr UK" style={{ height: 40 }} />
            <span className="sep" />
            <img src="/brand/skywood.png" alt="Skywood" style={{ height: 26 }} />
          </Link>
          <nav className="l-links d-only" aria-label="Main">
            <Link href="/mruk">Shop Mr UK</Link>
            <Link href="/skywood">Shop Skywood</Link>
            <a href="#salary-advance">Salary Advance</a>
            <a href="#salary-advance">How it works</a>
          </nav>
          <Link href="/mruk" className="btn btn-sm" style={{ background: '#12164A', color: '#fff', padding: '12px 20px' }}>
            Start shopping
          </Link>
        </div>
      </header>

      <main id="main" className="wrap">
        <section className="l-hero">
          <svg className="l-arc" viewBox="0 0 760 380" aria-hidden="true">
            <path d="M0 380 A380 380 0 0 1 760 380" fill="none" stroke="#A7A9AC" strokeWidth="26" opacity=".25" />
          </svg>
          <div className="l-hero-copy">
            <span className="mono l-eyebrow">MR UK · SKYWOOD</span>
            <h1>
              Two trusted brands.
              <br />
              One place to shop.
            </h1>
            <p>Refrigerators, TVs, kitchen, generators, sound and cooling, delivered across Tanzania. Pay in full or monthly from your salary.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/mruk" className="btn btn-white">
                Shop Mr UK
              </Link>
              <Link href="/skywood" className="btn btn-ghost-light">
                Shop Skywood
              </Link>
            </div>
            <div className="l-stats">
              <div>
                <b>{all.length}</b>
                <span>products</span>
              </div>
              <div>
                <b>{catCount}</b>
                <span>categories</span>
              </div>
              <div>
                <b>{suppliers.length}</b>
                <span>showrooms and dealers</span>
              </div>
            </div>
          </div>
          <div className="l-hero-art">
            <div className="c1" />
            <div className="c2" />
            <img src="/img/products/mruk-french-fridge.webp" alt="French style refrigerator" fetchPriority="high" />
          </div>
        </section>

        <section className="l-brands" aria-label="Choose a brand">
          <Link href="/mruk" className="l-brand mruk">
            <div className="l-brand-copy">
              <img src="/brand/mruk-white.png" alt="Mr UK" style={{ height: 46, width: 'auto' }} />
              <div className="t">{mruk.tagline}</div>
              <div className="s">Refrigeration · TV · Kitchen · Generators · Agriculture</div>
              <span className="u">Enter Mr UK store</span>
            </div>
            <img className="art" src="/img/products/mruk-g3500q-generator.webp" alt="" />
          </Link>
          <Link href="/skywood" className="l-brand sky">
            <div className="l-brand-copy">
              <img src="/brand/skywood-white.png" alt="Skywood" style={{ height: 30, width: 'auto' }} />
              <div className="t">Beyond limits</div>
              <div className="s">Music · Refrigeration · Kitchen · Fans · Air Conditioning</div>
              <span className="u">Enter {sky.name} store</span>
            </div>
            <img className="art" src="/img/products/skywood-sk6031ges-cooker.webp" alt="" />
          </Link>
        </section>

        <section id="salary-advance" className="l-sa">
          <div>
            <img src="/brand/azania-bank.png" alt="Azania Bank" style={{ width: 90, height: 70, objectFit: 'contain', objectPosition: 'left' }} />
            <div className="mono" style={{ fontSize: 12, letterSpacing: '.16em', color: '#0078B4', marginTop: 14 }}>
              IN PARTNERSHIP WITH AZANIA BANK
            </div>
            <h2>Take it home today. Pay from your salary.</h2>
            <p>Choose Salary Advance at checkout and spread the cost over 3, 6 or 12 months. Track what&apos;s paid and what&apos;s left in the app. Approval by Azania Bank.</p>
            <ol className="l-steps">
              {['Pick a product', 'Azania Bank approves', 'Pay monthly'].map((t, i) => (
                <li key={t}>
                  <span className="mono">0{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
          <div className="l-sa-card" aria-hidden="true">
            <div className="c1" />
            <div className="c2" />
            <div className="row-top" style={{ position: 'relative' }}>
              <img src="/brand/azania-bank.png" alt="" style={{ width: 70, height: 56, objectFit: 'contain' }} />
              <span className="badge" style={{ background: '#0098DA', color: '#fff' }}>
                Good standing
              </span>
            </div>
            <div className="mono" style={{ marginTop: 'auto', letterSpacing: '.14em', position: 'relative' }}>
              SALARY ADVANCE •••• 4821
            </div>
            <div className="row" style={{ marginTop: 12, fontSize: 11, color: '#5E6378', position: 'relative' }}>
              <div>
                PAID
                <div style={{ fontSize: 14, fontWeight: 600, color: '#16825D' }}>TZS 408,334</div>
              </div>
              <div>
                REMAINING
                <div style={{ fontSize: 14, fontWeight: 600, color: '#12152B' }}>TZS 2,041,666</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                NEXT
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0078B4' }}>25th</div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="pill" style={{ ['--hi' as string]: '#E23B3B' }}>
            <span className="dot" />
            HOT PRODUCTS
          </div>
          <h2 className="l-h2">Trending right now</h2>
          <p className="l-sub">The most wanted items from Mr UK and Skywood this week.</p>
          <div className="grid-3" style={{ marginTop: 24 }}>
            {hot.map((p) => (
              <Link key={p.id} href={`/${p.brand}/p/${p.id}`} className="l-hot">
                <div className="row" style={{ position: 'relative', zIndex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: BRAND_COLOR[p.brand] }}>{p.brand === 'mruk' ? 'MR UK' : 'SKYWOOD'}</span>
                  <span className="badge" style={{ background: '#E23B3B', color: '#fff' }}>
                    HOT
                  </span>
                </div>
                <PImg src={p.img} alt={p.name} model={p.model} size="lg" className="l-hot-img" style={{ ['--p' as string]: 'transparent' }} />
                <div className="row" style={{ alignItems: 'flex-end' }}>
                  <div>
                    <div className="mono" style={{ fontSize: 12, color: '#8A8EA3' }}>
                      {p.model}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                      {fmt(p.price)} <span style={{ color: '#0078B4', fontSize: 12, fontWeight: 500 }}>· {fmt(p.price / 12)}/mo</span>
                    </div>
                  </div>
                  <span className="icon-btn" style={{ background: BRAND_COLOR[p.brand] === '#8A6A2F' ? '#111216' : '#1D2366', color: '#fff' }}>
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 72 }}>
          <div className="pill" style={{ ['--hi' as string]: '#E23B3B' }}>
            <span className="dot" />
            COMBO DEALS
          </div>
          <h2 className="l-h2">Buy together, save more</h2>
          <p className="l-sub">Bundles put together for real homes, shops and farms.</p>
          <div className="grid-2" style={{ marginTop: 24, gap: 14 }}>
            {combos.map((c) => (
              <Link key={c.title} href={`/${c.brand}/deals`} className="l-combo">
                <div className="l-combo-imgs" style={{ background: c.brand === 'mruk' ? '#1D2366' : '#111216' }}>
                  {c.items.slice(0, 2).map((p) => (
                    <PImg key={p.id} src={p.img} alt="" model={p.model} size="sm" style={{ flex: 1, borderRadius: 0, ['--p' as string]: 'transparent' }} />
                  ))}
                </div>
                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <div className="row">
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: BRAND_COLOR[c.brand] }}>{c.brand === 'mruk' ? 'MR UK' : 'SKYWOOD'}</span>
                    <span className="badge" style={{ background: '#E6F4EE', color: '#16825D' }}>
                      Save {c.save}%
                    </span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: '#5E6378' }}>{c.items.map((p) => p.name).join(' + ')}</div>
                  <div className="row" style={{ marginTop: 'auto', alignItems: 'flex-end', paddingTop: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#8A8EA3', textDecoration: 'line-through' }}>{fmt(c.was)}</div>
                      <div style={{ fontSize: 22, fontWeight: 600 }}>{fmt(c.now)}</div>
                    </div>
                    <span className="btn btn-sm" style={{ background: c.brand === 'mruk' ? '#1D2366' : '#111216', color: '#fff' }}>
                      Shop combo
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="l-foot">
        <div className="wrap">
          <div className="l-foot-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <img src="/brand/mruk-white.png" alt="Mr UK" style={{ height: 34 }} />
                <span style={{ width: 1, height: 26, background: 'rgba(255,255,255,.2)' }} />
                <img src="/brand/skywood-white.png" alt="Skywood" style={{ height: 22 }} />
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0, maxWidth: 260 }}>Two trusted brands of appliances and electronics, delivered across Tanzania.</p>
              <span style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.06)', borderRadius: 12, padding: '8px 12px', fontSize: 12 }}>
                Salary Advance by <img src="/brand/azania-bank-white.png" alt="Azania Bank" style={{ height: 30 }} />
              </span>
            </div>
            <div className="foot-col">
              <div className="t">Mr UK</div>
              {mrukCats.map((c) => (
                <Link key={c.id} href={`/mruk/c/${c.id}`}>
                  {c.name}
                </Link>
              ))}
            </div>
            <div className="foot-col">
              <div className="t">Skywood</div>
              {skyCats.map((c) => (
                <Link key={c.id} href={`/skywood/c/${c.id}`}>
                  {c.name}
                </Link>
              ))}
            </div>
            <div className="foot-col">
              <div className="t">Help</div>
              <Link href="/mruk/track">Track order</Link>
              <Link href="/mruk/support">Support</Link>
              <Link href="/mruk/suppliers">Suppliers near you</Link>
              <a href="#salary-advance">Salary Advance</a>
              <a href="tel:+255686990359">+255 686 990 359</a>
            </div>
            <div className="foot-col">
              <div className="t">Platform</div>
              <Link href="/azania">Azania Bank mini app</Link>
              <Link href="/mruk?source=pwa">Mobile app</Link>
              <Link href="/admin">Staff portal</Link>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} MR UK Corporation Ltd and Skywood Tanzania</span>
            <span>
              <Link href="/privacy">Privacy</Link> · Built and secured by Bermi Techs
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
