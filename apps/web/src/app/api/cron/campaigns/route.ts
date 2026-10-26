import { timingSafeEqual } from 'node:crypto';
import { audit } from '@/server/audit';
import { env } from '@/server/env';
import { expirePoints } from '@/server/loyalty';
import { runDueCampaigns } from '@/server/marketing';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorised(req: Request): boolean {
  if (env.CRON_SECRET.length < 16) return false; // not configured: refuse everything
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/**
 * Scheduled job (Vercel Cron, see apps/web/vercel.json, or any scheduler):
 * sends scheduled campaigns that are due, resumes interrupted ones, and expires old loyalty points.
 * Requires "Authorization: Bearer <CRON_SECRET>".
 */
async function handle(req: Request) {
  if (!authorised(req)) return Response.json({ error: 'Unauthorised' }, { status: 401 });
  const campaigns = await runDueCampaigns();
  let expired = 0;
  try {
    expired = await expirePoints();
  } catch (e) {
    console.error('[cron loyalty]', e instanceof Error ? e.message : 'unknown error');
  }
  if (campaigns.length || expired) await audit('system:cron', 'cron.campaigns', 'Campaign', '', { campaigns, pointsExpired: expired });
  return Response.json({ ok: true, campaigns, pointsExpired: expired }, { headers: { 'Cache-Control': 'no-store' } });
}

export const GET = handle;
export const POST = handle;
