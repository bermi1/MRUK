'use client';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SearchIcon } from '../../../icons';
import { CatGlyph, glyphKind } from '../../CatGlyph';
import { SafeImg } from '../../SafeImg';
import { fill, useMobileMenu, type MobileMenuProps } from '../shared';

/** Mr UK phone menu: a bright full-screen sheet — search first, then category tiles, then services. */
export function MrukMobileMenu({ brand, cats, labels, announcement }: MobileMenuProps) {
  const { open, setOpen, close, panel } = useMobileMenu();
  const router = useRouter();
  const b = `/${brand}`;
  return (
    <>
      <button type="button" className="mm-trigger mu-mm-trigger" onClick={() => setOpen(true)} aria-label={labels.openMenu} aria-expanded={open}>
        <span aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>
      {open &&
        createPortal(
          <div className="mu-mm" role="dialog" aria-modal="true" aria-label={labels.menu} ref={panel}>
            <div className="mu-mm-top">
              <img src="/brand/mruk.png" alt="Mr UK" width={92} height={28} />
              <button type="button" className="mu-mm-close" onClick={close} aria-label={labels.close}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <form
              className="mu-mm-search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get('q');
                close();
                router.push(`${b}/search?q=${encodeURIComponent(String(q ?? ''))}`);
              }}
            >
              <SearchIcon size={18} />
              <label className="sr-only" htmlFor="mu-mm-q">
                {labels.searchShort}
              </label>
              <input id="mu-mm-q" name="q" placeholder={labels.search} autoComplete="off" />
            </form>
            <div className="mu-mm-tiles">
              {cats.map((c, i) => (
                <Link key={c.id} href={`${b}/c/${c.id}`} className="mu-mm-tile" style={{ ['--i' as string]: i }}>
                  <span className="mu-mm-art">
                    <CatGlyph kind={glyphKind(c.id, c.name)} className="mu-mm-glyph" />
                    {c.img && <SafeImg src={c.img} alt="" />}
                  </span>
                  <span className="mu-mm-name">{c.short}</span>
                  <span className="mu-mm-count">{fill(labels.productsN, { n: c.count })}</span>
                </Link>
              ))}
            </div>
            <Link href="/#salary-advance" className="mu-mm-sa">
              <b>{labels.salaryAdvance}</b>
              <span>{announcement}</span>
            </Link>
            <nav className="mu-mm-links" aria-label={labels.helpAndServices}>
              <Link href={`${b}/deals`}>{labels.deals}</Link>
              <Link href={`${b}/track`}>{labels.track}</Link>
              <Link href={`${b}/suppliers`}>{labels.suppliers}</Link>
              <Link href={`${b}/support`}>{labels.support}</Link>
              <Link href={`${b}/compare`}>{labels.compare}</Link>
              <Link href="/">{labels.allBrands}</Link>
            </nav>
          </div>,
          document.querySelector('.brand-root') ?? document.body,
        )}
    </>
  );
}
