import type { Metadata } from 'next';
import { Suppliers } from '@/components/store/Suppliers';
import type { BrandKey } from '@/lib/types';
import { getBrand, getSuppliers } from '@/server/catalog';
import { brandTitle, pageMeta } from '@/server/seo';


export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [brand, list] = await Promise.all([getBrand(key), getSuppliers(key)]);
  const cities = [...new Set(list.map((s) => s.city))];
  return pageMeta({ brand, path: '/suppliers', title: brandTitle('Showrooms and dealers in Tanzania', brand.name), description: `${list.length} ${brand.name} showrooms and dealers${cities.length ? ` in ${cities.join(', ')}` : ''}. Opening hours, phone numbers and map.` });
}

export default async function SuppliersPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [brand, list] = await Promise.all([getBrand(key), getSuppliers(key)]);
  return (
    <div className="wrap page-top">
      <Suppliers list={list.map((s) => ({ id: s.id, city: s.city, area: s.area, type: s.type, phone: s.phone, hours: s.hours, lat: s.lat, lng: s.lng }))} brandName={brand.name} />
    </div>
  );
}
