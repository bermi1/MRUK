import { notFound } from 'next/navigation';
import { prisma } from '@bt/db';
import { ProductEditor } from '@/components/admin/ProductEditor';
import { Forbidden } from '@/components/admin/ui';
import { adminFilters } from '@/server/admin/context';
import { editorCategories } from '@/server/admin/products';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Edit product' };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const ctx = await requireStaff();
  if (!ctx.can('products.write')) return <Forbidden what="editing products" />;
  const { id } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(id)) notFound();
  const f = await adminFilters(ctx);
  const p = await prisma.product.findFirst({ where: { id, brandKey: { in: f.allowed } }, include: { category: { select: { slug: true } } } });
  if (!p) notFound();
  const categories = await editorCategories([p.brandKey]);
  const specs = Array.isArray(p.specs) ? (p.specs as { label: string; value: string }[]) : [];
  return (
    <div className="ad-stack">
      {(await searchParams).created === '1' && (
        <div className="ad-msg ok" role="status" style={{ fontSize: 14 }}>
          {p.hidden ? `${p.name} saved (hidden from the store).` : `${p.name} is live in the store.`} You can keep editing below.
        </div>
      )}
      <ProductEditor
        brands={[p.brandKey as 'mruk' | 'skywood']}
        categories={categories}
        initial={{ id: p.id, brand: p.brandKey as 'mruk' | 'skywood', category: p.category.slug, sub: p.sub, model: p.model, name: p.name, price: p.price.toLocaleString('en-US'), stock: String(p.stock), features: p.features, description: p.description, specs, images: p.images, hidden: p.hidden }}
      />
    </div>
  );
}
