import type { Prisma } from '@bt/db';

/**
 * What a customer may see and buy in the store: published (not hidden), with at least one photo and with
 * something to read (a description or at least one feature). Products that miss a photo or any text stay in
 * the admin (with a "needs photo" task) and appear in the store as soon as staff add them.
 */
export const LISTABLE = {
  hidden: false,
  images: { isEmpty: false },
  OR: [{ description: { not: '' } }, { features: { isEmpty: false } }],
} satisfies Prisma.ProductWhereInput;

/** Same rule for a product already loaded (guards against an empty string saved as the only photo). */
export const isListable = (p: { hidden: boolean; images: string[]; description?: string | null; features: string[] }) =>
  !p.hidden && p.images.some((u) => u.trim() !== '') && (!!p.description?.trim() || p.features.some((f) => f.trim() !== ''));
