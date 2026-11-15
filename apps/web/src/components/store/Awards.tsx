import Link from 'next/link';
import { img as imgUrl, type ImgWidth } from '@/lib/img';
import type { AwardView } from '@/lib/types';

/** Trophy photo, or a small laurel mark when the award has no photo. */
export function AwardArt({ img, alt, width }: { img: string; alt: string; width: ImgWidth }) {
  if (img) {
    return <img src={imgUrl(img, width)} alt={alt} loading="lazy" decoding="async" />;
  }
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={alt}>
      <path d="M8 4h8v5a4 4 0 01-8 0zM8 6H5a3 3 0 003 3M16 6h3a3 3 0 01-3 3M12 13v4M8.5 20h7M10 17h4" />
    </svg>
  );
}

/**
 * Quiet awards strip for the bottom of the home page: small trophies with the award name, linking to the
 * full list on the About page. Renders nothing when the brand has no awards (Admin › CMS › About).
 */
export function AwardsStrip({ awards, href, title, more }: { awards: AwardView[]; href: string; title: string; more: string }) {
  if (!awards.length) return null;
  return (
    <section className="awards-strip" aria-label={title} data-testid="awards-strip">
      <div className="wrap">
        <p className="awards-strip-t">{title}</p>
        <ul>
          {awards.slice(0, 4).map((w) => (
            <li key={`${w.title}:${w.year}`}>
              <span className="awards-strip-art" aria-hidden="true">
                <AwardArt img={w.img} alt="" width={128} />
              </span>
              <span>
                <span className="awards-strip-name">{w.title}</span>
                <span className="awards-strip-org">{[w.org, w.year].filter(Boolean).join(' · ')}</span>
              </span>
            </li>
          ))}
        </ul>
        <Link href={href} className="awards-strip-more" data-short={title} aria-label={more}>
          <span className="awards-strip-long">{more}</span> <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
