/** Delivery regions and fees (prototype defaults; editable later in admin). */
export const REGIONS = [
  { name: 'Dar es Salaam', fee: 15000, eta: 'tomorrow' },
  { name: 'Arusha', fee: 35000, eta: '2–4 days' },
  { name: 'Mwanza', fee: 35000, eta: '2–4 days' },
  { name: 'Dodoma', fee: 30000, eta: '2–4 days' },
  { name: 'Mbeya', fee: 35000, eta: '2–4 days' },
  { name: 'Zanzibar', fee: 40000, eta: '2–4 days' },
] as const;

export type RegionName = (typeof REGIONS)[number]['name'];

/** Free delivery in Dar es Salaam on orders of TZS 500,000 or more. */
export const FREE_DELIVERY_THRESHOLD = 500_000;

export function isRegion(name: string): name is RegionName {
  return REGIONS.some((r) => r.name === name);
}

export function deliveryFee(region: string, subtotal: number): number {
  const r = REGIONS.find((x) => x.name === region);
  if (!r) throw new Error(`Unknown region: ${region}`);
  if (r.name === 'Dar es Salaam' && subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  return r.fee;
}

export function deliveryEta(region: string): string {
  return REGIONS.find((x) => x.name === region)?.eta ?? '2–4 days';
}
