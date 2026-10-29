'use server';

/** Staff tasks and personal notification settings. Every mutation is validated and audit-logged. */
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@bt/db';
import { normalizeTzPhone } from '@bt/core';
import type { ActionResult } from '@/lib/types';
import { AuthError, requireStaff } from '@/server/auth';
import { audit } from '@/server/audit';
import { RateLimitError } from '@/server/ratelimit';
import { claimTask, completeTask } from '@/server/tasks';

type Msg = { message?: string };
const idZ = z.string().regex(/^[a-z0-9]{10,40}$/, 'Invalid task');

function fail(e: unknown): { ok: false; error: string } {
  unstable_rethrow(e);
  if (e instanceof AuthError || e instanceof RateLimitError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? 'Check the form and try again' };
  if (e instanceof Error && e.message.length < 160) return { ok: false, error: e.message };
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

export async function completeTaskAction(id: string, note?: string): Promise<ActionResult<Msg>> {
  try {
    const ctx = await requireStaff('dashboard');
    const n = z.string().trim().max(300).parse(note ?? '');
    const t = await completeTask(ctx, idZ.parse(id), n);
    await audit(ctx.email, 'task.done', 'StaffTask', t.id, { kind: t.kind, entity: t.entity, entityId: t.entityId });
    revalidatePath('/admin', 'layout');
    return { ok: true, data: { message: 'Marked done' } };
  } catch (e) {
    return fail(e);
  }
}

export async function claimTaskAction(id: string): Promise<ActionResult<Msg>> {
  try {
    const ctx = await requireStaff('dashboard');
    const t = await claimTask(ctx, idZ.parse(id));
    await audit(ctx.email, 'task.claim', 'StaffTask', t.id, { kind: t.kind, from: t.assigneeId ?? 'queue' });
    revalidatePath('/admin', 'layout');
    return { ok: true, data: { message: 'Assigned to you' } };
  } catch (e) {
    return fail(e);
  }
}

const CHANNELS = ['sms', 'whatsapp', 'email'] as const;

/** My account: where to send my task notifications (opt-in). */
export async function saveMyNotificationsAction(fd: FormData): Promise<ActionResult<Msg>> {
  try {
    const ctx = await requireStaff();
    const raw = String(fd.get('phone') ?? '').trim();
    const phone = raw ? normalizeTzPhone(raw) : '';
    if (raw && !phone) return { ok: false, error: 'Enter a valid Tanzanian mobile number, e.g. +255 754 000 214' };
    const via = [...new Set(fd.getAll('via').map(String))].filter((c): c is (typeof CHANNELS)[number] => (CHANNELS as readonly string[]).includes(c));
    if (!phone && via.some((c) => c !== 'email')) return { ok: false, error: 'Add your work phone number to get SMS or WhatsApp notifications' };
    await prisma.staffUser.update({ where: { id: ctx.id }, data: { phone: phone || '', notifyVia: via } });
    await audit(ctx.email, 'staff.notify_settings', 'StaffUser', ctx.id, { via, phoneSet: !!phone });
    revalidatePath('/admin', 'layout');
    return { ok: true, data: { message: via.length ? `Task notifications on: ${via.map((v) => (v === 'sms' ? 'SMS' : v === 'whatsapp' ? 'WhatsApp' : 'Email')).join(', ')}` : 'Task notifications off' } };
  } catch (e) {
    return fail(e);
  }
}
