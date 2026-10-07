import { NextResponse } from 'next/server';
import { discoveredPoolerHost, prisma } from '@bt/db';

/**
 * Deployment self-check. Reports which settings are present (never their values),
 * whether the database is reachable, and whether tables and data exist.
 */
export const dynamic = 'force-dynamic';

const REQUIRED = ['DATABASE_URL', 'DIRECT_URL', 'ENCRYPTION_KEY', 'SESSION_SECRET', 'APP_URL'] as const;
const OPTIONAL = ['STORAGE_ADAPTER', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_DB_PASSWORD', 'DEMO_MODE', 'DB_SETUP_ON_BUILD'] as const;

function describeUrl(name: string) {
  const v = process.env[name];
  if (!v) return 'missing';
  if (/^["']/.test(v)) return 'set, but starts with a quote mark — remove the quotes';
  try {
    const u = new URL(v);
    const notes = [`host ${u.hostname}`, `port ${u.port || '5432'}`];
    if ((v.split('://')[1] ?? '').split('@').length > 2) notes.push('WARNING: the password contains "@" — write it as %40');
    if (/^db\..+\.supabase\.co$/.test(u.hostname)) notes.push('WARNING: direct db.* address is IPv6-only and unreachable from Vercel — use the pooler address');
    if (name === 'DATABASE_URL' && u.port === '6543' && !u.searchParams.has('pgbouncer')) notes.push('WARNING: add ?pgbouncer=true&connection_limit=1');
    return `set (${notes.join(', ')})`;
  } catch {
    return 'set, but not a valid URL — a special character in the password (like @) must be written as %40';
  }
}

export async function GET() {
  const settings: Record<string, string> = {};
  for (const k of REQUIRED) settings[k] = k.endsWith('_URL') && k !== 'APP_URL' ? describeUrl(k) : process.env[k] ? 'set' : 'missing';
  for (const k of OPTIONAL) settings[k] = k === 'STORAGE_ADAPTER' || k === 'DEMO_MODE' || k === 'DB_SETUP_ON_BUILD' ? (process.env[k] ?? 'not set') : process.env[k] ? 'set' : 'not set';
  if (!process.env.DATABASE_URL && process.env.SUPABASE_DB_PASSWORD) {
    settings.DATABASE_URL = discoveredPoolerHost ? `derived from SUPABASE_URL + SUPABASE_DB_PASSWORD (pooler ${discoveredPoolerHost})` : 'derived, but the pooler region was not found during the build — redeploy and check the [db:deploy] lines in the build log';
    settings.DIRECT_URL = 'not needed (derived)';
  }
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) settings.SESSION_SECRET = 'set, but too short (needs 32+ characters)';
  if (process.env.ENCRYPTION_KEY && !/^[0-9a-f]{64}$/i.test(process.env.ENCRYPTION_KEY) && Buffer.from(process.env.ENCRYPTION_KEY, 'base64').length !== 32) settings.ENCRYPTION_KEY = 'set, but not 64 hex characters';

  let database: Record<string, unknown>;
  try {
    const tables = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM pg_tables WHERE schemaname = 'public'`;
    const n = Number(tables[0]?.n ?? 0);
    database = n === 0 ? { reachable: true, tables: 0, hint: 'Connected, but no tables. Redeploy so the build runs the database setup (DIRECT_URL must be set).' } : { reachable: true, tables: n, brands: await prisma.brand.count(), products: await prisma.product.count(), orders: await prisma.order.count(), staff: await prisma.staffUser.count() };
  } catch (e) {
    const code = (e as { errorCode?: string; code?: string }).errorCode ?? (e as { code?: string }).code ?? (e instanceof Error ? e.constructor.name : 'unknown');
    const hints: Record<string, string> = {
      P1000: 'Wrong database user or password.',
      P1001: 'Cannot reach the database server — check the host and port (use the Supabase pooler address).',
      P1012: 'DATABASE_URL is missing or invalid.',
      P1013: 'DATABASE_URL is not a valid connection string — encode special characters in the password (@ → %40).',
      P2021: 'Tables do not exist yet — redeploy so the build runs the database setup.',
    };
    database = { reachable: false, errorCode: code, hint: hints[code] ?? 'See the function logs in Vercel for details.' };
  }
  const ok = !Object.values(settings).some((v) => v.startsWith('missing') || v.startsWith('derived, but') || v.includes('WARNING') || v.includes('but')) && database.reachable === true && Number(database.products ?? 0) > 0;
  return NextResponse.json({ ok, environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV, settings, database }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
