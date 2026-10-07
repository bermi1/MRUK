import 'server-only';
import { prisma, type Prisma } from '@bt/db';
import { clientIp } from './ratelimit';

/** Audit every admin mutation (CLAUDE.md quality gate). Never put PII in `diff`. */
export async function audit(actor: string, action: string, entity: string, entityId = '', diff?: Prisma.InputJsonValue) {
  await prisma.auditLog.create({ data: { actor, action, entity, entityId, diff, ip: await clientIp().catch(() => '') } });
}
