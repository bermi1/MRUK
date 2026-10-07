import type { Metadata } from 'next';
import { Suppliers } from '@/components/store/Suppliers';
import type { BrandKey } from '@/lib/types';
import { getBrand, getSuppliers } from '@/server/catalog';

export const metadata: Metadata = { title: 'Suppliers near you' };

export default async function SuppliersPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [brand, list] = await Promise.all([getBrand(key), getSuppliers(key)]);
  return (
    <div className="wrap page-top">
      <Suppliers list={list.map((s) => ({ id: s.id, city: s.city, area: s.area, type: s.type, phone: s.phone, hours: s.hours, lat: s.lat, lng: s.lng }))} brandName={brand.name} />
    </div>
  );
}
