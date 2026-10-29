import { mkdirSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const PASSWORD = process.env.SEED_STAFF_PASSWORD ?? 'ChangeMe-2026!';
const DB_URL = process.env.DATABASE_URL ?? 'postgresql://bt:bt@localhost:5432/bt_commerce';
/** ROLE_SCREENS=1 also saves each role's dashboard at 1440 and 390 px to docs/screens/roles/. */
const SCREENS = process.env.ROLE_SCREENS === '1';

async function signIn(page: Page, email: string) {
  const db = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  await db.staffUser.update({ where: { email }, data: { totpEnabled: false, totpSecretEnc: null, failedLogins: 0, lockedUntil: null } });
  await db.$disconnect();
  await page.context().clearCookies();
  await page.goto('/admin/login');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  const secret = (await page.getByTestId('totp-secret').textContent())!.trim();
  await page.fill('input[name=code]', authenticator.generate(secret));
  await page.getByRole('button', { name: /verify/i }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

async function noHorizontalScroll(page: Page) {
  const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(sw).toBeLessThanOrEqual(w);
}

async function shoot(page: Page, name: string) {
  if (!SCREENS) return;
  mkdirSync('docs/screens/roles', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: `docs/screens/roles/${name}-1440.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `docs/screens/roles/${name}-390.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
}

const ROLES = [
  { who: 'finance', email: 'finance@mruk.co.tz', role: 'Finance', sees: ['dash-finance-revenue', 'dash-finance-advance', 'dash-finance-collect'], money: true, task: 'Pay Later application' },
  { who: 'warehouse', email: 'daudi@mruk.co.tz', role: 'Warehouse', sees: ['dash-warehouse', 'dash-warehouse-queue', 'dash-warehouse-stock'], money: false, task: 'Reorder' },
  { who: 'support', email: 'zawadi@mruk.co.tz', role: 'Support agent', sees: ['dash-support', 'dash-support-orders', 'dash-support-issues'], money: false, task: 'TK-' },
  { who: 'catalogue', email: 'halima@skywood.co.tz', role: 'Catalogue editor', sees: ['dash-catalogue', 'dash-catalogue-cms', 'dash-catalogue-promos'], money: false, task: 'Low stock on the store' },
] as const;
const ALL_WIDGETS = ['dash-overview', 'dash-teams', 'dash-finance-revenue', 'dash-warehouse', 'dash-support', 'dash-catalogue', 'subscribers-tile'];

for (const r of ROLES) {
  test(`${r.who} sees their own dashboard, tasks first, and no figures they lack permission for`, async ({ page }) => {
    await signIn(page, r.email);
    await expect(page.getByTestId('dash-hello')).toContainText(r.role);
    const tasks = page.getByTestId('dash-tasks');
    await expect(tasks.getByTestId('task').first()).toBeVisible();
    await expect(tasks).toContainText(r.task);
    for (const id of r.sees) await expect(page.getByTestId(id)).toBeVisible();
    for (const id of ALL_WIDGETS.filter((w) => !(r.sees as readonly string[]).includes(w))) await expect(page.getByTestId(id)).toHaveCount(0);
    // The sidebar shows how many tasks are waiting.
    await expect(page.locator('a.ad-nav[href="/admin/tasks"] .ad-badge')).toBeVisible();
    const main = page.locator('main');
    if (r.money) await expect(page.getByTestId('rev-30d')).toContainText('TZS');
    else {
      await expect(main).not.toContainText('Revenue');
      await expect(main).not.toContainText('TZS');
    }
    await shoot(page, r.who);
    // Phone: stacked cards, no sideways scrolling.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByTestId('dash-tasks')).toBeVisible();
    await noHorizontalScroll(page);
    await page.goto('/admin/tasks');
    await expect(page.getByTestId('task').first()).toBeVisible();
    await noHorizontalScroll(page);
  });
}

test('owner keeps the full multi-brand view with work by team', async ({ page }) => {
  await signIn(page, 'bernard@bermitechs.com');
  await expect(page.getByTestId('dash-overview')).toBeVisible();
  await expect(page.getByTestId('dash-teams')).toBeVisible();
  await expect(page.getByTestId('team-warehouse')).not.toContainText(/^Warehouse\s*0/);
  await expect(page.getByTestId('subscribers-tile')).toBeVisible();
  await shoot(page, 'owner');
  await page.goto('/admin/tasks?view=all');
  await expect(page.getByRole('link', { name: /All teams/ })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('task').first()).toBeVisible();
  if (SCREENS) {
    await shoot(page, 'tasks-all');
    await signIn(page, 'amani@mruk.co.tz');
    await shoot(page, 'manager');
  }
});

test('a store order is routed to the warehouse, notified, and closed when done', async ({ page }) => {
  const db = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  // Buy a Mr UK item, paying by card.
  await page.goto('/mruk/p/mruk-pump-control');
  await page.getByRole('radio', { name: /Pay in full/ }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page).toHaveURL(/\/mruk\/cart/);
  await page.getByTestId('go-checkout').click();
  await page.locator('input[name=name]').fill('Roles Test');
  await page.locator('input[name=phone]').fill('0754333444');
  await page.getByTestId('pay-card').click();
  await page.getByTestId('consent').check();
  await page.getByTestId('place-order').click();
  await expect(page).toHaveURL(/\/pay\/MU-/);
  const number = page.url().match(/(MU-\d+)/)![1]!;
  // Awaiting payment: nothing to pack yet.
  expect(await db.staffTask.count({ where: { entity: 'Order', entityId: number, status: 'open' } })).toBe(0);
  await page.locator('input[name=cardNumber]').fill('4242 4242 4242 4242');
  await page.locator('input[name=expiry]').fill('12/29');
  await page.locator('input[name=cvc]').fill('123');
  await page.getByTestId('pay-submit').click();
  await expect(page).toHaveURL(/\/mruk\/order\/MU-/);

  const task = await db.staffTask.findUniqueOrThrow({ where: { key: `order:${number}:pack` } });
  expect(task).toMatchObject({ roleId: 'warehouse', brandKey: 'mruk', status: 'open', kind: 'order.pack' });
  // The warehouse lead opted in to SMS (seed): the assignment went out through the (mock) SMS adapter.
  expect(task.notifiedVia).toContain('sms');

  await signIn(page, 'daudi@mruk.co.tz');
  await page.goto('/admin/tasks');
  const row = page.getByTestId('task').filter({ hasText: `Pack order ${number}` });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: /Mark done/ }).click();
  await expect(row).toHaveCount(0);
  const done = await db.staffTask.findUniqueOrThrow({ where: { id: task.id } });
  expect(done).toMatchObject({ status: 'done', doneBy: 'Daudi Mrisho' });
  expect(await db.auditLog.count({ where: { action: 'task.done', entityId: task.id } })).toBe(1);

  // Packing the order closes the pack task automatically and opens the dispatch task.
  await db.staffTask.deleteMany({ where: { entity: 'Order', entityId: number } });
  await db.staffTask.create({ data: { kind: 'order.pack', category: 'orders', title: `Pack order ${number}`, roleId: 'warehouse', brandKey: 'mruk', entity: 'Order', entityId: number, href: `/admin/orders?o=${number}`, key: `order:${number}:pack` } });
  await page.goto(`/admin/orders?o=${number}`);
  await page.getByRole('button', { name: 'Mark packed' }).first().click();
  await expect.poll(async () => (await db.staffTask.findUnique({ where: { key: `order:${number}:dispatch` } }))?.status).toBe('open');
  expect(await db.staffTask.count({ where: { entity: 'Order', entityId: number, kind: 'order.pack', status: 'open' } })).toBe(0);
  await db.$disconnect();
});

test('a new support ticket is routed to support and assigned round robin', async ({ page }) => {
  const db = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  await page.goto('/skywood/support');
  await page.getByRole('radio', { name: 'Installation' }).click();
  await page.locator('input[name=name]').fill('Roles Test');
  await page.locator('input[name=phone]').fill(`07${String(Date.now()).slice(-8)}`);
  await page.locator('textarea[name=description]').fill('Please install my new cooker next week.');
  await page.getByTestId('send-ticket').click();
  const number = (await page.getByTestId('ticket-number').textContent())!.trim();
  const ticket = await db.ticket.findUniqueOrThrow({ where: { number } });
  const task = await db.staffTask.findUniqueOrThrow({ where: { key: `ticket:${ticket.id}:respond` }, include: { assignee: { select: { name: true, roleId: true } } } });
  expect(task).toMatchObject({ roleId: 'support', brandKey: 'skywood', status: 'open' });
  expect(task.assignee).toMatchObject({ roleId: 'support', name: 'Zawadi Nnko' });
  expect(ticket.assignee).toBe('Zawadi Nnko');
  await db.$disconnect();
});
