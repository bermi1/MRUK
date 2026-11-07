'use client';
import { stockState } from '@bt/core';
import { useMessages } from './Messages';

/** "Only N left" / "Out of stock" under a product (nothing when stock is healthy, unless `always`). */
export function StockNote({ stock, className = 'stock-note', always = false }: { stock: number; className?: string; always?: boolean }) {
  const t = useMessages();
  const s = stockState(stock);
  if (s === 'in' && !always) return null;
  return (
    <span className={`${className} is-${s}`} data-testid="stock-note" data-stock={s}>
      {s === 'out' ? t('outOfStock') : s === 'low' ? t('onlyLeft', { n: stock }) : t('inStock', { n: stock })}
    </span>
  );
}
