import { prisma } from '@bt/db';
import { adminFilters, isoDayEAT, staffForRoute } from '@/server/admin/context';
import { subscriberWhere } from '@/server/admin/marketing';
import { audit } from '@/server/audit';

export const dynamic = 'force-dynamic';

function cell(v: string | number): string {
  const s = String(v);
  // Neutralise spreadsheet formulas (CSV injection) and quote when needed.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Subscriber list as CSV. Contains personal data: Super admin and Store manager only, audit-logged. */
export async function GET(req: Request) {
  const ctx = await staffForRoute();
  if (!ctx) return new Response('Sign in required', { status: 401 });
  if (!ctx.can('marketing') || !['owner', 'manager'].includes(ctx.role)) return new Response('Forbidden', { status: 403 });
  const url = new URL(req.url);
  const sp = Object.fromEntries(['q', 'channel', 'status'].map((k) => [k, url.searchParams.get(k)?.slice(0, 60) ?? undefined]));
  const f = await adminFilters(ctx);
  const rows = await prisma.subscriber.findMany({ where: subscriberWhere(f.brands, sp), orderBy: { createdAt: 'asc' }, take: 100_000 });
  const lines = [['Brand', 'Name', 'Phone', 'Email', 'SMS', 'WhatsApp', 'Email opt-in', 'Source', 'Consent', 'Unsubscribed', 'Signed up'].join(',')];
  for (const s of rows) {
    lines.push(
      [s.brandKey === 'mruk' ? 'Mr UK' : 'Skywood', s.name, s.phone ?? '', s.email ?? '', s.smsOptIn ? 'yes' : 'no', s.whatsappOptIn ? 'yes' : 'no', s.emailOptIn ? 'yes' : 'no', s.source, s.consentAt?.toISOString() ?? '', s.unsubscribedAt?.toISOString() ?? '', s.createdAt.toISOString()]
        .map(cell)
        .join(','),
    );
  }
  await audit(ctx.email, 'subscriber.export', 'Subscriber', '', { rows: rows.length, brands: f.brands, filters: { channel: sp.channel ?? null, status: sp.status ?? 'active', search: !!sp.q } });
  return new Response(`﻿${lines.join('\r\n')}\r\n`, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="subscribers-${isoDayEAT(new Date())}.csv"`, 'Cache-Control': 'no-store' },
  });
}
