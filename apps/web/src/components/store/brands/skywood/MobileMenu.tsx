'use client';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { CatGlyph, glyphKind } from '../../CatGlyph';
import { SafeImg } from '../../SafeImg';
import { useMobileMenu, type MobileMenuProps } from '../shared';

/** Skywood phone menu: a dark, full-screen index — serif collection names with small imagery. */
export function SkywoodMobileMenu({ brand, brandName, cats, labels, announcement }: MobileMenuProps) {
  const { open, setOpen, close, panel } = useMobileMenu();
  const b = `/${brand}`;
  return (
    <>
      <button type="button" className="mm-trigger sw-mm-trigger" onClick={() => setOpen(true)} aria-label={labels.openMenu} aria-expanded={open}>
        <span aria-hidden="true">
          <i />
          <i />
        </span>
      </button>
      {open &&
        createPortal(
          <div className="sw-mm" role="dialog" aria-modal="true" aria-label={labels.menu} ref={panel}>
            <div className="sw-mm-top">
              <button type="button" className="sw-mm-close" onClick={close}>
                {labels.close}
              </button>
              <img src="/brand/skywood-white.png" alt={brandName} width={104} height={24} />
              <Link href={`${b}/search`} className="sw-mm-search">
                {labels.searchShort}
              </Link>
            </div>
            <ol className="sw-mm-list">
              {cats.map((c, i) => (
                <li key={c.id} style={{ ['--i' as string]: i }}>
                  <Link href={`${b}/c/${c.id}`}>
                    <span className="sw-mm-n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="sw-mm-name">{c.name}</span>
                    <span className="sw-mm-art">
                      <CatGlyph kind={glyphKind(c.id, c.name)} className="sw-mm-glyph" strokeWidth={1.4} />
                      {c.img && <SafeImg src={c.img} alt="" />}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <nav className="sw-mm-links" aria-label={labels.helpAndServices}>
              <Link href={`${b}/deals`}>{labels.deals}</Link>
              <Link href={`${b}/track`}>{labels.track}</Link>
              <Link href={`${b}/suppliers`}>{labels.suppliers}</Link>
              <Link href={`${b}/support`}>{labels.support}</Link>
              <Link href="/">{labels.allBrands}</Link>
            </nav>
            <p className="sw-mm-ann">{announcement}</p>
          </div>,
          document.querySelector('.brand-root') ?? document.body,
        )}
    </>
  );
}
