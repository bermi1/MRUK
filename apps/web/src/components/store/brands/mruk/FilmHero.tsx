import Link from 'next/link';
import { ArrowRightIcon } from '@/components/icons';
import { HeroVideo } from '../HeroMedia';

/**
 * Mr UK opening film: a full-width, muted lifestyle loop (real Mr UK products in a Tanzanian home kitchen,
 * no captions or graphics) under a calm headline. The poster photo is the first paint (LCP); the video loads
 * after mount and only where motion and data allow (HeroVideo), so slow phones keep the still photo.
 */
export const MRUK_FILM = { src: '/video/mruk-kitchen-film.mp4', poster: '/video/mruk-kitchen-film.webp' };

export function FilmHero({ title, sub, eyebrow, primary, secondary }: { title: string; sub: string; eyebrow: string; primary: { href: string; label: string }; secondary: { href: string; label: string } }) {
  return (
    <section className="mu-film" aria-label={eyebrow} data-testid="mruk-film">
      <div className="mu-film-media" aria-hidden="true">
        <img src={MRUK_FILM.poster} alt="" className="mu-film-img" fetchPriority="high" decoding="async" width={1600} height={900} />
        <HeroVideo src={MRUK_FILM.src} poster={MRUK_FILM.poster} className="mu-film-img mu-film-video" />
        <span className="mu-film-shade" />
      </div>
      <div className="wrap mu-film-in">
        <div className="mu-film-copy">
          <p className="mu-film-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="mu-film-sub">{sub}</p>
          <div className="mu-film-cta">
            <Link href={primary.href} className="mu-btn mu-btn-sky">
              {primary.label} <ArrowRightIcon size={16} className="i-arrow" />
            </Link>
            <Link href={secondary.href} className="mu-btn mu-btn-ghost">
              {secondary.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Short silent product clip that plays when allowed and links to its category; the poster shows otherwise. */
export function ActionClip({ src, poster, title, sub, href, cta }: { src: string; poster: string; title: string; sub: string; href: string; cta: string }) {
  return (
    <Link href={href} className="mu-clip" data-reveal>
      <span className="mu-clip-media" aria-hidden="true">
        <img src={poster} alt="" loading="lazy" decoding="async" className="mu-clip-img" />
        <HeroVideo src={src} poster={poster} className="mu-clip-img" />
      </span>
      <span className="mu-clip-copy">
        <span className="mu-clip-title">{title}</span>
        <span className="mu-clip-sub">{sub}</span>
        <span className="mu-link">
          {cta} <ArrowRightIcon size={16} className="i-arrow" />
        </span>
      </span>
    </Link>
  );
}
