import Link from 'next/link';
import { ArrowRightIcon } from '../icons';

/**
 * "Pay Later by Azania Bank" banner, reused on deals, category and shop pages.
 * One row on desktop (logo · text · action), stacked on phones. Styled per brand (.plb-mruk / .plb-skywood).
 */
export function PayLaterBanner({ brand, title, sub, cta, href, className = '' }: { brand: 'mruk' | 'skywood'; title: string; sub: string; cta: string; href: string; className?: string }) {
  return (
    <aside className={`plb plb-${brand} ${className}`} aria-label={title}>
      <span className="plb-logo">
        <img src={brand === 'skywood' ? '/brand/azania-bank-white.png' : '/brand/azania-bank.png'} alt="Azania Bank" width={46} height={36} loading="lazy" />
      </span>
      <span className="plb-text">
        <b>{title}</b>
        <span>{sub}</span>
      </span>
      <Link href={href} className="plb-cta">
        {cta}
        <ArrowRightIcon size={16} strokeWidth={1.8} />
      </Link>
    </aside>
  );
}
