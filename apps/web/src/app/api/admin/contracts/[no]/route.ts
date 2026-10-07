import { staffForRoute } from '@/server/admin/context';
import { audit } from '@/server/audit';
import { contractFile } from '@/server/orders';

export const dynamic = 'force-dynamic';

/** Salary Advance contract PDF for staff with 'advance' permission and access to the order's brand. */
export async function GET(_req: Request, { params }: { params: Promise<{ no: string }> }) {
  const no = (await params).no;
  if (!/^AZB-SA-\d{3,10}$/.test(no)) return new Response('Not found', { status: 404 });
  const ctx = await staffForRoute();
  if (!ctx) return new Response('Sign in required', { status: 401 });
  if (!ctx.can('advance')) return new Response('Forbidden', { status: 403 });
  const f = await contractFile(no);
  if (!f || !ctx.canBrand(f.order.brandKey)) return new Response('Not found', { status: 404 });
  await audit(ctx.email, 'contract.view', 'Contract', no);
  return new Response(Buffer.from(f.data), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${no}.pdf"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
