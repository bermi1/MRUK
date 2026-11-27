/**
 * Category hero films: short, silent, caption-free loops cut from the brand shoots.
 * A film set by staff (Admin › Catalog › category) wins; otherwise this default; otherwise the image hero.
 * Categories missing here have no suitable footage yet (they keep the photo).
 */
export interface CategoryFilm {
  src: string;
  poster: string;
}

const v = (name: string): CategoryFilm => ({ src: `/video/${name}.mp4`, poster: `/video/${name}.webp` });

const DEFAULTS: Record<string, CategoryFilm> = {
  'mruk:kitchen': v('mruk-kitchen-film'),
  'mruk:fridges': v('cat-mruk-fridges'),
  'mruk:washing': v('cat-mruk-washing'),
  'mruk:generators': v('mruk-generators'),
  'mruk:music-tv': v('mruk-tv'),
  'skywood:music': v('cat-skywood-music'),
  'skywood:washing': v('cat-skywood-washing'),
  'skywood:fans': v('cat-skywood-fans'),
  'skywood:ac': v('cat-skywood-ac'),
};

export function categoryFilm(brand: string, c: { id: string; img: string; video?: string; videoPoster?: string }): CategoryFilm | null {
  const own = (c.video ?? '').trim();
  const fallback = DEFAULTS[`${brand}:${c.id}`] ?? null;
  if (own) return { src: own, poster: (c.videoPoster ?? '').trim() || c.img || fallback?.poster || '' };
  return fallback;
}
