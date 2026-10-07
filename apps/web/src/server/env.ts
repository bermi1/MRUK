import 'server-only';
import { z } from 'zod';

// `next build` loads server modules to collect page data; real settings are only
// required when the site runs, so the build never depends on secrets being present.
const building = process.env.NEXT_PHASE === 'phase-production-build';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: building ? z.string().default('') : z.string({ required_error: 'DATABASE_URL is not set (Vercel › Settings › Environment Variables, for this environment)' }).min(1),
  SESSION_SECRET: z.string().default(''),
  APP_URL: z.string().url().default('http://localhost:3000'),
  AZANIA_ADAPTER: z.enum(['mock', 'live']).default('mock'),
  AZANIA_SSO_SECRET: z.string().default('dev-mini-app-sso-secret'),
  SMS_ADAPTER: z.enum(['mock', 'live']).default('mock'),
  WHATSAPP_ADAPTER: z.enum(['mock', 'live']).default('mock'),
  STORAGE_ADAPTER: z.enum(['local', 'supabase', 's3']).default('local'),
  STORAGE_BUCKET: z.string().default('bt-files'),
  SUPABASE_URL: z.string().default(''),
  SUPABASE_SECRET_KEY: z.string().default(''),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),
  AI_ADAPTER: z.enum(['mock', 'anthropic']).default('mock'),
  ANTHROPIC_API_KEY: z.string().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-opus-5-5'),
  DEV_SHOW_OTP: z.string().default('false'),
  DEMO_MODE: z.string().default('false'),
});

const parsed = schema.parse(process.env);

if (parsed.NODE_ENV === 'production' && !building) {
  if (parsed.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET (32+ chars) is required in production');
  if (parsed.DEV_SHOW_OTP === 'true') throw new Error('DEV_SHOW_OTP must be false in production');
}

export const env = {
  ...parsed,
  SESSION_SECRET: parsed.SESSION_SECRET || 'dev-only-session-secret-change-me-0000000000',
  isProd: parsed.NODE_ENV === 'production',
  showOtp: parsed.DEV_SHOW_OTP === 'true' && parsed.NODE_ENV !== 'production',
  /** UAT/staging with mock adapters: enables the mock-SSO demo sign-in. Never with live adapters. */
  demo: parsed.DEMO_MODE === 'true' && parsed.AZANIA_ADAPTER === 'mock',
};
