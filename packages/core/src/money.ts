/** Tanzanian shilling formatting. Prices are whole shillings, no decimals. */
export function fmtTZS(n: number): string {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  const sign = v < 0 ? '-' : '';
  return `${sign}TZS ${Math.abs(v).toLocaleString('en-US')}`;
}

/** Compact form for dashboards: TZS 84.2M, TZS 1.2K. */
export function fmtTZSCompact(n: number): string {
  const v = Math.abs(n);
  if (v >= 1_000_000_000) return `TZS ${(n / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `TZS ${(n / 1_000).toFixed(1)}K`;
  return fmtTZS(n);
}

/** Parse user input like "1,500,000" or "TZS 1 500 000" into an integer. */
export function parseAmount(input: string | number | null | undefined): number {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input) : 0;
  if (!input) return 0;
  const digits = String(input).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}
