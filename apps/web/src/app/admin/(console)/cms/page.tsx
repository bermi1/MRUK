import Link from 'next/link';
import { prisma } from '@bt/db';
import { saveAnnouncementAction, saveDealsAction, saveHeroAction, saveMegaPromoAction, saveSeoAction, saveSocialAction } from '@/app/actions/admin';
import { AForm } from '@/components/admin/AForm';
import { ImagePick } from '@/components/admin/PhotoUpload';
import { SeoEditor } from '@/components/admin/SeoEditor';
import { BrandMark, Forbidden } from '@/components/admin/ui';
import { heroDefaults } from '@/server/catalog';
import type { CmsView } from '@/lib/types';
import { adminFilters, BRAND_NAME, pickBrand } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Website CMS' };

export default async function CmsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('cms')) return <Forbidden what="the website CMS" />;
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const brand = pickBrand(ctx, f, sp.b);
  if (!brand) return <Forbidden what="any brand website" />;
  const [b, blocks, products, cats] = await Promise.all([
    prisma.brand.findUniqueOrThrow({ where: { key: brand } }),
    prisma.cmsBlock.findMany({ where: { brandKey: brand } }),
    prisma.product.findMany({ where: { brandKey: brand }, orderBy: [{ hidden: 'asc' }, { name: 'asc' }], select: { id: true, model: true, name: true, images: true, hidden: true } }),
    prisma.category.findMany({ where: { brandKey: brand }, orderBy: { sort: 'asc' }, select: { slug: true, name: true } }),
  ]);
  const m = Object.fromEntries(blocks.map((x) => [x.key, x.json])) as Record<string, unknown>;
  const cms: CmsView = {
    announcement: (m.announcement as string) ?? '',
    hero: (m.hero as CmsView['hero']) ?? [],
    megaPromo: (m.megaPromo as CmsView['megaPromo']) ?? { eyebrow: '', title: '', cta: '', cat: '' },
    deals: (m.deals as CmsView['deals']) ?? [],
    seo: (m.seo as CmsView['seo']) ?? { title: '', desc: '', img: '' },
    hot: [],
    social: { facebook: '', instagram: '', tiktok: '', youtube: '', x: '', linkedin: '', ...((m.social as Record<string, string>) ?? {}) },
  };
  const updated = blocks.reduce<{ at: Date; by: string } | null>((a, x) => (!a || x.updatedAt > a.at ? { at: x.updatedAt, by: x.updatedBy } : a), null);
  const write = ctx.can('cms.write');
  const pimg = (id: string) => products.find((p) => p.id === id)?.images[0] ?? '';
  // Up to 5 slides; a slide with an empty headline is left out (slide 1 is required).
  const slides = [0, 1, 2, 3, 4].map((i) => ({ ...heroDefaults(cms.hero[i] ?? { pid: products[0]?.id ?? '', eyebrow: '', title: '', sub: '', img: '' }) }));
  const ogFallback = cms.hero[0]?.img || pimg(cms.hero[0]?.pid ?? '') || products.find((p) => p.images[0])?.images[0] || '';
  const deals = [...cms.deals, { title: '', save: 10, tag: 'Bundle', items: [] as string[] }];
  const productOptions = products.map((p) => (
    <option key={p.id} value={p.id}>
      {p.model} · {p.name}
      {p.hidden ? ' (hidden)' : ''}
    </option>
  ));
  const ro = !write ? <p className="ad-muted2" style={{ fontSize: 12.5 }}>Read-only: your role cannot publish website changes.</p> : null;

  return (
    <div className="ad-stack" style={{ gap: 14 }}>
      <div className={`ad-brandbar ${brand}`} data-testid="cms-brand">
        <div className="ad-row" style={{ gap: 14, flexWrap: 'wrap' }}>
          <BrandMark brand={brand}>Editing the {BRAND_NAME[brand]} website · {b.domain}</BrandMark>
          {f.allowed.length > 1 && (
            <div className="ad-seg" role="group" aria-label="Website to edit">
              {f.allowed.map((k) => (
                <Link key={k} href={`/admin/cms?b=${k}`} aria-current={k === brand ? 'true' : undefined}>
                  {BRAND_NAME[k]}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="ad-row" style={{ flexWrap: 'wrap' }}>
          <span className="ad-live">
            <i />
            Live · edits publish instantly
          </span>
          {updated && (
            <span className="ad-muted" style={{ fontSize: 12 }}>
              Last change {updated.at.toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {updated.by}
            </span>
          )}
          <a className="ad-btn sm" href={`/${brand}`} target="_blank" rel="noopener">
            View live on the {BRAND_NAME[brand]} store
          </a>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 14, alignItems: 'start' }} className="ad-cmsgrid">
        <div className="ad-stack" style={{ gap: 14 }}>
          <section className="ad-card">
            <h2 className="ad-h">Announcement bar</h2>
            {ro}
            {write && (
              <AForm action={saveAnnouncementAction.bind(null, brand)} submit="Publish announcement" className="ad-form one" label="Announcement bar">
                <label className="ad-field" style={{ marginTop: 10 }}>
                  <span className="sr-only">Announcement text</span>
                  <input name="announcement" defaultValue={cms.announcement} maxLength={160} />
                </label>
              </AForm>
            )}
          </section>

          <section className="ad-card">
            <h2 className="ad-h">Hero carousel</h2>
            <p className="ad-sub">Up to 5 slides; leave a headline empty to switch that slide off. The linked product supplies the live price, monthly Pay Later price and the photo when no image is uploaded.</p>
            {write && (
              <AForm action={saveHeroAction.bind(null, brand)} submit="Publish hero slides" label="Hero carousel">
                {slides.map((s, i) => (
                  <div className="ad-slide" key={i}>
                    <div className="ad-stack s8">
                      <ImagePick name={`img_${i}`} current={s.img || pimg(s.pid)} text={`Slide ${i + 1} · Change image`} variant="slide" />
                      {s.img && (
                        <label className="ad-check" style={{ fontSize: 12 }}>
                          <input type="checkbox" name={`clear_${i}`} /> Use product photo
                        </label>
                      )}
                    </div>
                    <div className="ad-form">
                      <label className="ad-field">
                        Eyebrow
                        <input name={`eyebrow_${i}`} defaultValue={s.eyebrow} maxLength={40} />
                      </label>
                      <label className="ad-field">
                        Linked product
                        <select name={`pid_${i}`} defaultValue={s.pid}>
                          {productOptions}
                        </select>
                      </label>
                      <label className="ad-field full">
                        Headline
                        <input name={`title_${i}`} defaultValue={s.title} required={i === 0} maxLength={80} data-testid={`hero-title-${i}`} />
                      </label>
                      <label className="ad-field full">
                        Subtitle
                        <input name={`sub_${i}`} defaultValue={s.sub} maxLength={160} />
                      </label>
                      <label className="ad-field">
                        Button label
                        <input name={`cta_${i}`} defaultValue={s.cta} maxLength={40} placeholder="Shop now" />
                      </label>
                      <label className="ad-field">
                        Button link
                        <input name={`href_${i}`} defaultValue={s.href} maxLength={200} placeholder={`/${brand}/deals — empty = product page`} />
                      </label>
                      <label className="ad-field">
                        Price shown
                        <input name={`price_${i}`} defaultValue={s.price ?? ''} inputMode="numeric" placeholder="Empty = live price, 0 = hide" />
                      </label>
                      <label className="ad-field">
                        Layout
                        <select name={`layout_${i}`} defaultValue={s.layout}>
                          <option value="product">Product on the brand set</option>
                          <option value="photo">Full-bleed photograph</option>
                        </select>
                      </label>
                      <label className="ad-field">
                        Text over photo
                        <select name={`theme_${i}`} defaultValue={s.theme}>
                          <option value="dark">Light text (dark photo)</option>
                          <option value="light">Dark text (light photo)</option>
                        </select>
                      </label>
                      <label className="ad-field">
                        Text position
                        <select name={`align_${i}`} defaultValue={s.align}>
                          <option value="left">Left</option>
                          <option value="center">Centre</option>
                          <option value="right">Right</option>
                        </select>
                      </label>
                      <label className="ad-field">
                        Photo focus (x% y%)
                        <input name={`focal_${i}`} defaultValue={s.focal} maxLength={9} pattern="\d{1,3}% \d{1,3}%" />
                      </label>
                      <div className="ad-field">
                        Phone image (optional)
                        <ImagePick name={`imgm_${i}`} current={s.imgMobile} text={`Slide ${i + 1} · Phone image`} />
                        {s.imgMobile && (
                          <label className="ad-check" style={{ fontSize: 12 }}>
                            <input type="checkbox" name={`clearm_${i}`} /> Remove phone image
                          </label>
                        )}
                      </div>
                      <div className="ad-field">
                        Background video (optional, MP4 or WebM, up to 15 MB)
                        <input type="file" name={`video_${i}`} accept="video/mp4,video/webm" />
                        <small className="ad-muted">Plays muted and looped behind the copy. Not loaded for data-saver, slow connections or reduced motion; the image shows instead.</small>
                        {s.video && (
                          <span style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
                            <a href={s.video} target="_blank" rel="noopener noreferrer">
                              Current video
                            </a>
                            <label className="ad-check" style={{ fontSize: 12 }}>
                              <input type="checkbox" name={`clearv_${i}`} /> Remove video
                            </label>
                          </span>
                        )}
                      </div>
                      <div className="ad-field">
                        Video poster image (optional)
                        <ImagePick name={`poster_${i}`} current={s.videoPoster} text={`Slide ${i + 1} · Video poster`} />
                        {s.videoPoster && (
                          <label className="ad-check" style={{ fontSize: 12 }}>
                            <input type="checkbox" name={`clearp_${i}`} /> Remove poster
                          </label>
                        )}
                      </div>
                      <div className="ad-field">
                        Background music (optional, MP3 up to 5 MB)
                        <input type="file" name={`audio_${i}`} accept="audio/mpeg" />
                        <small className="ad-muted">Never plays on its own: shoppers turn it on with the sound button on the hero.</small>
                        {s.audio && (
                          <span style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
                            <a href={s.audio} target="_blank" rel="noopener noreferrer">
                              Current music
                            </a>
                            <label className="ad-check" style={{ fontSize: 12 }}>
                              <input type="checkbox" name={`cleara_${i}`} /> Remove music
                            </label>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </AForm>
            )}
            {ro}
          </section>

          <section className="ad-card">
            <h2 className="ad-h">Social media</h2>
            <p className="ad-sub">Profile links shown as icons in the {BRAND_NAME[brand]} footer. Leave empty to hide.</p>
            {ro}
            {write && (
              <AForm action={saveSocialAction.bind(null, brand)} submit="Publish social links" className="ad-form" label="Social media">
                {(['facebook', 'instagram', 'tiktok', 'youtube', 'x', 'linkedin'] as const).map((k) => (
                  <label className="ad-field" key={k}>
                    {k === 'x' ? 'X (Twitter)' : k === 'tiktok' ? 'TikTok' : k === 'youtube' ? 'YouTube' : k === 'linkedin' ? 'LinkedIn' : k[0]!.toUpperCase() + k.slice(1)}
                    <input name={k} type="url" defaultValue={cms.social[k]} placeholder="https://" maxLength={200} />
                  </label>
                ))}
              </AForm>
            )}
          </section>

          <section className="ad-card">
            <h2 className="ad-h">Mega menu promo card</h2>
            {ro}
            {write && (
              <AForm action={saveMegaPromoAction.bind(null, brand)} submit="Publish promo card" className="ad-form" label="Mega menu promo">
                <label className="ad-field">
                  Eyebrow
                  <input name="eyebrow" defaultValue={cms.megaPromo.eyebrow} maxLength={30} />
                </label>
                <label className="ad-field">
                  Links to category
                  <select name="cat" defaultValue={cms.megaPromo.cat}>
                    {cats.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ad-field full">
                  Title
                  <input name="title" defaultValue={cms.megaPromo.title} required maxLength={80} />
                </label>
                <label className="ad-field">
                  Button text
                  <input name="cta" defaultValue={cms.megaPromo.cta} required maxLength={30} />
                </label>
              </AForm>
            )}
          </section>

          <section className="ad-card">
            <h2 className="ad-h">Deals and bundles</h2>
            <p className="ad-sub">Choose 2–6 products per bundle (Ctrl/Cmd-click to pick several). Fill the last row to add a bundle.</p>
            {ro}
            {write && (
              <AForm action={saveDealsAction.bind(null, brand)} submit="Publish bundles" label="Deals and bundles">
                <input type="hidden" name="count" value={deals.length} />
                {deals.map((d, i) => (
                  // Key by content so rows remount (and drop stale inputs / ticked "remove" boxes) after a bundle is removed.
                  <div key={`${i}:${d.title}:${d.items.join(',')}`} className="ad-form ad-dealrow" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F0F1F5' }}>
                    <label className="ad-field">
                      {i === cms.deals.length ? 'New bundle name' : 'Bundle name'}
                      <input name={`title_${i}`} defaultValue={d.title} maxLength={60} />
                    </label>
                    <label className="ad-field">
                      Save %
                      <input name={`save_${i}`} defaultValue={d.save} inputMode="numeric" />
                    </label>
                    <label className="ad-field">
                      Tag
                      <input name={`tag_${i}`} defaultValue={d.tag ?? 'Bundle'} maxLength={20} />
                    </label>
                    <label className="ad-field full">
                      Products
                      <select name={`items_${i}`} multiple defaultValue={d.items} size={5}>
                        {productOptions}
                      </select>
                    </label>
                    {i < cms.deals.length && (
                      <label className="ad-check full" style={{ gridColumn: '1 / -1', fontSize: 12.5 }}>
                        <input type="checkbox" name={`remove_${i}`} /> Remove this bundle
                      </label>
                    )}
                  </div>
                ))}
              </AForm>
            )}
          </section>
        </div>
        <section className="ad-card" style={{ position: 'sticky', top: 92 }}>
          <h2 className="ad-h" style={{ marginBottom: 10 }}>
            SEO and social sharing (Open Graph)
          </h2>
          {write ? <SeoEditor key={brand} action={saveSeoAction.bind(null, brand)} title={cms.seo.title} desc={cms.seo.desc} img={cms.seo.img} fallbackImg={ogFallback} domain={b.domain} /> : ro}
        </section>
      </div>
    </div>
  );
}
