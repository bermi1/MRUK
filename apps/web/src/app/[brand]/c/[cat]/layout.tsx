import { notFound } from 'next/navigation';
import { getCategories, isBrandKey } from '@/server/catalog';

/** Real 404 status for unknown categories (checked above loading.tsx's Suspense boundary; see p/[id]/layout.tsx). */
export default async function CategoryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ brand: string; cat: string }> }) {
  const { brand, cat } = await params;
  if (!isBrandKey(brand)) notFound();
  if (cat !== 'all' && !(await getCategories(brand)).some((c) => c.id === cat)) notFound();
  return children;
}
