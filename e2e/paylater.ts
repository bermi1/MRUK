import { PrismaClient } from '@prisma/client';
import type { Browser, Page } from '@playwright/test';
import { expect } from './fixtures';
import { staffSignIn } from './staff';

/**
 * Pay Later by Azania Bank is OFF by default (seed and existing databases). Specs that exercise it
 * switch it on first through Admin › Settings (so the storefront cache is refreshed exactly as in production).
 */
export type PlBrand = 'mruk' | 'skywood';

export const DB_URL = process.env.DATABASE_URL ?? 'postgresql://bt:bt@localhost:5432/bt_commerce';
const OWNER = 'bernard@bermitechs.com';

export async function payLaterInDb(): Promise<Record<PlBrand, boolean>> {
  const db = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  try {
    const rows = await db.setting.findMany({ where: { key: { in: ['payLater.mruk', 'payLater.skywood'] } } });
    const on = (b: PlBrand) => (rows.find((r) => r.key === `payLater.${b}`)?.value as { enabled?: unknown } | undefined)?.enabled === true;
    return { mruk: on('mruk'), skywood: on('skywood') };
  } finally {
    await db.$disconnect();
  }
}

/** Fresh owner sign-in (2FA re-enrolled when the server requires it, sign-in rate limits cleared). */
export async function signInOwner(page: Page) {
  await staffSignIn(page, OWNER);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

/** Flip the Settings switch for one brand on an admin page that is already signed in. */
export async function togglePayLater(page: Page, brand: PlBrand, on: boolean) {
  if (!page.url().includes('/admin/settings')) await page.goto('/admin/settings');
  const row = page.getByTestId(`paylater-${brand}`);
  if ((await row.getAttribute('data-state')) === (on ? 'on' : 'off')) return;
  page.once('dialog', (d) => void d.accept());
  await row.getByRole('button', { name: on ? /Turn on/ : /Turn off/ }).click();
  await expect(row).toHaveAttribute('data-state', on ? 'on' : 'off');
}

/** Make sure Pay Later is in the wanted state, signing in as the owner in a separate context only when needed. */
export async function setPayLater(browser: Browser, baseURL: string, want: Partial<Record<PlBrand, boolean>>) {
  const cur = await payLaterInDb();
  const todo = (Object.keys(want) as PlBrand[]).filter((b) => cur[b] !== want[b]);
  if (!todo.length) return;
  const ctx = await browser.newContext({ baseURL });
  const page = await ctx.newPage();
  await page.route('**/*', (r) => (r.request().url().startsWith(baseURL) ? r.continue() : r.abort()));
  try {
    await signInOwner(page);
    for (const b of todo) await togglePayLater(page, b, want[b]!);
  } finally {
    await ctx.close();
  }
}
