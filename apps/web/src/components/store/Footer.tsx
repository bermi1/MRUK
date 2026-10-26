import Link from 'next/link';
import type { MessageKey } from '@/lib/i18n';
import { waLink } from '@/lib/format';
import type { BrandView, CategoryView } from '@/lib/types';
import { WhatsAppIcon } from '../icons';
import { Subscribe, type SubscribeLabels } from './Subscribe';

type T = (k: MessageKey, v?: Record<string, string | number>) => string;

export function subscribeLabels(t: T, brandName: string): SubscribeLabels {
  return { title: t('subscribeTitle'), sub: t('subscribeSub'), phone: t('phone'), email: t('email'), consent: t('subscribeConsent', { brand: brandName }), subscribe: t('subscribe'), need: t('subscribeNeed'), consentNeeded: t('consentNeeded') };
}

/** Same links and data for both brands; each brand gets its own footer design. */
export function Footer({ brand, cats, t }: { brand: BrandView; cats: CategoryView[]; t: T }) {
  return brand.key === 'skywood' ? <SkywoodFooter brand={brand} cats={cats} t={t} /> : <MrukFooter brand={brand} cats={cats} t={t} />;
}

function Columns({ brand, cats, t, headClass }: { brand: BrandView; cats: CategoryView[]; t: T; headClass: string }) {
  const b = `/${brand.key}`;
  return (
    <>
      <nav className="foot-col" aria-label={t('footerShop')}>
        <p className={headClass}>{t('footerShop')}</p>
        {cats.map((c) => (
          <Link key={c.id} href={`${b}/c/${c.id}`}>
            {c.name}
          </Link>
        ))}
      </nav>
      <nav className="foot-col" aria-label={t('footerHelp')}>
        <p className={headClass}>{t('footerHelp')}</p>
        <Link href={`${b}/track`}>{t('trackOrder')}</Link>
        <Link href={`${b}/support`}>{t('support')}</Link>
        <Link href={`${b}/suppliers`}>{t('suppliersNearYou')}</Link>
        <Link href={`${b}/compare`}>{t('compare')}</Link>
      </nav>
      <nav className="foot-col" aria-label={t('footerOffers')}>
        <p className={headClass}>{t('footerOffers')}</p>
        <Link href={`${b}/deals`}>{t('dealsAndBundles')}</Link>
        <Link href={`${b}/pay-later`}>{t('payLater')}</Link>
        <Link href={`${b}/suppliers`}>{t('showroomPickup')}</Link>
      </nav>
    </>
  );
}

function MrukFooter({ brand, cats, t }: { brand: BrandView; cats: CategoryView[]; t: T }) {
  const b = `/${brand.key}`;
  return (
    <footer className="mu-foot">
      <div className="wrap mu-foot-help">
        <a href={waLink(brand.whatsapp, `Hello ${brand.name}, I need help.`)} target="_blank" rel="noopener noreferrer" className="mu-foot-card wa">
          <span className="mu-foot-ico" aria-hidden="true">
            <WhatsAppIcon size={22} />
          </span>
          <span>
            <b>{t('chatWhatsApp')}</b>
            {t('footerHelpLine')}
          </span>
        </a>
        <Link href={`${b}/track`} className="mu-foot-card">
          <span className="mu-foot-ico" aria-hidden="true">
            ⟶
          </span>
          <span>
            <b>{t('trackOrder')}</b>
            {t('trustDeliverySub')}
          </span>
        </Link>
        <Link href={`${b}/suppliers`} className="mu-foot-card">
          <span className="mu-foot-ico" aria-hidden="true">
            ◎
          </span>
          <span>
            <b>{t('suppliersNearYou')}</b>
            {t('trustShowroomsSub')}
          </span>
        </Link>
      </div>
      <div className="wrap">
        <Subscribe brand="mruk" source="footer" labels={subscribeLabels(t, brand.name)} className="foot-sub" />
      </div>
      <div className="wrap mu-foot-grid">
        <div className="mu-foot-brand">
          <img src="/brand/mruk-white.png" alt={brand.name} width={58} height={40} loading="lazy" />
          <p>{brand.tagline}</p>
          <div className="mu-foot-partner">
            <span>{t('advancePartner')}</span>
            <img src="/brand/azania-bank-white.png" alt="Azania Bank" width={39} height={30} loading="lazy" />
          </div>
        </div>
        <Columns brand={brand} cats={cats} t={t} headClass="mu-foot-h" />
        <div className="foot-col">
          <p className="mu-foot-h">{t('weAccept')}</p>
          <div className="mu-accept">
            <span>Azania Bank</span>
            <span>{t('payLater')}</span>
            <span>Visa</span>
            <span>Mastercard</span>
          </div>
        </div>
      </div>
      <div className="wrap mu-foot-bottom">
        <span>
          © {new Date().getFullYear()} {brand.legal}
        </span>
        <span>
          <Link href="/privacy">{t('privacy')}</Link> · {t('builtBy')}
        </span>
      </div>
    </footer>
  );
}

function SkywoodFooter({ brand, cats, t }: { brand: BrandView; cats: CategoryView[]; t: T }) {
  const [first, ...rest] = brand.tagline.split(/(?<=\.)\s+/);
  return (
    <footer className="sw-foot">
      <div className="wrap">
        <p className="sw-foot-line">
          {first} {rest.length > 0 && <em>{rest.join(' ')}</em>}
        </p>
        <Subscribe brand="skywood" source="footer" labels={subscribeLabels(t, brand.name)} className="foot-sub" />
        <div className="sw-foot-grid">
          <div className="sw-foot-brand">
            <img src="/brand/skywood-white.png" alt={brand.name} width={98} height={28} loading="lazy" />
            <a href={waLink(brand.whatsapp, `Hello ${brand.name}, I need help.`)} target="_blank" rel="noopener noreferrer" className="sw-foot-concierge">
              <span className="sw-eyebrow light">{t('concierge')}</span>
              {t('chatWhatsApp')} →
            </a>
          </div>
          <Columns brand={brand} cats={cats} t={t} headClass="sw-foot-h" />
        </div>
        <div className="sw-foot-bottom">
          <span>
            © {new Date().getFullYear()} {brand.legal}
          </span>
          <span className="sw-foot-pay">
            {t('weAccept')}: Azania Bank · {t('payLater')} · Visa · Mastercard
          </span>
          <span>
            <Link href="/privacy">{t('privacy')}</Link> · {t('builtBy')}
          </span>
        </div>
      </div>
    </footer>
  );
}
