import 'server-only';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { AnthropicAi, LocalStorage, MockAi, MockAzaniaBank, MockSms, MockWhatsApp, UnconfiguredS3Storage, type Ai, type AzaniaBank, type Sms, type Storage, type WhatsApp } from '@bt/integrations';
import { env } from './env';

/**
 * Adapter registry. Every external service is chosen by configuration only
 * (CLAUDE.md rule 5): mock adapters until real credentials are provided.
 */
function notConfigured(name: string): never {
  throw new Error(`${name} live adapter is not configured yet; set the adapter back to "mock" or add credentials and the live implementation.`);
}

const g = globalThis as unknown as { __btIntegrations?: { bank: AzaniaBank; sms: Sms; whatsapp: WhatsApp; storage: Storage; ai: Ai } };

function build() {
  // Serverless hosts (Vercel) have a read-only filesystem: local storage falls back to the
  // temporary directory, which is NOT persistent. Production needs STORAGE_ADAPTER=s3.
  const storageDir = process.env.VERCEL
    ? join(tmpdir(), 'bt-storage')
    : resolve(process.cwd(), env.STORAGE_LOCAL_DIR.startsWith('/') ? env.STORAGE_LOCAL_DIR : `../../${env.STORAGE_LOCAL_DIR.replace(/^\.\//, '')}`);
  if (process.env.VERCEL && env.STORAGE_ADAPTER === 'local') console.warn('[storage] Using temporary storage on a serverless host: uploads will not persist. Configure S3 storage.');
  return {
    bank: env.AZANIA_ADAPTER === 'mock' ? new MockAzaniaBank(env.AZANIA_SSO_SECRET) : notConfigured('Azania Bank'),
    sms: env.SMS_ADAPTER === 'mock' ? new MockSms() : notConfigured('SMS'),
    whatsapp: env.WHATSAPP_ADAPTER === 'mock' ? new MockWhatsApp() : notConfigured('WhatsApp'),
    storage: env.STORAGE_ADAPTER === 'local' ? new LocalStorage(storageDir) : new UnconfiguredS3Storage(),
    ai: env.AI_ADAPTER === 'anthropic' && env.ANTHROPIC_API_KEY ? new AnthropicAi(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL) : new MockAi(),
  };
}

export const integrations = (g.__btIntegrations ??= build());
