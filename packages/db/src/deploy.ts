/**
 * Build-time database setup for hosted environments (Vercel + Supabase).
 * Runs only when DB_SETUP_ON_BUILD=true:
 *   1. prisma db push  — create/update tables (refuses changes that would lose data)
 *   2. lock the Supabase Data API: enable Row Level Security on every table and
 *      revoke access for the public API roles (the app connects as the owner, which bypasses RLS)
 *   3. load the demo catalogue and data only when the database is empty
 */
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const on = process.env.DB_SETUP_ON_BUILD === 'true';
if (!on) {
  console.log('[db:deploy] DB_SETUP_ON_BUILD is not "true" — skipping database setup.');
  if (process.env.VERCEL) {
    const missing = ['DATABASE_URL', 'DIRECT_URL', 'ENCRYPTION_KEY', 'SESSION_SECRET'].filter((k) => !process.env[k]);
    if (missing.length)
      console.warn(`[db:deploy] WARNING: ${missing.join(', ')} not set for this Vercel environment (${process.env.VERCEL_ENV}). The site will not work until they are added in Settings › Environment Variables with "${process.env.VERCEL_ENV}" ticked.`);
  }
  process.exit(0);
}
if (!process.env.DIRECT_URL) {
  console.error('[db:deploy] DIRECT_URL is missing (Supabase: the session pooler connection string, port 5432).');
  process.exit(1);
}

const direct = { ...process.env, DATABASE_URL: process.env.DIRECT_URL };

console.log('[db:deploy] Applying schema…');
execSync('prisma db push --skip-generate', { stdio: 'inherit', env: process.env });

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

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
  await lockDataApi();
  const brands = await prisma.brand.count();
  await prisma.$disconnect();
  if (brands === 0) {
    console.log('[db:deploy] Empty database — loading demo data…');
    execSync('tsx src/seed.ts', { stdio: 'inherit', env: direct });
  } else {
    console.log('[db:deploy] Data already present — not seeding.');
  }
}

main().catch(async (e) => {
  console.error('[db:deploy] failed:', e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
