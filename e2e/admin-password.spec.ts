import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const OWNER = 'bernard@bermitechs.com';
const PASSWORD = process.env.SEED_STAFF_PASSWORD ?? 'ChangeMe-2026!';
const DB_URL = process.env.DATABASE_URL ?? 'postgresql://bt:bt@localhost:5432/bt_commerce';

/** Password step, then first-time 2FA enrolment (or a code when a secret is known). Returns the TOTP secret. */
async function signIn(page: Page, email: string, password: string, secret?: string): Promise<string> {
  await page.goto('/admin/login');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', password);
  await page.getByRole('button', { name: 'Continue' }).click();
  if (!secret) secret = (await page.getByTestId('totp-secret').textContent())!.trim();
  else await expect(page.getByText('Enter your 6-digit code')).toBeVisible();
  await page.fill('input[name=code]', authenticator.generate(secret));
  await page.getByRole('button', { name: /verify|sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/admin/login'));
  return secret;
}

test('invited staff must replace the temporary password, and can change it again later', async ({ page, browser, baseURL }) => {
  const db = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  await db.staffUser.update({ where: { email: OWNER }, data: { totpEnabled: false, totpSecretEnc: null, failedLogins: 0, lockedUntil: null } });
  const email = `pw-${Date.now().toString(36)}@mruk.co.tz`;

  try {
    // Owner invites a new staff member and reads the one-time temporary password.
    await signIn(page, OWNER, PASSWORD);
    await page.goto('/admin/settings');
    await page.getByText('+ Invite user').click();
    const invite = page.getByRole('form', { name: 'Invite user' });
    await invite.locator('input[name=name]').fill('Password Test');
    await invite.locator('input[name=email]').fill(email);
    await invite.getByRole('button', { name: 'Create user' }).click();
    const created = await invite.getByText(/Temporary password \(shown once\)/).textContent();
    const temp = /: (\S+) —/.exec(created ?? '')![1]!;

    // The new user is sent straight to the password page and cannot use the console yet.
    const ctx = await browser.newContext({ baseURL });
    const user = await ctx.newPage();
    await user.route('**/*', (r) => (r.request().url().startsWith(baseURL!) ? r.continue() : r.abort()));
    const secret = await signIn(user, email, temp);
    await expect(user).toHaveURL(/\/admin\/account\?required=1/);
    await user.goto('/admin/orders');
    await expect(user).toHaveURL(/\/admin\/account/);

    const form = user.getByRole('form', { name: 'Change password' });
    await form.locator('input[name=current]').fill(temp);
    await form.locator('input[name=next]').fill('short');
    await expect(form.getByRole('button', { name: 'Change password' })).toBeDisabled();
    const fresh = `Kilimanjaro-${Date.now().toString(36)}!`;
    await form.locator('input[name=next]').fill(fresh);
    await form.locator('input[name=confirm]').fill(fresh);
    await form.getByRole('button', { name: 'Change password' }).click();
    await expect(user.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Sign out, sign back in with the new password; the old one no longer works.
    await user.getByRole('button', { name: 'Sign out' }).click();
    await user.waitForURL(/\/admin\/login/);
    await user.fill('input[name=email]', email);
    await user.fill('input[name=password]', temp);
    await user.getByRole('button', { name: 'Continue' }).click();
    await expect(user.locator('.ad-alert')).toContainText('Email or password is incorrect');
    await signIn(user, email, fresh, secret);
    await expect(user.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Self-service change from My account: a wrong current password is refused.
    await user.goto('/admin/account');
    await form.locator('input[name=current]').fill('not-my-password');
    const again = `Serengeti-${Date.now().toString(36)}#`;
    await form.locator('input[name=next]').fill(again);
    await form.locator('input[name=confirm]').fill(again);
    await form.getByRole('button', { name: 'Change password' }).click();
    await expect(form.getByRole('alert')).toContainText('current password is not right');
    await form.locator('input[name=current]').fill(fresh);
    await form.getByRole('button', { name: 'Change password' }).click();
    await expect(form.getByRole('status')).toContainText('Password changed');
    await ctx.close();

    const u = await db.staffUser.findUniqueOrThrow({ where: { email } });
    expect(u.mustChangePassword).toBe(false);
    expect(await db.auditLog.count({ where: { actor: email, action: 'staff.password_change' } })).toBe(2);
  } finally {
    await db.staffUser.deleteMany({ where: { email } });
    await db.$disconnect();
  }
});
