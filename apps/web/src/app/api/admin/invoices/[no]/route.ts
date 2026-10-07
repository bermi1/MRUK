import { staffForRoute } from '@/server/admin/context';
import { invoiceFile } from '@/server/orders';

export const dynamic = 'force-dynamic';

/** Tax invoice PDF for staff with 'invoices' permission and access to the order's brand. */
export async function GET(_req: Request, { params }: { params: Promise<{ no: string }> }) {
  const no = (await params).no;
  if (!/^INV-\d{4}-\d{3,8}$/.test(no)) return new Response('Not found', { status: 404 });
  const ctx = await staffForRoute();
  if (!ctx) return new Response('Sign in required', { status: 401 });
  if (!ctx.can('invoices')) return new Response('Forbidden', { status: 403 });
  const f = await invoiceFile(no);
  if (!f || !ctx.canBrand(f.order.brandKey)) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(f.data), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${no}.pdf"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
