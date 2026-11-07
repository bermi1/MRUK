import { stockState } from '@bt/core';

export { LOW_STOCK, stockState } from '@bt/core';
export { fmtTZS as fmt, fmtTZSCompact, fmtDate, fmtDateTime, formatTzPhone, maskTzPhone } from '@bt/core';

export function stockLabel(stock: number): string {
  const s = stockState(stock);
  return s === 'out' ? 'Out of stock' : s === 'low' ? `Only ${stock} left` : `${stock} in stock`;
}

export function stockColor(stock: number): string {
  return stockState(stock) === 'in' ? '#16825D' : '#B4462E';
}

/** Short model label for image-less tiles (prototype: strip UK/SKY prefix, 14 chars). */
export function modelShort(model: string): string {
  return model.replace(/^(UK|SKY)[-\s]*/i, '').slice(0, 14);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function waLink(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}
