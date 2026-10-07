export { fmtTZS as fmt, fmtTZSCompact, fmtDate, fmtDateTime, formatTzPhone, maskTzPhone } from '@bt/core';

export function stockLabel(stock: number): string {
  if (stock <= 0) return 'Out of stock';
  return stock <= 5 ? `Only ${stock} left` : `${stock} in stock`;
}

export function stockColor(stock: number): string {
  return stock <= 5 ? '#B4462E' : '#16825D';
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
