import { NextResponse, type NextRequest } from 'next/server';
import { normalizeTzPhone } from '@bt/core';
import { currentAzaniaCustomer } from '@/server/mini/azania';
import { contractFile } from '@/server/orders';

export const dynamic = 'force-dynamic';

/** Contract PDF for the signed-in Azania mini app customer (bt_azania cookie; must match the order's phone). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  if (!/^AZB-SA-\d{1,9}$/.test(no)) return new NextResponse('Not found', { status: 404 });
  const customer = await currentAzaniaCustomer();
  if (!customer) return new NextResponse('Open this from the Azania Bank app', { status: 401 });
  const phone = normalizeTzPhone(customer.phone);
  const f = phone ? await contractFile(no) : null;
  // Same 404 for "missing" and "not yours" so contract numbers can't be probed.
  if (!f || normalizeTzPhone(f.order.contactPhone) !== phone || f.order.channel !== 'azania') {
    return new NextResponse('Not found', { status: 404 });
  }
  return new NextResponse(Buffer.from(f.data), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${no}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
