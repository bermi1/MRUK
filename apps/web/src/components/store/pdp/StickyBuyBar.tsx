'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addToCartAction } from '@/app/actions/store';
import { img } from '@/lib/img';
import { useToast } from '../Toast';

/**
 * Compact bar that slides up from the bottom once the main Add to cart buttons scroll out of view
 * (watches #pdp-buy-sentinel, placed right after the BuyBox). Same add-to-cart action as the BuyBox.
 */
export function StickyBuyBar({ brand, id, name, model, image, price, monthly, stock, labels }: { brand: string; id: string; name: string; model: string; image: string; price: string; monthly: string; stock: number; labels: { addToCart: string; outOfStock: string } }) {
  const [shown, setShown] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const out = stock <= 0;

  useEffect(() => {
    const el = document.getElementById('pdp-buy-sentinel');
    if (!el) return;
    // A passive scroll check (rAF-throttled) rather than IntersectionObserver: a fast jump from
    // below the fold to past the buttons never changes "isIntersecting", so IO would miss it.
    let raf = 0;
    const check = () => {
      raf = 0;
      setShown(el.getBoundingClientRect().top < 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
      delete document.documentElement.dataset.pdpSticky;
    };
  }, []);

  // Lets the WhatsApp button, compare tray and toasts move up above the bar while it shows.
  useEffect(() => {
    if (shown) document.documentElement.dataset.pdpSticky = '';
    else delete document.documentElement.dataset.pdpSticky;
  }, [shown]);

  const add = () =>
    start(async () => {
      const r = await addToCartAction(brand, id);
      if (!r.ok) return toast(r.error);
      router.push(`/${brand}/cart`);
    });

  return (
    <div className={`pdp-sticky ${shown ? 'is-shown' : ''}`} aria-hidden={!shown} inert={!shown} data-testid="sticky-buy">
      <div className="pdp-sticky-in">
        {image ? <img className="pdp-sticky-img" src={img(image, 96)} alt="" loading="lazy" /> : <span className="pdp-sticky-img" aria-hidden="true" />}
        <div className="pdp-sticky-t">
          <span className="pdp-sticky-n">{name}</span>
          <span className="pdp-sticky-m">{model}</span>
        </div>
        <div className="pdp-sticky-p">
          <b>{price}</b>
          {monthly && <span className="monthly">{monthly}</span>}
        </div>
        <button type="button" className="btn btn-primary pdp-sticky-btn" disabled={pending || out} onClick={add} data-testid="sticky-add">
          {out ? labels.outOfStock : pending ? '…' : labels.addToCart}
        </button>
      </div>
    </div>
  );
}
