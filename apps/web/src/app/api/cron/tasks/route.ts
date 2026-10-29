import { timingSafeEqual } from 'node:crypto';
import { audit } from '@/server/audit';
import { env } from '@/server/env';
import { sweepTasks } from '@/server/task-sweep';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorised(req: Request): boolean {
  if (env.CRON_SECRET.length < 16) return false; // not configured: refuse everything
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/**
 * Task sweep (any scheduler, e.g. every 15 minutes; Vercel Cron runs it daily):
 * ticket SLA escalations, low stock, missing photos, expired payment reservations,
 * and closing tasks whose record moved on. Requires "Authorization: Bearer <CRON_SECRET>".
 * The admin dashboard also runs it at most every 5 minutes while staff are signed in.
 */
async function handle(req: Request) {
  if (!authorised(req)) return Response.json({ error: 'Unauthorised' }, { status: 401 });
  const result = await sweepTasks();
  if (result.escalated || result.closed || result.expired) await audit('system:cron', 'cron.tasks', 'StaffTask', '', result);
  return Response.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
}

export const GET = handle;
export const POST = handle;
