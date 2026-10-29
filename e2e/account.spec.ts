import { PrismaClient } from '@prisma/client';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const DB_URL = process.env.DATABASE_URL ?? 'postgresql://bt:bt@localhost:5432/bt_commerce';
const DAY = 86_400_000;

const rnd = (n: number) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, '0');

/** A fresh customer with a Pay Later order on the way, plus a second customer who owns an address. */
async function seedCustomers(db: PrismaClient) {
  const phone = `+2557${rnd(8)}`;
  const me = await db.customer.create({ data: { phone, name: 'Amina Mwakyusa', email: `amina.${rnd(6)}@example.com`, consentAt: new Date() } });
  const other = await db.customer.create({ data: { phone: `+2556${rnd(8)}`, name: 'Other Customer', consentAt: new Date(), addresses: { create: { region: 'Arusha', line: 'Other customer private address', isDefault: true } } } });
  const otherAddress = (await db.address.findFirstOrThrow({ where: { customerId: other.id } })).id;
  const product = await db.product.findFirstOrThrow({ where: { brandKey: 'mruk', hidden: false, stock: { gt: 0 } } });
  const number = `MU-7${rnd(6)}`;
  const placed = new Date(Date.now() - 40 * DAY);
  const total = product.price;
  const monthly = Math.ceil(total / 3);
  await db.order.create({
    data: {
      number,
      brandKey: 'mruk',
      customerId: me.id,
      contactName: me.name,
      contactPhone: phone,
      region: 'Dar es Salaam',
      channel: 'web',
      paymentMethod: 'salary_advance',
      status: 'packed',
      subtotal: total,
      deliveryFee: 0,
      total,
      months: 3,
      consentAt: placed,
      createdAt: placed,
      items: { create: { productId: product.id, name: product.name, model: product.model, price: product.price, qty: 1 } },
      events: {
        create: [
          { status: 'placed', at: placed, actor: 'customer' },
          { status: 'bank_review', at: placed },
          { status: 'approved', at: new Date(placed.getTime() + 3_600_000) },
          { status: 'packed', at: new Date(placed.getTime() + 7_200_000) },
        ],
      },
      advance: {
        create: {
          fullName: me.name,
          phone,
          nidaEnc: 'x',
          nidaLast4: '0001',
          employer: 'TANESCO',
          checkNumber: '1',
          jobTitle: 'Engineer',
          netSalaryEnc: 'x',
          accountEnc: 'x',
          accountLast4: '4321',
          termMonths: 3,
          monthly,
          total,
          ratioPercent: 10,
          status: 'repaying',
          schedule: {
            create: [
              { n: 1, dueDate: new Date(placed.getTime() + 30 * DAY), amount: monthly, paidAt: new Date(placed.getTime() + 30 * DAY) },
              { n: 2, dueDate: new Date(Date.now() + 20 * DAY), amount: monthly },
              { n: 3, dueDate: new Date(Date.now() + 50 * DAY), amount: total - 2 * monthly },
            ],
          },
          contract: { create: { number: `AZB-SA-7${rnd(6)}`, pdfKey: '', sha256: 'e2e', signedAt: placed, signerName: me.name, consents: [] } },
        },
      },
    },
  });
  return { me, number, otherAddress };
}

async function signIn(page: Page, phone: string) {
  await page.goto('/mruk/account');
  await page.getByTestId('account-sign-in').click();
  await page.getByPlaceholder('+255 7XX XXX XXX').fill(phone);
  await page.getByRole('button', { name: 'Get a one-time code by SMS' }).click();
  const code = (await page.locator('.modal b.mono').textContent())!.trim();
  await page.getByPlaceholder('••••••').fill(code);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByTestId('account-header')).toContainText('Habari, Amina');
}

test('customer dashboard: order stepper, Pay Later, addresses, marketing preference, IDOR-safe address actions', async ({ page }) => {
  const db = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const { me, number, otherAddress } = await seedCustomers(db);
  try {
    await signIn(page, me.phone);

    // Overview: the active order with its live stepper, and the Pay Later card.
    const orders = page.getByTestId('overview-orders');
    await expect(orders).toContainText(number);
    const stepper = orders.getByTestId('order-stepper');
    await expect(stepper.locator('.is-done')).toHaveCount(3);
    await expect(stepper.locator('.is-done').nth(1)).toContainText('Approved');
    await expect(stepper.locator('.is-pending').first()).toContainText('Out for delivery');
    const pl = page.getByTestId('overview-paylater');
    await expect(pl).toContainText('Repaying');
    await expect(pl.getByTestId('next-instalment')).toContainText('TZS');
    await expect(pl.getByTestId('contract-link')).toHaveAttribute('href', `/api/orders/${number}/contract`);
    await expect(page.getByTestId('tier-badge')).toContainText('Member');

    // Pay Later tab: full schedule.
    await page.getByTestId('tab-paylater').click();
    await expect(page.getByTestId('paylater-panel').locator('tbody tr')).toHaveCount(3);

    // Addresses: add one, scoped to this customer.
    await page.getByTestId('tab-addresses').click();
    await page.getByTestId('address-form').locator('select[name=region]').selectOption('Mwanza');
    await page.getByTestId('address-form').locator('input[name=line]').fill('Plot 4, Isamilo Road, near the water tank');
    await page.getByTestId('address-save').click();
    await expect(page.getByTestId('address-item')).toHaveCount(1);
    await expect(page.getByTestId('address-item')).toContainText('Isamilo Road');
    await expect(page.getByTestId('address-item')).toContainText('Default');
    const mine = await db.address.findFirstOrThrow({ where: { customerId: me.id } });

    // IDOR: rewrite the remove request to target another customer's address id. Nothing is removed.
    await page.route('**/mruk/account**', async (route) => {
      const req = route.request();
      if (req.method() === 'POST' && req.headers()['next-action'] && req.postData()?.includes(mine.id)) {
        await route.continue({ postData: req.postData()!.replaceAll(mine.id, otherAddress) });
      } else await route.continue();
    });
    page.once('dialog', (d) => d.accept());
    await page.getByTestId('address-remove').click();
    await expect(page.getByRole('alert').filter({ hasText: 'We could not find that.' })).toBeVisible();
    await page.unroute('**/mruk/account**');
    expect(await db.address.count({ where: { id: otherAddress } })).toBe(1);
    expect(await db.address.count({ where: { id: mine.id } })).toBe(1);

    // Settings: opt in to SMS offers; consent is recorded for this brand only.
    await page.getByTestId('tab-settings').click();
    const sms = page.getByTestId('pref-sms');
    await expect(sms).toHaveAttribute('aria-checked', 'false');
    await sms.click();
    await expect(sms).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('prefs-status')).toContainText('Consent recorded');
    const sub = await db.subscriber.findUniqueOrThrow({ where: { brandKey_phone: { brandKey: 'mruk', phone: me.phone } } });
    expect(sub.smsOptIn).toBe(true);
    expect(sub.consentAt).not.toBeNull();
    expect(sub.customerId).toBe(me.id);
    expect(await db.subscriber.count({ where: { brandKey: 'skywood', phone: me.phone } })).toBe(0);

    // Sister brand: no Skywood orders listed, but a note links back to the Mr UK account.
    await page.goto('/skywood/account');
    await expect(page.getByTestId('sister-note')).toContainText('1 Mr UK orders');
    await expect(page.getByTestId('overview-orders')).not.toContainText(number);
  } finally {
    await db.$disconnect();
  }
});

test('signed-out visitors see the sign-in prompt, not account data', async ({ page }) => {
  await page.goto('/mruk/account?tab=addresses');
  await expect(page.getByTestId('account-sign-in')).toBeVisible();
  await expect(page.getByTestId('addresses-panel')).toHaveCount(0);
});
