/**
 * Supabase connection helpers. When only SUPABASE_URL and SUPABASE_DB_PASSWORD are
 * configured, the build finds the project's pooler region by probing Supabase's
 * regional pooler hosts, and stores the host in pooler.generated.json so the
 * running app can build the same connection string.
 */
import pooler from './pooler.generated.json';

const REGIONS = [
  'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-2', 'eu-north-1',
  'ap-south-1', 'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ca-central-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'sa-east-1',
];

export function supabaseRef(): string | null {
  const m = /^https:\/\/([a-z0-9]{20})\.supabase\.co/.exec(process.env.SUPABASE_URL ?? '');
  return m ? m[1]! : null;
}

export function poolerUrls(host: string, ref: string, password: string) {
  const user = `postgres.${ref}`;
  const pw = encodeURIComponent(password);
  return {
    // Transaction pooler for the running app (many short serverless connections).
    runtime: `postgresql://${user}:${pw}@${host}:6543/postgres?pgbouncer=true&connection_limit=1`,
    // Session pooler for schema changes and seeding.
    direct: `postgresql://${user}:${pw}@${host}:5432/postgres`,
  };
}

/** Connection string for the running app when DATABASE_URL is not set explicitly. */
export function derivedRuntimeUrl(): string | undefined {
  if (process.env.DATABASE_URL) return undefined;
  const ref = supabaseRef();
  const pw = process.env.SUPABASE_DB_PASSWORD;
  if (!pooler.host || !ref || !pw) return undefined;
  return poolerUrls(pooler.host, ref, pw).runtime;
}

export const discoveredPoolerHost = pooler.host;

export type ProbeResult = { host: string } | { error: string };

/** Try every regional pooler host; the right one accepts our tenant (postgres.<ref>). */
export async function discoverPoolerHost(ref: string, password: string): Promise<ProbeResult> {
  const { Client } = await import('pg');
  const hosts = REGIONS.flatMap((r) => [`aws-0-${r}.pooler.supabase.com`, `aws-1-${r}.pooler.supabase.com`]);
  let wrongPassword: string | null = null;
  const attempt = async (host: string) => {
    const c = new Client({ host, port: 5432, user: `postgres.${ref}`, password, database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
    try {
      await c.connect();
      await c.end();
      return host;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/password authentication failed/i.test(msg)) wrongPassword = host;
      throw e;
    } finally {
      c.end().catch(() => undefined);
    }
  };
  try {
    const host = await Promise.any(hosts.map(attempt));
    return { host };
  } catch {
    if (wrongPassword) return { error: `Found the project at ${wrongPassword}, but the database password was rejected. Check SUPABASE_DB_PASSWORD (the plain password, not encoded).` };
    return { error: 'Could not find the Supabase project in any region. Check SUPABASE_URL, or set DATABASE_URL and DIRECT_URL from Supabase › Connect.' };
  }
}
