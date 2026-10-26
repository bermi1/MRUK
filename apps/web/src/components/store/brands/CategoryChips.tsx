import Link from 'next/link';
import type { CategoryView } from '@/lib/types';
import { CatGlyph, glyphKind } from '../CatGlyph';

/** Phone shortcut row under the app bar: every category, Pay Later and Deals, one tap away. */
export function CategoryChips({ brand, cats, payLater, deals }: { brand: 'mruk' | 'skywood'; cats: CategoryView[]; payLater: string; deals: string }) {
  const b = `/${brand}`;
  return (
    <nav className={`chips-row chips-${brand} m-only m-flex nsb`} aria-label="Categories">
      {cats.map((c) => (
        <Link key={c.id} href={`${b}/c/${c.id}`} className="chip2">
          {brand === 'mruk' && <CatGlyph kind={glyphKind(c.id, c.name)} className="chip2-ico" strokeWidth={3} />}
          {c.short}
        </Link>
      ))}
      <Link href={`${b}/pay-later`} className="chip2 chip2-pl">
        {payLater}
      </Link>
      <Link href={`${b}/deals`} className="chip2">
        {deals}
      </Link>
    </nav>
  );
}
