import { NextResponse } from 'next/server';
import { invoiceFile } from '@/server/orders';
import { loadOrder } from '@/server/orderview';
import { currentCustomer, verifySigned } from '@/server/session';

export async function GET(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const o = await loadOrder(number);
  const inv = o?.invoices[0];
  if (!o || !inv) return new NextResponse('Not found', { status: 404 });
  const token = new URL(req.url).searchParams.get('t');
  const c = await currentCustomer();
  if (!verifySigned(`order:${o.number}`, token) && !(c && (o.customerId === c.id || o.contactPhone === c.phone))) return new NextResponse('Not found', { status: 404 });
  const f = await invoiceFile(inv.number);
  if (!f) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(Buffer.from(f.data), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${inv.number}.pdf"`, 'Cache-Control': 'private, no-store' } });
}
