import { notFound } from 'next/navigation';
import { getProduct, isBrandKey } from '@/server/catalog';

/**
 * Runs before the loading.tsx boundary starts streaming, so an unknown or hidden product
 * answers with a real 404 status instead of a 200 "soft 404" (matters for search engines).
 */
export default async function ProductLayout({ children, params }: { children: React.ReactNode; params: Promise<{ brand: string; id: string }> }) {
  const { brand, id } = await params;
  if (!isBrandKey(brand)) notFound();
  await getProduct(brand, id);
  return children;
}
