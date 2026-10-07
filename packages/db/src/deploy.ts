/**
 * Build-time database setup for hosted environments (Vercel + Supabase).
 * Runs only when DB_SETUP_ON_BUILD=true:
 *   1. prisma db push  — create/update tables (refuses changes that would lose data)
 *   2. lock the Supabase Data API: enable Row Level Security on every table and
 *      revoke access for the public API roles (the app connects as the owner, which bypasses RLS)
 *   3. load the demo catalogue and data only when the database is empty
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { discoverPoolerHost, poolerUrls, supabaseRef } from './supabase';

// Accept true/True/"true"/1/yes. On Vercel, run automatically when the database settings
// are present, unless DB_SETUP_ON_BUILD is explicitly false.
const flag = (process.env.DB_SETUP_ON_BUILD ?? '').trim().replace(/^["']|["']$/g, '').toLowerCase();
const canConnect = !!process.env.DIRECT_URL || (!!process.env.SUPABASE_DB_PASSWORD && !!supabaseRef());
const on = ['true', '1', 'yes'].includes(flag) || (!!process.env.VERCEL && canConnect && !['false', '0', 'no'].includes(flag));
if (!on) {
  console.log('[db:deploy] Database setup skipped (DB_SETUP_ON_BUILD not true, or DIRECT_URL not set).');
  if (process.env.VERCEL) {
    const missing = ['ENCRYPTION_KEY', 'SESSION_SECRET', ...(canConnect ? [] : ['DIRECT_URL or SUPABASE_DB_PASSWORD'])].filter((k) => !process.env[k]);
    if (missing.length)
      console.warn(`[db:deploy] WARNING: ${missing.join(', ')} not set for this Vercel environment (${process.env.VERCEL_ENV}). The site will not work until they are added in Settings › Environment Variables with "${process.env.VERCEL_ENV}" ticked.`);
  }
  process.exit(0);
}
const here = dirname(fileURLToPath(import.meta.url));

async function resolveConnection() {
  if (process.env.DIRECT_URL) return;
  const ref = supabaseRef();
  const pw = process.env.SUPABASE_DB_PASSWORD;
  if (!ref || !pw) {
    console.error('[db:deploy] Set DIRECT_URL, or SUPABASE_URL + SUPABASE_DB_PASSWORD.');
    process.exit(1);
  }
  console.log('[db:deploy] Finding the Supabase pooler region…');
  const r = await discoverPoolerHost(ref, pw);
  if ('error' in r) {
    console.error(`[db:deploy] ${r.error}`);
    process.exit(1);
  }
  console.log(`[db:deploy] Supabase pooler: ${r.host}`);
  // Baked into the app bundle so the running site uses the same address.
  writeFileSync(resolve(here, 'pooler.generated.json'), JSON.stringify({ host: r.host }) + '\n');
  const urls = poolerUrls(r.host, ref, pw);
  process.env.DIRECT_URL = urls.direct;
  process.env.DATABASE_URL ??= urls.runtime;
}

let prisma: PrismaClient;

async function lockDataApi() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  const roles = await prisma.$queryRaw<{ rolname: string }[]>`SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')`;
  for (const { tablename } of tables) {
    const t = `"public"."${tablename.replace(/"/g, '""')}"`;
    await prisma.$executeRawUnsafe(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    for (const { rolname } of roles) await prisma.$executeRawUnsafe(`REVOKE ALL ON TABLE ${t} FROM "${rolname}"`);
  }
  console.log(`[db:deploy] Row Level Security on ${tables.length} tables; public API roles revoked: ${roles.map((r) => r.rolname).join(', ') || 'none'}.`);
}

async function main() {
  await resolveConnection();
  console.log('[db:deploy] Applying schema…');
  execSync('prisma db push --skip-generate', { stdio: 'inherit', env: process.env });
  prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
  await lockDataApi();
  const brands = await prisma.brand.count();
  await prisma.$disconnect();
  if (brands === 0) {
    console.log('[db:deploy] Empty database — loading demo data…');
    execSync('tsx src/seed.ts', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL } });
  } else {
    console.log('[db:deploy] Data already present — not seeding.');
  }
}

main().catch(async (e) => {
  console.error('[db:deploy] failed:', e instanceof Error ? e.message : e);
  await prisma?.$disconnect();
  process.exit(1);
});
