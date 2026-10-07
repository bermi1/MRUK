/**
 * Tanzanian mobile numbers: +255 followed by 9 digits starting 6 or 7
 * (e.g. +255 754 000 214). Accepts 07XX…, 7XX…, 2557XX…, +255 7XX….
 */
export function normalizeTzPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = String(input).replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('00255')) d = d.slice(5);
  else if (d.startsWith('255')) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  if (!/^[67]\d{8}$/.test(d)) return null;
  return `+255${d}`;
}

export function isTzPhone(input: string | null | undefined): boolean {
  return normalizeTzPhone(input) !== null;
}

/** "+255754000214" -> "+255 754 000 214" */
export function formatTzPhone(input: string | null | undefined): string {
  const n = normalizeTzPhone(input);
  if (!n) return input ?? '';
  const d = n.slice(4);
  return `+255 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

/** Mask for receipts and logs: "+255 754 ••• 214" */
export function maskTzPhone(input: string | null | undefined): string {
  const f = formatTzPhone(input);
  const parts = f.split(' ');
  if (parts.length !== 4) return '•••';
  return `${parts[0]} ${parts[1]} ••• ${parts[3]}`;
}

/** wa.me wants digits only. */
export function waDigits(input: string): string {
  return input.replace(/\D/g, '');
}
