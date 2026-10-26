'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import type { BrandView, CategoryView, CmsView } from '@/lib/types';
import { AuthModal, type SessionUser } from '../AuthModal';

export interface MegaProduct {
  id: string;
  model: string;
  name: string;
  sub: string;
  price: number;
  img: string;
}

export interface HeaderLabels {
  track: string;
  suppliers: string;
  support: string;
  signIn: string;
  compare: string;
  cart: string;
  deals: string;
  search: string;
  searchShort: string;
  allBrands: string;
  /** Where "all brands" goes: the landing page, or the sister site when the brands are deployed separately. */
  allBrandsHref: string;
  allCategories: string;
  menu: string;
  close: string;
  featured: string;
  viewAllN: string;
  productsN: string;
  helpAndServices: string;
  account: string;
  perMonth: string;
  payLater: string;
  payLaterBy: string;
  payLaterHow: string;
  payLaterEligibility: string;
  payLaterFaq: string;
  payLaterSteps: string[];
}

/** Props every brand header receives from [brand]/layout.tsx (one data contract, two designs). */
export interface HeaderProps {
  brand: BrandView;
  cms: Pick<CmsView, 'announcement' | 'megaPromo'>;
  cats: CategoryView[];
  mega: Record<string, MegaProduct[]>;
  cartCount: number;
  compareCount: number;
  user: SessionUser | null;
  labels: HeaderLabels;
}

export const fill = (s: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((a, [k, v]) => a.replace(`{${k}}`, String(v)), s);

/**
 * Mega-menu behaviour shared by both brands: hover intent (120 ms, README), click/Enter toggles,
 * Esc closes and returns focus to the trigger, route changes close it.
 */
export function useMegaMenu() {
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const triggers = useRef<Record<string, HTMLElement | null>>({});
  const path = usePathname();

  useEffect(() => setOpen(null), [path]);

  const close = useCallback((focusTrigger = false) => {
    window.clearTimeout(timer.current);
    setOpen((cur) => {
      if (focusTrigger && cur) triggers.current[cur]?.focus();
      return null;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const hover = (id: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(id), 120);
  };
  const leave = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(null), 160);
  };
  const keep = () => window.clearTimeout(timer.current);
  const toggle = (id: string) => {
    window.clearTimeout(timer.current);
    setOpen((cur) => (cur === id ? null : id));
  };
  const ref = (id: string) => (el: HTMLElement | null) => {
    triggers.current[id] = el;
  };
  return { open, setOpen, hover, leave, keep, toggle, close, ref };
}

/** Sign-in modal: opened by the header or by any page via the `bt-open-auth` event. */
export function useAuthModal(brand: BrandView, user: SessionUser | null) {
  const [auth, setAuth] = useState(false);
  useEffect(() => {
    const openAuth = () => setAuth(true);
    window.addEventListener('bt-open-auth', openAuth);
    return () => window.removeEventListener('bt-open-auth', openAuth);
  }, []);
  const modal = auth ? createPortal(<AuthModal brand={brand.key} user={user} onClose={() => setAuth(false)} />, document.querySelector('.brand-root') ?? document.body) : null;
  return { openAuth: () => setAuth(true), modal };
}

/** Lock page scroll while a full-screen menu is open; Esc closes; focus moves into the panel. */
export function useOverlay(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement | null>) {
  const path = usePathname();
  const lastPath = useRef(path);
  useEffect(() => {
    if (lastPath.current === path) return;
    lastPath.current = path;
    onClose();
  }, [path, onClose]);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('[data-autofocus], a, button, input')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const f = Array.from(panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'));
        if (!f.length) return;
        const a = f[0]!;
        const z = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      html.style.overflow = before;
      prev?.focus?.();
    };
  }, [open, onClose, panel]);
}

/** True once the page has scrolled past `y` (rAF-throttled, passive). */
export function useScrolled(y = 24) {
  const [s, setS] = useState(false);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setS(window.scrollY > y));
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
    };
  }, [y]);
  return s;
}

/** A CMS hero slide joined with its product (built on the server in [brand]/page.tsx). */
export interface HeroSlideView {
  eyebrow: string;
  title: string;
  sub: string;
  img: string;
  href: string;
  price: number;
  model: string;
  name: string;
  kind: string;
  features: string[];
  /** CMS button label; empty = the brand's default label. */
  cta: string;
  /** Linked product (CMS pid) for the quick add-to-cart; empty when the product is out of stock. */
  pid: string;
  layout: 'product' | 'photo';
  imgMobile: string;
  theme: 'dark' | 'light';
  align: 'left' | 'center' | 'right';
  focal: string;
  /** False when the CMS sets price 0 (e.g. a brand/campaign slide). */
  showPrice: boolean;
}

export interface HeroLabels {
  shopNow: string;
  seeDeals: string;
  perMonth: string;
  withAdvance: string;
  pause: string;
  play: string;
  slideN: string;
  discover: string;
  scrollHint: string;
  addToCart: string;
}

/** Split a headline into display lines: at sentence/comma breaks, else into two balanced halves. */
export function headlineLines(title: string): string[] {
  const parts = title.split(/(?<=[,.;:!?])\s+/).filter(Boolean);
  if (parts.length > 1) return parts;
  const w = title.split(/\s+/);
  if (w.length < 4) return [title];
  const mid = Math.ceil(w.length / 2);
  return [w.slice(0, mid).join(' '), w.slice(mid).join(' ')];
}

export interface MobileMenuProps {
  brand: 'mruk' | 'skywood';
  brandName: string;
  cats: {
    id: string;
    name: string;
    short: string;
    img: string;
    count: number;
    subs: string[];
  }[];
  announcement: string;
  labels: {
    menu: string;
    close: string;
    openMenu: string;
    search: string;
    searchShort: string;
    productsN: string;
    helpAndServices: string;
    deals: string;
    track: string;
    suppliers: string;
    support: string;
    allBrands: string;
    allBrandsHref: string;
    compare: string;
    salaryAdvance: string;
    salaryAdvanceSub: string;
    payLater: string;
  };
}

/** Open/close state + overlay behaviour for the phone menus. */
export function useMobileMenu() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOverlay(open, close, panel);
  return { open, setOpen, close, panel };
}
