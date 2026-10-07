/** SMS and WhatsApp. Mocks keep an in-memory outbox (visible in dev and e2e) and never log message bodies with PII in production. */
export interface OutboundMessage {
  channel: 'sms' | 'whatsapp';
  to: string;
  text: string;
  at: Date;
}

export interface Sms {
  send(to: string, text: string): Promise<{ id: string }>;
}

export interface WhatsApp {
  send(to: string, text: string): Promise<{ id: string }>;
}

const g = globalThis as unknown as { __btOutbox?: OutboundMessage[] };
export const outbox: OutboundMessage[] = (g.__btOutbox ??= []);

function push(m: OutboundMessage) {
  outbox.unshift(m);
  outbox.length = Math.min(outbox.length, 200);
  if (process.env.NODE_ENV !== 'production') console.info(`[${m.channel}:mock] to ${m.to.slice(0, 7)}••• (${m.text.length} chars)`);
}

export class MockSms implements Sms {
  async send(to: string, text: string) {
    push({ channel: 'sms', to, text, at: new Date() });
    return { id: `sms_${Date.now().toString(36)}` };
  }
}

export class MockWhatsApp implements WhatsApp {
  async send(to: string, text: string) {
    push({ channel: 'whatsapp', to, text, at: new Date() });
    return { id: `wa_${Date.now().toString(36)}` };
  }
}

/** Latest message sent to a number (used by dev OTP display and e2e tests). */
export function lastMessageTo(to: string): OutboundMessage | undefined {
  return outbox.find((m) => m.to === to);
}
