export type BrandKey = 'mruk' | 'skywood';

export interface BrandView {
  key: BrandKey;
  name: string;
  legal: string;
  domain: string;
  tagline: string;
  whatsapp: string;
  supportEmail: string;
  heroImg: string;
  primary: string;
  dark: string;
  soft: string;
  ink: string;
  accent: string;
  hi: string;
  r: string;
  rs: string;
  head: string;
  track: string;
  logo: string;
}

export interface CategoryView {
  id: string;
  name: string;
  short: string;
  img: string;
  subs: string[];
  count: number;
}

export interface ProductView {
  id: string;
  brand: BrandKey;
  cat: string;
  catName: string;
  sub: string;
  model: string;
  name: string;
  price: number;
  stock: number;
  features: string[];
  img: string;
  images: string[];
  tag: string;
  rating: number;
  reviews: number;
  hidden: boolean;
  createdAt: string;
}

export interface HeroSlide {
  pid: string;
  eyebrow: string;
  title: string;
  sub: string;
  img: string;
}

export interface CmsView {
  announcement: string;
  hero: HeroSlide[];
  megaPromo: { eyebrow: string; title: string; cta: string; cat: string };
  deals: { title: string; items: string[]; save: number; tag?: string }[];
  seo: { title: string; desc: string; img: string };
  hot: string[];
}

export interface CartLine {
  productId: string;
  qty: number;
  name: string;
  model: string;
  price: number;
  listPrice: number;
  img: string;
  stock: number;
  sub: string;
}

export interface CartView {
  brand: BrandKey;
  lines: CartLine[];
  region: string;
  months: number;
  discountCode: string | null;
  discountError: string | null;
  bundles: { title: string; sets: number; saving: number }[];
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  count: number;
}

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; field?: string };
