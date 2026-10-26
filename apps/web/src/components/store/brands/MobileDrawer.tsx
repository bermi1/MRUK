'use client';
import { useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setLocaleAction } from '@/app/actions/store';
import { ArrowRightIcon, ChevronRightIcon, CloseIcon, CompareIcon, GlobeIcon, GridIcon, HelpIcon, PinIcon, RouteIcon, SearchIcon, TagIcon, WhatsAppIcon } from '../../icons';
import { CatGlyph, glyphKind } from '../CatGlyph';
import { SafeImg } from '../SafeImg';
import { fill, useMobileMenu, type MobileMenuProps } from './shared';

/**
 * Phone side drawer (both brands, styled per brand: .dr-mruk / .dr-skywood). Holds everything
 * that is not one of the four bottom-bar destinations: categories, Pay Later, deals, compare,
 * track order, suppliers, support, WhatsApp, language and the sister-site link.
 */
export function MobileDrawer({ brand, brandName, cats, labels, announcement, locale, whatsapp, compareCount }: MobileMenuProps) {
  const { open, setOpen, close, panel } = useMobileMenu();
  const router = useRouter();
  const [pending, start] = useTransition();
  const b = `/${brand}`;
  const sky = brand === 'skywood';
  const more: [string, string, React.ReactNode][] = [
    [`${b}/deals`, labels.deals, <TagIcon key="d" size={20} />],
    [`${b}/compare`, compareCount ? `${labels.compare} (${compareCount})` : labels.compare, <CompareIcon key="c" size={20} />],
    [`${b}/track`, labels.track, <RouteIcon key="t" size={20} />],
    [`${b}/suppliers`, labels.suppliers, <PinIcon key="s" size={20} />],
    [`${b}/support`, labels.support, <HelpIcon key="h" size={20} />],
  ];
  return (
    <>
      <button type="button" className={`mm-trigger ${sky ? 'sw-mm-trigger' : 'mu-mm-trigger'}`} onClick={() => setOpen(true)} aria-label={labels.openMenu} aria-expanded={open} aria-controls="m-drawer">
        <span aria-hidden="true">
          <i />
          <i />
          {!sky && <i />}
        </span>
      </button>
      {open &&
        createPortal(
          <div className={`dr dr-${brand}`}>
            <div className="dr-scrim" onClick={close} aria-hidden="true" />
            <div className="dr-panel" id="m-drawer" role="dialog" aria-modal="true" aria-label={labels.menu} ref={panel}>
              <div className="dr-top">
                <img src={sky ? '/brand/skywood-white.png' : '/brand/mruk.png'} alt={brandName} width={sky ? 84 : 41} height={sky ? 24 : 28} />
                <button type="button" className="dr-close" onClick={close} aria-label={labels.close} data-autofocus>
                  <CloseIcon size={22} strokeWidth={sky ? 1.4 : 2} />
                </button>
              </div>
              <form
                className="dr-search"
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = new FormData(e.currentTarget).get('q');
                  close();
                  router.push(`${b}/search?q=${encodeURIComponent(String(q ?? ''))}`);
                }}
              >
                <SearchIcon size={18} color="currentColor" />
                <label className="sr-only" htmlFor="dr-q">
                  {labels.searchShort}
                </label>
                <input id="dr-q" name="q" type="search" placeholder={labels.search} autoComplete="off" enterKeyHint="search" />
              </form>

              <p className="dr-h">{labels.categories}</p>
              <ul className="dr-cats">
                {cats.map((c, i) => (
                  <li key={c.id} style={{ ['--i' as string]: i }}>
                    <Link href={`${b}/c/${c.id}`}>
                      <span className="dr-art" aria-hidden="true">
                        <CatGlyph kind={glyphKind(c.id, c.name)} className="dr-glyph" strokeWidth={1.5} />
                        {c.img && <SafeImg src={c.img} alt="" />}
                      </span>
                      <span className="dr-name">{c.name}</span>
                      <span className="dr-count">{fill(labels.productsN, { n: c.count })}</span>
                    </Link>
                  </li>
                ))}
                <li style={{ ['--i' as string]: cats.length }}>
                  <Link href={`${b}/shop`} className="dr-all">
                    <span className="dr-art" aria-hidden="true">
                      <GridIcon size={20} />
                    </span>
                    <span className="dr-name">{labels.shopAll}</span>
                    <ChevronRightIcon size={16} />
                  </Link>
                </li>
              </ul>

              <div className="dr-pl">
                <img src="/brand/azania-bank-white.png" alt="" width={30} height={23} />
                <div>
                  <b>{labels.salaryAdvance}</b>
                  <span>{announcement || labels.salaryAdvanceSub}</span>
                </div>
                <div className="dr-pl-links">
                  <Link href={`${b}/pay-later`}>
                    {labels.payLater} <ArrowRightIcon size={15} />
                  </Link>
                  <Link href={`${b}/pay-later#how`}>{labels.payLaterHow}</Link>
                </div>
              </div>

              <p className="dr-h">{labels.helpAndServices}</p>
              <nav className="dr-links" aria-label={labels.helpAndServices}>
                {more.map(([href, l, icon]) => (
                  <Link key={href} href={href}>
                    {icon}
                    <span>{l}</span>
                  </Link>
                ))}
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon size={20} color="currentColor" />
                  <span>{labels.chatWhatsApp}</span>
                </a>
              </nav>

              <div className="dr-foot">
                <div className="dr-lang" role="group" aria-label={labels.language}>
                  <GlobeIcon size={18} />
                  {(['en', 'sw'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      className={locale === l ? 'on' : ''}
                      aria-pressed={locale === l}
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await setLocaleAction(l);
                          router.refresh();
                        })
                      }
                    >
                      {l === 'en' ? 'English' : 'Kiswahili'}
                    </button>
                  ))}
                </div>
                <Link href={labels.allBrandsHref} className="dr-sister">
                  {labels.allBrands}
                </Link>
              </div>
            </div>
          </div>,
          document.querySelector('.brand-root') ?? document.body,
        )}
    </>
  );
}
