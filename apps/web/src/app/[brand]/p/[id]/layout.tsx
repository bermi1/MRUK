import { notFound } from 'next/navigation';
import { getProduct, isBrandKey } from '@/server/catalog';

/**
 * Real 404 status for unknown products. The page streams behind loading.tsx, and a notFound()
 * thrown after the stream starts can only send a "soft 404" (200 + noindex). This layout sits
 * above that Suspense boundary, so the check runs before any byte is sent (cached read).
 */
export default async function ProductLayout({ children, params }: { children: React.ReactNode; params: Promise<{ brand: string; id: string }> }) {
  const { brand, id } = await params;
  if (!isBrandKey(brand)) notFound();
  await getProduct(brand, id);
  return children;
}
