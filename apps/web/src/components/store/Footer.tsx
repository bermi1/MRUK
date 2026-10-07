import Link from 'next/link';
import type { BrandView, CategoryView } from '@/lib/types';

export function Footer({ brand, cats, t }: { brand: BrandView; cats: CategoryView[]; t: (k: 'footerShop' | 'footerHelp' | 'footerOffers' | 'weAccept' | 'trackOrder' | 'support' | 'suppliersNearYou' | 'compare' | 'dealsAndBundles' | 'showroomPickup' | 'builtBy' | 'salaryAdvance') => string }) {
  const b = `/${brand.key}`;
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <img src={brand.key === 'mruk' ? '/brand/mruk-white.png' : '/brand/skywood-white.png'} alt={brand.name} style={{ height: brand.key === 'mruk' ? 40 : 28, display: 'block' }} />
            <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: '14px 0 0', maxWidth: 260 }}>{brand.tagline}</p>
          </div>
          <div className="foot-col">
            <div className="t">{t('footerShop')}</div>
            {cats.map((c) => (
              <Link key={c.id} href={`${b}/c/${c.id}`}>
                {c.name}
              </Link>
            ))}
          </div>
          <div className="foot-col">
            <div className="t">{t('footerHelp')}</div>
            <Link href={`${b}/track`}>{t('trackOrder')}</Link>
            <Link href={`${b}/support`}>{t('support')}</Link>
            <Link href={`${b}/suppliers`}>{t('suppliersNearYou')}</Link>
            <Link href={`${b}/compare`}>{t('compare')}</Link>
          </div>
          <div className="foot-col">
            <div className="t">{t('footerOffers')}</div>
            <Link href={`${b}/deals`}>{t('dealsAndBundles')}</Link>
            <Link href="/#salary-advance">Salary Advance</Link>
            <Link href={`${b}/suppliers`}>{t('showroomPickup')}</Link>
          </div>
          <div className="foot-col">
            <div className="t">{t('weAccept')}</div>
            <div className="accept">
              <span>Azania Bank</span>
              <span>Salary Advance</span>
              <span>Mastercard</span>
              <span>Visa</span>
            </div>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} {brand.legal}</span>
          <span>
            <Link href="/privacy">Privacy</Link> · {t('builtBy')}
          </span>
        </div>
      </div>
    </footer>
  );
}
