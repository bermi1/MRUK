import { PImg } from '@/components/store/PImg';
import { Stars } from '@/components/icons';
import { initials } from '@/lib/format';
import type { ProductMedia } from '@/lib/product-media';
import { VideoBand } from './VideoBand';

/**
 * Below-the-fold product story (SharkNinja-style): large feature panels that alternate image and copy,
 * the product film, "in your home" lifestyle pictures and the rating summary with customer voices.
 * Only real content is shown: features staff entered, our photos and footage, the product's rating.
 */
export function ProductStory({ p, media, reviews, t }: {
  p: { name: string; model: string; sub: string; features: string[]; images: string[]; rating: number; reviews: number };
  media: ProductMedia;
  reviews: { name: string; city: string; product: string; q: string }[];
  t: { love: string; action: string; actionSub: string; home: string; homeSub: string; rated: string; reviewsN: string; play: string; voices: string };
}) {
  const feats = p.features.map((f) => f.trim()).filter(Boolean).slice(0, 3);
  const pics = [...p.images.slice(1), ...media.lifestyle, ...p.images.slice(0, 1)];
  const life = media.lifestyle.slice(0, 3);
  return (
    <div className="pstory">
      {feats.length > 0 && (
        <section className="pst-feats" id="features-story" aria-label={t.love}>
          <p className="pst-kicker">{t.love}</p>
          {feats.map((f, k) => {
            const src = pics[k] ?? p.images[0] ?? '';
            const isLife = media.lifestyle.includes(src);
            const [head, ...rest] = f.split(/[,:;–]\s*|\s-\s/);
            return (
              <article key={f} className={`pst-feat ${k % 2 ? 'flip' : ''}`} data-reveal>
                <div className="pst-media">
                  <PImg src={src} alt="" model={p.model} sub={p.sub} size="lg" cover={isLife} />
                </div>
                <div className="pst-copy">
                  <span className="pst-n">{String(k + 1).padStart(2, '0')}</span>
                  <h3>{head}</h3>
                  {rest.length > 0 && <p>{rest.join(', ')}</p>}
                  <p className="pst-of">{p.name}</p>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {media.video && (
        <section className="pst-video" id="video" aria-label={t.action}>
          <div className="pst-video-head">
            <p className="pst-kicker light">{t.action}</p>
            <h2>{t.actionSub}</h2>
          </div>
          <VideoBand src={media.video.src} poster={media.video.poster} title={p.name} label={t.play} />
        </section>
      )}

      {life.length > 1 && (
        <section className="pst-home" id="in-home" aria-label={t.home}>
          <div className="pst-home-head">
            <p className="pst-kicker">{t.home}</p>
            <h2>{t.homeSub}</h2>
          </div>
          <div className={`pst-mosaic n${life.length}`}>
            {life.map((src) => (
              <img key={src} src={src} alt="" loading="lazy" decoding="async" />
            ))}
          </div>
        </section>
      )}

      {p.reviews > 0 && (
        <section className="pst-reviews" id="reviews" aria-label={t.voices}>
          <div className="pst-score">
            <b>{p.rating.toFixed(1)}</b>
            <Stars value={p.rating} size={18} className="pst-stars" />
            <span>{t.rated}</span>
            <span>{t.reviewsN}</span>
          </div>
          <div className="pst-quotes">
            {reviews.slice(0, 3).map((r) => (
              <figure key={r.name}>
                <blockquote>“{r.q}”</blockquote>
                <figcaption>
                  <span className="pst-av" aria-hidden="true">
                    {initials(r.name)}
                  </span>
                  <span>
                    <b>{r.name}</b> {r.city} · {r.product}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
