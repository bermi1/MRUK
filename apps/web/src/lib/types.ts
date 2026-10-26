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
  /* Optional (added for the brand redesign; getCms() fills safe defaults, admin may omit them). */
  /** Button label; empty = "Shop now" in the shopper's language. */
  cta?: string;
  /** Button link: a store path ("/mruk/deals") or https URL; empty = the linked product (pid). */
  href?: string;
  /** Price shown on the slide; null/absent = the linked product's live price, 0 = hide the price. */
  price?: number | null;
  /** Separate phone image (portrait works best); empty = img. */
  imgMobile?: string;
  /** "product" = cut-out product photo on the brand's set; "photo" = full-bleed photograph (lifestyle/banner). */
  layout?: 'product' | 'photo';
  /** Text colour over a photo: "dark" = light text on a darkened image, "light" = dark text on a light image. */
  theme?: 'dark' | 'light';
  /** Copy alignment on wide screens. */
  align?: 'left' | 'center' | 'right';
  /** Focal point of a photo as CSS object-position, e.g. "50% 40%". */
  focal?: string;
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
