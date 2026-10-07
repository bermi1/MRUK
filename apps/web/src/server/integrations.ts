import 'server-only';
import { resolve } from 'node:path';
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
  const storageDir = resolve(process.cwd(), env.STORAGE_LOCAL_DIR.startsWith('/') ? env.STORAGE_LOCAL_DIR : `../../${env.STORAGE_LOCAL_DIR.replace(/^\.\//, '')}`);
  return {
    bank: env.AZANIA_ADAPTER === 'mock' ? new MockAzaniaBank(env.AZANIA_SSO_SECRET) : notConfigured('Azania Bank'),
    sms: env.SMS_ADAPTER === 'mock' ? new MockSms() : notConfigured('SMS'),
    whatsapp: env.WHATSAPP_ADAPTER === 'mock' ? new MockWhatsApp() : notConfigured('WhatsApp'),
    storage: env.STORAGE_ADAPTER === 'local' ? new LocalStorage(storageDir) : new UnconfiguredS3Storage(),
    ai: env.AI_ADAPTER === 'anthropic' && env.ANTHROPIC_API_KEY ? new AnthropicAi(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL) : new MockAi(),
  };
}

export const integrations = (g.__btIntegrations ??= build());
