import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { AwardArt } from '@/components/store/Awards';
import { initials } from '@/lib/format';
import type { BrandKey } from '@/lib/types';
import { publicUrl } from '@/lib/site';
import { getBrand, getCms, getSuppliers } from '@/server/catalog';
import { getT } from '@/server/locale';
import { brandTitle, breadcrumbLd, graph, leadersLd, organizationLd, pageMeta } from '@/server/seo';

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [brand, cms] = await Promise.all([getBrand(key), getCms(key)]);
  const a = cms.about;
  return pageMeta({ brand, path: '/about', title: brandTitle(`About ${brand.name}`, brand.name), description: a.intro || a.headline || `About ${brand.name}: who we are, what we do and where to find us in Tanzania.` });
}

/** About page: story, activities and awards, all edited in Admin › CMS › About. Sections with no content are left out. */
export default async function AboutPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [brand, cms, suppliers, t] = await Promise.all([getBrand(key), getCms(key), getSuppliers(key), getT()]);
  const a = cms.about;
  const b = `/${key}`;
  // Lifestyle photos from the brand shoots (real footage stills), one for the header and one for "find us".
  const PHOTOS: Record<string, [string, string]> = {
    skywood: ['/img/lifestyle/skywood-living.webp', '/img/lifestyle/skywood-pool.webp'],
    mruk: ['/img/lifestyle/mruk-kitchen-cooking.webp', '/img/lifestyle/mruk-kitchen-microwave.webp'],
  };
  const [hero, visitImg] = PHOTOS[key] ?? ['', ''];
  const paragraphs = a.story.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="wrap page-top about">
      <JsonLd data={graph(organizationLd(brand, cms), { '@type': 'AboutPage', url: publicUrl(key, '/about'), name: `About ${brand.name}`, description: a.intro || undefined }, breadcrumbLd(brand, [{ name: t('aboutUs'), path: '/about' }]), ...leadersLd(brand, a.leaders))} />
      <header className={`about-head ${hero ? 'has-photo' : ''}`}>
        {hero && <img className="about-hero-img" src={hero} alt="" fetchPriority="high" decoding="async" width={1600} height={900} />}
        <div className="about-head-in">
          <p className="about-kicker">{a.eyebrow || t('aboutUs')}</p>
          <h1>{a.headline || brand.name}</h1>
          {a.intro && <p className="about-intro">{a.intro}</p>}
        </div>
      </header>

      {a.facts.length > 0 && (
        <dl className="about-facts">
          {a.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {paragraphs.length > 0 && (
        <section className="about-sec about-story" aria-labelledby="about-story">
          <h2 id="about-story">{t('aboutStory')}</h2>
          <div>
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {(a.mission || a.vision) && (
        <section className="about-sec about-mv" aria-label={`${t('aboutMission')}, ${t('aboutVision')}`}>
          {a.mission && (
            <div>
              <p className="about-kicker">{t('aboutMission')}</p>
              <p className="about-mv-t">{a.mission}</p>
            </div>
          )}
          {a.vision && (
            <div>
              <p className="about-kicker">{t('aboutVision')}</p>
              <p className="about-mv-t">{a.vision}</p>
            </div>
          )}
        </section>
      )}

      {a.values.length > 0 && (
        <section className="about-sec" aria-labelledby="about-values">
          <h2 id="about-values">{t('aboutValues')}</h2>
          <ol className="about-values">
            {a.values.map((v, i) => (
              <li key={v.title}>
                <span className="about-val-n">{String(i + 1).padStart(2, '0')}</span>
                <h3>{v.title}</h3>
                {v.text && <p>{v.text}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {a.activities.length > 0 && (
        <section className="about-sec" aria-labelledby="about-activities">
          <h2 id="about-activities">{t('aboutActivities')}</h2>
          <ul className="about-acts">
            {a.activities.map((x) => (
              <li key={x.title}>
                <h3>{x.title}</h3>
                {x.text && <p>{x.text}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.visit && (
        <section className="about-sec about-visit" aria-labelledby="about-visit">
          {visitImg && <img src={visitImg} alt="" loading="lazy" decoding="async" width={1280} height={720} />}
          <div>
            <h2 id="about-visit">{t('aboutVisit')}</h2>
            <p>{a.visit}</p>
            {suppliers.length > 0 && (
              <Link href={`${b}/suppliers`} className="about-btn solid">
                {t('suppliersNearYou')}
              </Link>
            )}
          </div>
        </section>
      )}

      {a.leaders.length > 0 && (
        <section className="about-sec" id="leadership" aria-labelledby="about-leadership">
          <h2 id="about-leadership">{t('aboutLeadership')}</h2>
          <ul className="about-leaders">
            {a.leaders.map((l) => (
              <li key={l.name} data-testid="leader">
                <span className="about-leader-art" aria-hidden={l.img ? undefined : true}>
                  {l.img ? <img src={l.img} alt={`${l.name}, ${l.role}`} loading="lazy" decoding="async" /> : initials(l.name)}
                </span>
                <div>
                  <h3>{l.name}</h3>
                  {l.role && <p className="about-leader-role">{l.role}</p>}
                  {l.bio && <p className="about-leader-bio">{l.bio}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.awards.length > 0 && (
        <section className="about-sec" id="awards" aria-labelledby="about-awards">
          <h2 id="about-awards">{t('aboutAwards')}</h2>
          <ul className="about-awards">
            {a.awards.map((w) => (
              <li key={`${w.title}:${w.year}`} data-testid="award">
                <span className="about-award-art">
                  <AwardArt img={w.img} alt={`${w.title} trophy, ${w.org} ${w.year}`.trim()} width={640} />
                </span>
                <p className="about-award-year">{w.year}</p>
                <h3>{w.title}</h3>
                <p className="about-award-org">{w.org}</p>
                {w.recipient && <p className="about-award-to">{w.recipient}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.closing && <p className="about-closing">{a.closing}</p>}

      <nav className="about-cta" aria-label={brand.name}>
        <Link href={`${b}/shop`} className="about-btn solid">
          {t('allProducts')}
        </Link>
        {suppliers.length > 0 && (
          <Link href={`${b}/suppliers`} className="about-btn">
            {t('suppliersNearYou')}
          </Link>
        )}
        <Link href={`${b}/support`} className="about-btn">
          {t('support')}
        </Link>
      </nav>
    </div>
  );
}
