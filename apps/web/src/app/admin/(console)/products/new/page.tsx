import { ProductEditor } from '@/components/admin/ProductEditor';
import { Forbidden } from '@/components/admin/ui';
import { adminFilters, pickBrand } from '@/server/admin/context';
import { editorCategories } from '@/server/admin/products';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Add a product' };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('products.write')) return <Forbidden what="adding products" />;
  const f = await adminFilters(ctx);
  const brand = pickBrand(ctx, f, (await searchParams).b);
  if (!brand) return <Forbidden what="any brand catalogue" />;
  const categories = await editorCategories(f.allowed);
  const first = categories[brand]?.[0];
  return (
    <ProductEditor
      brands={f.allowed as ('mruk' | 'skywood')[]}
      categories={categories}
      initial={{ brand, category: first?.slug ?? '', sub: first?.subs[0] ?? '', model: '', name: '', price: '', stock: '10', features: [], description: '', specs: [{ label: 'Capacity', value: '' }, { label: 'Power', value: '' }, { label: 'Warranty', value: '' }], images: [], hidden: false }}
    />
  );
}
