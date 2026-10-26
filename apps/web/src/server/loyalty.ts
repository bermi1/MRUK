import 'server-only';

/**
 * TEMPORARY STUB — the marketing/loyalty backend (another engineer) replaces this file at merge.
 * Contract (do not change): getLoyalty(customerId, brand) → points, tier, value, next tier.
 */
export async function getLoyalty(
  customerId: string,
  brand: 'mruk' | 'skywood',
): Promise<{ points: number; tier: 'Member' | 'Silver' | 'Gold'; valueTzs: number; nextTier: string | null; pointsToNext: number }> {
  void customerId;
  void brand;
  return { points: 0, tier: 'Member', valueTzs: 0, nextTier: null, pointsToNext: 0 };
}
