import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

const g = globalThis as unknown as { __btPrisma?: PrismaClient };

/** One client per process (survives Next.js dev hot reloads). */
export const prisma: PrismaClient = g.__btPrisma ?? new PrismaClient({ log: process.env.PRISMA_LOG ? ['query', 'warn', 'error'] : ['warn', 'error'] });
if (process.env.NODE_ENV !== 'production') g.__btPrisma = prisma;
export * from './crypto';
