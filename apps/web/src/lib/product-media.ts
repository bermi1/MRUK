/**
 * Product media beyond the photos: a video and lifestyle ("in your home") pictures.
 * The product's own video (Admin › Products) wins; otherwise the category's film, where we have
 * caption-free footage from the brand shoots. Lifestyle stills come from the same shoots.
 */
export interface ProductMedia {
  video: { src: string; poster: string } | null;
  lifestyle: string[];
}

const L = '/img/lifestyle';
const MRUK_KITCHEN = { src: '/video/mruk-kitchen-film.mp4', poster: '/video/mruk-kitchen-film.webp' };
const MRUK_HOME = { src: '/video/mruk-home-film.mp4', poster: '/video/mruk-home-film.webp' };
const SKY_FILM = { src: '/video/skywood-film.mp4', poster: '/video/skywood-film.webp' };

const BY_CATEGORY: Record<string, ProductMedia> = {
  'mruk:kitchen': { video: MRUK_KITCHEN, lifestyle: [`${L}/mruk-kitchen-airfryer.webp`, `${L}/mruk-kitchen-microwave.webp`, `${L}/mruk-kitchen-cooking.webp`] },
  'mruk:fridges': { video: MRUK_KITCHEN, lifestyle: [`${L}/mruk-kitchen-cooking.webp`, `${L}/mruk-kitchen-microwave.webp`] },
  'mruk:washing': { video: MRUK_HOME, lifestyle: [`${L}/mruk-kitchen-cooking.webp`] },
  'mruk:generators': { video: { src: '/video/mruk-generators.mp4', poster: '/video/mruk-generators.webp' }, lifestyle: [] },
  'mruk:music-tv': { video: { src: '/video/mruk-tv.mp4', poster: '/video/mruk-tv.webp' }, lifestyle: [] },
  'skywood:music': { video: SKY_FILM, lifestyle: [`${L}/skywood-pool.webp`, `${L}/skywood-living.webp`, `${L}/skywood-beach.webp`, `${L}/skywood-calm.webp`] },
};

export function productMedia(p: { brand: string; cat: string; video?: string; images: string[] }): ProductMedia {
  const fallback = BY_CATEGORY[`${p.brand}:${p.cat}`] ?? { video: null, lifestyle: [] };
  const own = (p.video ?? '').trim();
  return {
    video: own ? { src: own, poster: p.images[0] ?? fallback.video?.poster ?? '' } : fallback.video,
    lifestyle: fallback.lifestyle,
  };
}
