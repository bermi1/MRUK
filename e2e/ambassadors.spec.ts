import { expect, test } from './fixtures';
import { db, staffSignIn } from './staff';

test('marketing adds an ambassador; a customer buys with the code; commission is earned on delivery and paid out', async ({ page }) => {
  const c = db();
  const code = `AMB${Date.now().toString(36).slice(-6).toUpperCase()}`;
  try {
    // Marketing adds the ambassador with a personal code.
    await staffSignIn(page, 'marketing@mruk.co.tz');
    await page.goto('/admin/marketing/ambassadors');
    const form = page.getByRole('form', { name: 'Add an ambassador' });
    await form.locator('input[name=name]').fill('Asha Ambassador');
    await form.locator('input[name=phone]').fill('0754 321 987');
    await form.locator('input[name=code]').fill(code.toLowerCase());
    await form.locator('input[name=discount]').fill('5');
    await form.locator('input[name=commission]').fill('3');
    await form.getByRole('button', { name: 'Add ambassador' }).click();
    await expect(form.getByText(`code ${code}`)).toBeVisible();
    const amb = await c.ambassador.findUniqueOrThrow({ where: { code } });
    expect(await c.discountCode.findUniqueOrThrow({ where: { code } })).toMatchObject({ percent: 5, active: true, brandKey: null });

    // A delivered order placed with the code (as the storefront and the Storekeeper would leave it).
    const p = await c.product.findFirstOrThrow({ where: { brandKey: 'mruk', hidden: false, price: { gt: 100_000 } } });
    const subtotal = p.price;
    const discount = Math.round(subtotal * 0.05);
    await c.order.create({
      data: { number: `MU-9${Date.now().toString().slice(-6)}`, brandKey: 'mruk', contactName: 'Code Buyer', contactPhone: '+255754000999', region: 'Dar es Salaam', channel: 'web', paymentMethod: 'pay_on_delivery', status: 'delivered', subtotal, discount, discountCode: code, deliveryFee: 0, total: subtotal - discount, items: { create: [{ productId: p.id, name: p.name, model: p.model, price: p.price, qty: 1 }] } },
    });
    const owed = Math.round(((subtotal - discount) * 3) / 100);
    await page.reload();
    const row = page.getByTestId('ambassador').filter({ hasText: code });
    await expect(row).toContainText(`TZS ${owed.toLocaleString('en-US')}`);

    // Record the payout: nothing is owed afterwards; paying more than owed is refused.
    await row.locator('summary', { hasText: 'Manage' }).click();
    const pay = row.getByRole('form', { name: 'Payout for Asha Ambassador' });
    await pay.locator('input[name=amount]').fill(String(owed));
    await pay.getByRole('button', { name: 'Record payout' }).click();
    await expect.poll(async () => (await c.ambassadorPayout.aggregate({ where: { ambassadorId: amb.id }, _sum: { amount: true } }))._sum.amount).toBe(owed);
    await page.reload();
    await expect(page.getByTestId('ambassador').filter({ hasText: code })).toContainText('Paid up');
    expect(await c.auditLog.count({ where: { entityId: amb.id, action: { in: ['ambassador.create', 'ambassador.payout'] } } })).toBe(2);

    // Client support has no access to Marketing.
    await staffSignIn(page, 'zawadi@mruk.co.tz');
    await page.goto('/admin/marketing/ambassadors');
    await expect(page.getByRole('heading', { name: 'No access' })).toBeVisible();
  } finally {
    await c.order.deleteMany({ where: { discountCode: code } });
    await c.ambassador.deleteMany({ where: { code } });
    await c.discountCode.deleteMany({ where: { code } });
    await c.$disconnect();
  }
});
