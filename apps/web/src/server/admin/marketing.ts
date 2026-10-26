import 'server-only';
import type { Prisma } from '@bt/db';

/** Subscriber filters shared with the CSV export. */
export function subscriberWhere(brands: string[], sp: Record<string, string | undefined>): Prisma.SubscriberWhereInput {
  const q = (sp.q ?? '').trim().slice(0, 60);
  const digits = q.replace(/\D/g, '').replace(/^0/, '');
  const channel = sp.channel === 'sms' || sp.channel === 'whatsapp' || sp.channel === 'email' ? sp.channel : null;
  const status = sp.status === 'unsubscribed' ? 'unsubscribed' : sp.status === 'all' ? 'all' : 'active';
  return {
    brandKey: { in: brands },
    ...(status === 'active' ? { unsubscribedAt: null, consentAt: { not: null } } : status === 'unsubscribed' ? { unsubscribedAt: { not: null } } : {}),
    ...(channel ? { [channel === 'sms' ? 'smsOptIn' : channel === 'whatsapp' ? 'whatsappOptIn' : 'emailOptIn']: true } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : [])] } : {}),
  };
}
