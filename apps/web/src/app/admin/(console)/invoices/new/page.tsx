import { prisma } from '@bt/db';
import { InvoiceBuilder } from '@/components/admin/InvoiceBuilder';
import { Forbidden } from '@/components/admin/ui';
import { adminFilters } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Create invoice' };

export default async function NewInvoicePage() {
  const ctx = await requireStaff();
  if (!ctx.can('invoices.write')) return <Forbidden what="creating invoices" />;
  const f = await adminFilters(ctx);
  const brands = (f.brand === 'all' ? f.allowed : [f.brand, ...f.allowed.filter((b) => b !== f.brand)]) as ('mruk' | 'skywood')[];
  const products = await prisma.product.findMany({ where: { brandKey: { in: f.allowed } }, orderBy: [{ name: 'asc' }], select: { id: true, brandKey: true, model: true, name: true, price: true, stock: true } });
  return <InvoiceBuilder brands={brands} products={products.map((p) => ({ id: p.id, brand: p.brandKey as 'mruk' | 'skywood', model: p.model, name: p.name, price: p.price, stock: p.stock }))} />;
}
