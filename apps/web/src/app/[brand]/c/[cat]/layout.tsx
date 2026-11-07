import { notFound, permanentRedirect } from 'next/navigation';
import type { BrandKey } from '@/lib/types';
import { getCategories, isBrandKey } from '@/server/catalog';

/**
 * Runs before the loading.tsx boundary starts streaming, so an unknown category answers
 * with a real 404 status (and /c/all with a real redirect) instead of a 200 "soft 404".
 */
export default async function CategoryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ brand: string; cat: string }> }) {
  const { brand, cat } = await params;
  if (!isBrandKey(brand)) notFound();
  if (cat === 'all') permanentRedirect(`/${brand}/shop`);
  if (!(await getCategories(brand as BrandKey)).some((c) => c.id === cat)) notFound();
  return children;
}
