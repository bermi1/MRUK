import { inflateSync } from 'node:zlib';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { setPayLater } from './paylater';
import { db, staffSignIn } from './staff';

/**
 * The whole order process WITHOUT Azania Bank (Pay Later, the Azania account payment and the mini app
 * are switched off until Azania provides the final flow), on both brands:
 * customer browses and buys (card or pay on delivery) → staff process the order in the admin →
 * the customer follows every status change in tracking and in their account, with their invoice.
 */

type Brand = 'mruk' | 'skywood';
const SKY_WAREHOUSE = 'e2e.warehouse@skywood.co.tz';
const BRANDS: { key: Brand; prefix: 'MU' | 'SW'; product: string; second: string; staff: string; otherStaff: string }[] = [
  { key: 'mruk', prefix: 'MU', product: 'mruk-uk-t09', second: 'mruk-g-7302', staff: 'daudi@mruk.co.tz', otherStaff: SKY_WAREHOUSE },
  { key: 'skywood', prefix: 'SW', product: 'skywood-skm-e9a', second: 'skywood-boombox-3', staff: SKY_WAREHOUSE, otherStaff: 'daudi@mruk.co.tz' },
];
const STOCK = 10;
const tzs = (n: number) => `TZS ${Math.round(n).toLocaleString('en-US')}`;
const rnd = (n: number) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, '0');

const c = db();
const saved = new Map<string, number>();

test.beforeAll(async ({ browser, baseURL }) => {
  // Azania off for both brands, exactly as in production today.
  await setPayLater(browser, baseURL!, { mruk: false, skywood: false });
  for (const b of BRANDS) for (const id of [b.product, b.second]) saved.set(id, (await c.product.findUniqueOrThrow({ where: { id } })).stock);
  // A Skywood-only warehouse clerk (same role as Daudi at Mr UK) to prove the brand scope both ways.
  const daudi = await c.staffUser.findUniqueOrThrow({ where: { email: 'daudi@mruk.co.tz' } });
  await c.staffUser.upsert({
    where: { email: SKY_WAREHOUSE },
    create: { email: SKY_WAREHOUSE, name: 'E2E Skywood Warehouse', passwordHash: daudi.passwordHash, passwordChangedAt: daudi.passwordChangedAt, roleId: 'warehouse', brands: ['skywood'] },
    update: { passwordHash: daudi.passwordHash, passwordChangedAt: daudi.passwordChangedAt, roleId: 'warehouse', brands: ['skywood'], active: true },
  });
});

test.beforeEach(async () => {
  await c.rateLimit.deleteMany({});
  // Older unpaid test orders would hand their reserved units back mid-test when they expire.
  const ids = BRANDS.flatMap((b) => [b.product, b.second]);
  await c.order.updateMany({ where: { status: 'placed', items: { some: { productId: { in: ids } } } }, data: { status: 'cancelled', reservedUntil: null } });
  await c.product.updateMany({ where: { id: { in: ids } }, data: { stock: STOCK, hidden: false } });
});

test.afterAll(async ({ browser, baseURL }) => {
  for (const [id, stock] of saved) await c.product.update({ where: { id }, data: { stock } });
  await c.staffUser.updateMany({ where: { email: SKY_WAREHOUSE }, data: { active: false } });
  await setPayLater(browser, baseURL!, { mruk: false, skywood: false });
  await c.$disconnect();
});

// Helpers ---------------------------------------------------------------------------------------

async function newCustomer(name = 'Rehema Kassim') {
  const phone = `+2557${rnd(8)}`;
  return c.customer.create({ data: { phone, name, email: `rehema.${rnd(6)}@example.com`, consentAt: new Date() } });
}

/** Phone OTP sign-in on the brand's account page (the code is shown on screen in demo mode). */
async function customerSignIn(page: Page, brand: Brand, phone: string, first: string) {
  await page.goto(`/${brand}/account`);
  await page.getByTestId('account-sign-in').click();
  await page.getByPlaceholder('+255 7XX XXX XXX').fill(phone);
  await page.getByRole('button', { name: 'Get a one-time code by SMS' }).click();
  const code = (await page.locator('.modal b.mono').textContent())!.trim();
  await page.getByPlaceholder('••••••').fill(code);
  await page.locator('.modal').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByTestId('account-header')).toContainText(`Habari, ${first}`);
}

async function addToCart(page: Page, brand: Brand, id: string) {
  await page.goto(`/${brand}/p/${id}`);
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page).toHaveURL(new RegExp(`/${brand}/cart`));
}

/** Checkout with Azania off: only card and pay on delivery are offered. */
async function fillCheckout(page: Page, brand: Brand, name: string, phone: string) {
  await page.goto(`/${brand}/checkout`);
  await expect(page.getByTestId('pay-card')).toBeVisible();
  await expect(page.getByTestId('pay-pay_on_delivery')).toBeVisible();
  await expect(page.getByTestId('pay-salary_advance')).toHaveCount(0);
  await expect(page.getByTestId('pay-azania_account')).toHaveCount(0);
  await page.locator('input[name=name]').fill(name);
  await page.locator('input[name=phone]').fill(phone);
  await page.locator('input[name=address]').fill('Plot 12, Mikocheni B, near the market');
  await page.getByTestId('consent').check();
}

async function region(page: Page, name: string) {
  await page.getByRole('radiogroup', { name: 'Delivery region' }).getByRole('radio', { name }).click();
  await expect(page.getByRole('radiogroup', { name: 'Delivery region' }).getByRole('radio', { name })).toHaveAttribute('aria-checked', 'true');
}

async function payCard(page: Page) {
  await page.locator('input[name=cardNumber]').fill('4242 4242 4242 4242');
  await page.locator('input[name=expiry]').fill('12/29');
  await page.locator('input[name=cvc]').fill('123');
  await page.getByTestId('pay-submit').click();
}

/** Rewrite the next place-order server action body (tamper test: what the server does with a forged method). */
async function forgeMethod(page: Page, from: string, to: string) {
  await page.route('**/checkout**', async (route) => {
    const req = route.request();
    const body = req.postData() ?? '';
    if (req.method() === 'POST' && req.headers()['next-action'] && body.includes(`"method":"${from}"`)) await route.continue({ postData: body.replace(`"method":"${from}"`, `"method":"${to}"`) });
    else await route.fallback();
  });
}

async function newStore(browser: Browser, baseURL: string): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ baseURL });
  const page = await ctx.newPage();
  await page.route('**/*', (r) => (r.request().url().startsWith(baseURL) ? r.continue() : r.abort()));
  return { ctx, page };
}

async function trackStatus(page: Page, brand: Brand, number: string) {
  await page.goto(`/${brand}/track?o=${number}`);
  return page.getByTestId('track-status');
}

/** Staff: open the order in Admin › Orders (search by number). */
async function openOrder(page: Page, number: string) {
  await page.goto(`/admin/orders?q=${number}`);
  const detail = page.getByRole('complementary', { name: `Order ${number}` });
  await expect(detail).toBeVisible();
  return detail;
}

/** Text drawn on a pdf-lib PDF (inflate each content stream, decode the hex strings). */
function pdfText(pdf: Buffer): string {
  const out: string[] = [];
  for (const m of pdf.toString('latin1').matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    try {
      const body = inflateSync(Buffer.from(m[1]!, 'latin1')).toString('latin1');
      for (const t of body.matchAll(/<([0-9A-Fa-f]+)> Tj/g)) out.push(Buffer.from(t[1]!, 'hex').toString('latin1'));
    } catch {
      // image stream
    }
  }
  return out.join('\n');
}

/**
 * GET through the page's cookies. Retries once when the server closed an idle keep-alive socket
 * (ECONNRESET), which is a transport detail and not what these checks are about.
 */
async function get(page: Page, url: string) {
  try {
    return await page.request.get(url);
  } catch (e) {
    if (!String(e).includes('ECONNRESET')) throw e;
    return page.request.get(url);
  }
}

const stockOf = async (id: string) => (await c.product.findUniqueOrThrow({ where: { id } })).stock;
const orderOf = (number: string) => c.order.findUniqueOrThrow({ where: { number }, include: { payments: true, invoices: true, events: { orderBy: { at: 'asc' } }, items: true } });
const audits = (number: string) => c.auditLog.count({ where: { entity: 'Order', entityId: number, action: 'order.status' } });

// The full loop, per brand ---------------------------------------------------------------------

for (const b of BRANDS) {
  test.describe(`${b.key}`, () => {
    test(`card: browse → cart → checkout → pay → staff pack/dispatch/deliver → customer tracking, account and invoice`, async ({ page, browser, baseURL }) => {
      test.setTimeout(240_000);
      const me = await newCustomer();
      const [p1, p2] = await Promise.all([c.product.findUniqueOrThrow({ where: { id: b.product } }), c.product.findUniqueOrThrow({ where: { id: b.second } })]);
      await customerSignIn(page, b.key, me.phone, 'Rehema');

      // Product page: pay in full only (no Pay Later while Azania is off).
      await page.goto(`/${b.key}/p/${b.product}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(p1.name);
      await expect(page.getByRole('radiogroup', { name: 'Payment option' }).getByRole('radio')).toHaveCount(1);
      await expect(page.getByTestId('monthly')).toHaveCount(0);

      // Cart: add, add a second product, raise the quantity, remove the second one.
      await addToCart(page, b.key, b.product);
      await addToCart(page, b.key, b.second);
      await expect(page.getByTestId('cart-line')).toHaveCount(2);
      await page.getByRole('button', { name: `Increase ${p1.name}` }).click();
      await expect(page.getByTestId('cart-line').filter({ hasText: p1.name }).getByTestId('cart-line-total')).toHaveText(tzs(p1.price * 2));
      await page.getByRole('button', { name: `Remove ${p2.name}` }).click();
      await expect(page.getByTestId('cart-line')).toHaveCount(1);
      // Dar es Salaam delivery fee (free from TZS 500,000).
      const subtotal = p1.price * 2;
      const darFee = subtotal >= 500_000 ? 0 : 15_000;
      await expect(page.getByTestId('cart-total')).toHaveText(tzs(subtotal + darFee));

      // Checkout: +255 validation, delivery fee by region, card.
      await fillCheckout(page, b.key, 'Rehema Kassim', '0123');
      await page.getByTestId('pay-card').click();
      await page.getByTestId('place-order').click();
      await expect(page.getByText('Enter a valid Tanzanian number')).toBeVisible();
      await page.locator('input[name=phone]').fill(me.phone.replace('+255', '0'));
      await region(page, 'Arusha');
      await expect(page.getByTestId('checkout-total')).toHaveText(tzs(subtotal + 35_000));
      await expect(page.getByTestId('pay-pay_on_delivery')).toBeDisabled();
      await page.getByTestId('pay-card').click();
      await page.getByTestId('place-order').click();
      await expect(page).toHaveURL(new RegExp(`/${b.key}/pay/${b.prefix}-\\d+`));
      const number = page.url().match(new RegExp(`${b.prefix}-\\d+`))![0];

      // Order created: brand prefix, totals, consent, stock reserved, awaiting payment.
      let o = await orderOf(number);
      expect(o).toMatchObject({ brandKey: b.key, customerId: me.id, contactPhone: me.phone, paymentMethod: 'card', status: 'placed', region: 'Arusha', subtotal, deliveryFee: 35_000, discount: 0, total: subtotal + 35_000 });
      expect(o.consentAt).not.toBeNull();
      expect(o.reservedUntil!.getTime()).toBeGreaterThan(Date.now());
      expect(o.items).toEqual([expect.objectContaining({ productId: b.product, qty: 2, price: p1.price })]);
      expect(await stockOf(b.product)).toBe(STOCK - 2);
      await expect(await trackStatus(page, b.key, number)).toHaveText('Awaiting payment');

      // Mock card gateway → confirmation page with the paid invoice.
      await page.goBack();
      await payCard(page);
      await expect(page).toHaveURL(new RegExp(`/${b.key}/order/${number}`));
      await expect(page.getByRole('heading', { name: /Order confirmed/ })).toBeVisible();
      await expect(page.getByTestId('order-number')).toHaveText(number);
      o = await orderOf(number);
      expect(o.status).toBe('approved');
      expect(o.reservedUntil).toBeNull();
      expect(o.payments.filter((p) => p.status === 'captured')).toHaveLength(1);
      expect(o.invoices).toEqual([expect.objectContaining({ status: 'paid', amount: o.total })]);
      expect(await stockOf(b.product)).toBe(STOCK - 2); // reserved stock is now sold, not taken twice
      const tr = await trackStatus(page, b.key, number);
      await expect(tr).toHaveText('Processing');
      await expect(page.getByTestId('track-result')).toContainText('Payment confirmed');

      // Staff of the other brand cannot see it.
      const admin = await browser.newContext({ baseURL });
      const ap = await admin.newPage();
      await ap.route('**/*', (r) => (r.request().url().startsWith(baseURL!) ? r.continue() : r.abort()));
      await staffSignIn(ap, b.otherStaff);
      await ap.goto(`/admin/orders?q=${number}&o=${number}`);
      await expect(ap.getByRole('complementary', { name: `Order ${number}` })).toHaveCount(0);
      await expect(ap.locator('.ad-table')).not.toContainText(number);

      // Staff of this brand: it is in the "New · to pack" queue; review, then pack, dispatch, deliver.
      await staffSignIn(ap, b.staff);
      await ap.goto('/admin/orders?status=approved');
      await expect(ap.locator('.ad-table')).toContainText(number);
      const detail = await openOrder(ap, number);
      await expect(detail).toContainText(p1.name);
      await expect(detail).toContainText(tzs(o.total));
      await expect(detail).toContainText('Card');
      const before = await audits(number);
      for (const [label, status, customerSees] of [
        ['Mark packed', 'packed', 'Packed'],
        ['Mark dispatched', 'out_for_delivery', 'Out for delivery'],
        ['Mark delivered', 'delivered', 'Delivered'],
      ] as const) {
        await detail.getByRole('button', { name: label }).click();
        await expect.poll(async () => (await orderOf(number)).status).toBe(status);
        await expect(await trackStatus(page, b.key, number)).toHaveText(customerSees);
        await ap.goto(`/admin/orders?q=${number}`);
      }
      expect(await audits(number)).toBe(before + 3);
      const log = await c.auditLog.findFirstOrThrow({ where: { entityId: number, action: 'order.status' }, orderBy: { at: 'desc' } });
      expect(log).toMatchObject({ actor: b.staff, diff: { from: 'out_for_delivery', to: 'delivered' } });
      o = await orderOf(number);
      expect(o.events.map((e) => e.status)).toEqual(['placed', 'approved', 'packed', 'out_for_delivery', 'delivered']);
      await expect(page.getByTestId('track-result').locator('li')).toHaveCount(5);
      await expect(page.getByTestId('track-result')).not.toContainText('Pending');

      // Invoice PDF for staff with the invoices permission (warehouse has none).
      const inv = o.invoices[0]!;
      expect((await get(ap, `/api/admin/invoices/${inv.number}`)).status()).toBe(403);
      await staffSignIn(ap, 'finance@mruk.co.tz');
      const staffPdf = await get(ap, `/api/admin/invoices/${inv.number}`);
      expect(staffPdf.headers()['content-type']).toBe('application/pdf');
      const pdf = await staffPdf.body();
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      const text = pdfText(pdf);
      for (const want of ['TAX INVOICE', inv.number, 'PAID', 'Rehema Kassim', `Order ${number} - Card`, p1.name, p1.model, tzs(p1.price * 2), 'TZS 35,000', 'VAT 18%', `Total (VAT inclusive)\n${tzs(o.total)}`]) expect(text).toContain(want);
      await admin.close();

      // Customer: account shows it delivered, with the invoice; only they can download it.
      await page.goto(`/${b.key}/account?tab=orders`);
      const card = page.getByTestId('account-order').filter({ hasText: number });
      await expect(card).toContainText('Delivered');
      await expect(card).toContainText(tzs(o.total));
      await expect(card.getByTestId('invoice-link')).toHaveAttribute('href', `/api/orders/${number}/invoice`);
      const mine = await get(page, `/api/orders/${number}/invoice`);
      expect(mine.status()).toBe(200);
      expect(mine.headers()['content-type']).toBe('application/pdf');
      const anon = await newStore(browser, baseURL!);
      expect((await get(anon.page, `/api/orders/${number}/invoice`)).status()).toBe(404);
      expect((await get(anon.page, `/api/orders/${number}/invoice?t=forged`)).status()).toBe(404);
      const other = await newCustomer('Baraka Mollel');
      await customerSignIn(anon.page, b.key, other.phone, 'Baraka');
      expect((await get(anon.page, `/api/orders/${number}/invoice`)).status()).toBe(404);
      expect((await anon.page.goto(`/${b.key}/order/${number}`))!.status()).toBe(404);
      await anon.ctx.close();

      // The sister brand's account and tracking keep to their own brand.
      const sister: Brand = b.key === 'mruk' ? 'skywood' : 'mruk';
      await page.goto(`/${sister}/account?tab=orders`);
      await expect(page.getByTestId('account-order').filter({ hasText: number })).toHaveCount(0);
      await page.goto(`/${sister}/track?o=${number}`);
      await expect(page).toHaveURL(new RegExp(`/${b.key}/track\\?o=${number}`));
    });

    test(`pay on delivery: Dar es Salaam only (server-checked), Azania methods refused, confirmed at once, cash recorded on delivery`, async ({ page, browser, baseURL }) => {
      test.setTimeout(180_000);
      await page.context().clearCookies();
      const phone = `07${rnd(8)}`;
      const p1 = await c.product.findUniqueOrThrow({ where: { id: b.product } });
      await addToCart(page, b.key, b.product);
      await fillCheckout(page, b.key, 'Salma Juma', phone);
      const count = () => c.order.count({ where: { contactPhone: `+255${phone.slice(1)}` } });

      // Outside Dar es Salaam the option is disabled, and a forged request is refused by the server.
      await region(page, 'Mwanza');
      await expect(page.getByTestId('pay-pay_on_delivery')).toBeDisabled();
      await page.getByTestId('pay-card').click();
      await forgeMethod(page, 'card', 'pay_on_delivery');
      await page.getByTestId('place-order').click();
      await expect(page.getByRole('alert').filter({ hasText: 'Pay on delivery is only available in Dar es Salaam' })).toBeVisible();
      await page.unrouteAll({ behavior: 'wait' });
      await page.route('**/*', (r) => (r.request().url().startsWith(baseURL!) ? r.continue() : r.abort()));

      // Azania Bank methods posted directly are refused while Azania is off.
      for (const [forged, message] of [
        ['azania_account', 'Payment through Azania Bank is not available'],
        ['salary_advance', 'Use the Salary Advance application'],
      ] as const) {
        await forgeMethod(page, 'card', forged);
        await page.getByTestId('place-order').click();
        await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
        await page.unrouteAll({ behavior: 'wait' });
        await page.route('**/*', (r) => (r.request().url().startsWith(baseURL!) ? r.continue() : r.abort()));
      }
      expect(await count()).toBe(0);
      expect(await stockOf(b.product)).toBe(STOCK);

      // Dar es Salaam: pay on delivery, confirmed straight away with an issued (unpaid) invoice.
      await region(page, 'Dar es Salaam');
      await page.getByTestId('pay-pay_on_delivery').click();
      await page.getByTestId('place-order').click();
      await expect(page).toHaveURL(new RegExp(`/${b.key}/order/${b.prefix}-\\d+\\?t=`));
      await expect(page.getByText('Have the cash or card ready on delivery')).toBeVisible();
      const number = page.url().match(new RegExp(`${b.prefix}-\\d+`))![0];
      let o = await orderOf(number);
      expect(o).toMatchObject({ paymentMethod: 'pay_on_delivery', status: 'approved', region: 'Dar es Salaam', total: p1.price + (p1.price >= 500_000 ? 0 : 15_000), reservedUntil: null });
      expect(o.payments).toEqual([expect.objectContaining({ status: 'pending', method: 'pay_on_delivery' })]);
      expect(o.invoices).toEqual([expect.objectContaining({ status: 'issued', amount: o.total })]);
      expect(await stockOf(b.product)).toBe(STOCK - 1);
      // The confirmation token opens the invoice for a guest.
      const link = await page.getByRole('link', { name: /^Invoice INV-/ }).getAttribute('href');
      expect((await get(page, link!)).headers()['content-type']).toBe('application/pdf');
      // Tracking never says "Payment confirmed" before the customer has paid.
      await expect(await trackStatus(page, b.key, number)).toHaveText('Processing');
      await expect(page.getByTestId('track-result')).toContainText('Order confirmed');
      await expect(page.getByTestId('track-result')).not.toContainText('Payment confirmed');

      // Staff deliver it: the cash is recorded and the invoice is paid.
      const admin = await newStore(browser, baseURL!);
      await staffSignIn(admin.page, 'amani@mruk.co.tz');
      let detail = await openOrder(admin.page, number);
      await expect(detail).toContainText('Pay on delivery');
      for (const [label, status] of [
        ['Mark packed', 'packed'],
        ['Mark dispatched', 'out_for_delivery'],
        ['Mark delivered', 'delivered'],
      ] as const) {
        await detail.getByRole('button', { name: label }).click();
        await expect.poll(async () => (await orderOf(number)).status).toBe(status);
        detail = await openOrder(admin.page, number);
      }
      await admin.ctx.close();
      o = await orderOf(number);
      expect(o.payments).toEqual([expect.objectContaining({ status: 'captured', reference: 'POD-CASH', amount: o.total })]);
      expect(o.invoices).toEqual([expect.objectContaining({ status: 'paid' })]);
      expect(await audits(number)).toBe(3);
      await expect(await trackStatus(page, b.key, number)).toHaveText('Delivered');
    });

    test(`cancel: staff cancel a paid card order and an unpaid pay-on-delivery order; stock returns, payment refunded or closed, invoice void`, async ({ page, browser, baseURL }) => {
      test.setTimeout(180_000);
      const placeWith = async (method: 'card' | 'pay_on_delivery') => {
        await page.context().clearCookies();
        await addToCart(page, b.key, b.product);
        await fillCheckout(page, b.key, 'Joseph Mrema', `07${rnd(8)}`);
        await page.getByTestId(`pay-${method}`).click();
        await page.getByTestId('place-order').click();
        if (method === 'card') {
          await expect(page).toHaveURL(/\/pay\//);
          await payCard(page);
        }
        await expect(page).toHaveURL(new RegExp(`/${b.key}/order/${b.prefix}-\\d+`));
        return { number: page.url().match(new RegExp(`${b.prefix}-\\d+`))![0], token: new URL(page.url()).searchParams.get('t') };
      };
      const { number: paid } = await placeWith('card');
      const { number: pod, token } = await placeWith('pay_on_delivery');
      expect((await get(page, `/api/orders/${pod}/invoice?t=${token}`)).status()).toBe(200);
      expect(await stockOf(b.product)).toBe(STOCK - 2);

      const admin = await newStore(browser, baseURL!);
      await staffSignIn(admin.page, 'amani@mruk.co.tz');
      // Packed orders can still be cancelled; dispatched ones cannot.
      let detail = await openOrder(admin.page, paid);
      await detail.getByRole('button', { name: 'Mark packed' }).click();
      await expect.poll(async () => (await orderOf(paid)).status).toBe('packed');
      for (const n of [paid, pod]) {
        detail = await openOrder(admin.page, n);
        admin.page.once('dialog', (d) => void d.accept());
        await detail.getByRole('button', { name: 'Cancel order' }).click();
        await expect.poll(async () => (await orderOf(n)).status).toBe('cancelled');
        expect(await c.auditLog.count({ where: { entityId: n, action: 'order.status', diff: { path: ['to'], equals: 'cancelled' } } })).toBe(1);
        detail = await openOrder(admin.page, n);
        await expect(detail.getByRole('button', { name: /Mark|Cancel order/ })).toHaveCount(0);
      }
      await admin.ctx.close();
      expect(await stockOf(b.product)).toBe(STOCK);
      const a = await orderOf(paid);
      expect(a.payments.map((p) => p.status)).toEqual(['refunded']);
      expect(a.invoices.map((i) => i.status)).toEqual(['void']);
      const d = await orderOf(pod);
      expect(d.payments.map((p) => p.status)).toEqual(['failed']);
      expect(d.invoices.map((i) => i.status)).toEqual(['void']);
      // Customer sees it closed; the void invoice is no longer offered.
      await expect(await trackStatus(page, b.key, pod)).toHaveText('Cancelled');
      await expect(page.getByTestId('track-result')).toContainText('This order was closed');
      expect((await get(page, `/api/orders/${pod}/invoice?t=${token}`)).status()).toBe(404);
    });
  });
}

// Edge cases -----------------------------------------------------------------------------------

test('edge: out of stock while in the cart, never mixed with the sister brand, forged cross-brand add refused', async ({ page }) => {
  await page.context().clearCookies();
  const p1 = await c.product.findUniqueOrThrow({ where: { id: 'mruk-uk-t09' } });
  await addToCart(page, 'mruk', p1.id);
  await page.getByRole('button', { name: `Increase ${p1.name}` }).click();
  await expect(page.getByTestId('cart-line-total')).toHaveText(tzs(p1.price * 2));

  // The other brand's cart is separate.
  await page.goto('/skywood/cart');
  await expect(page.getByTestId('cart-line')).toHaveCount(0);
  await page.goto('/skywood/checkout');
  await expect(page.getByText('Your cart is empty.')).toBeVisible();
  // A Skywood product id forged into a Mr UK add-to-cart is refused.
  await page.goto('/skywood/p/skywood-skm-e9a');
  await page.route('**/skywood/p/**', async (route) => {
    const req = route.request();
    const body = req.postData() ?? '';
    if (req.method() === 'POST' && req.headers()['next-action'] && body.includes('"skywood"')) await route.continue({ postData: body.replace('"skywood"', '"mruk"') });
    else await route.fallback();
  });
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.locator('.toast')).toContainText('Product not found');
  await page.unroute('**/skywood/p/**');
  await page.goto('/mruk/cart');
  await expect(page.getByTestId('cart-line')).toHaveCount(1);

  // Someone else bought most of it: the cart says so and checkout refuses the old quantity.
  await c.product.update({ where: { id: p1.id }, data: { stock: 1 } });
  await page.goto('/mruk/cart');
  await expect(page.getByTestId('cart-stock')).toHaveText('Only 1 available. Lower the quantity to continue.');
  await fillCheckout(page, 'mruk', 'Stock Race', `07${rnd(8)}`);
  await page.getByTestId('pay-card').click();
  await page.getByTestId('place-order').click();
  await expect(page.getByRole('alert').filter({ hasText: 'no longer has enough stock' })).toBeVisible();
  expect(await stockOf(p1.id)).toBe(1);
  // Sold out completely.
  await c.product.update({ where: { id: p1.id }, data: { stock: 0 } });
  await page.goto('/mruk/cart');
  await expect(page.getByTestId('cart-stock')).toHaveText('Out of stock');
  // Lowering the quantity to what is left lets the order through.
  await c.product.update({ where: { id: p1.id }, data: { stock: 1 } });
  await page.goto('/mruk/cart');
  await page.getByRole('button', { name: `Decrease ${p1.name}` }).click();
  await expect(page.getByTestId('cart-line-total')).toHaveText(tzs(p1.price));
  await fillCheckout(page, 'mruk', 'Stock Race', `07${rnd(8)}`);
  await page.getByTestId('pay-card').click();
  await page.getByTestId('place-order').click();
  await expect(page).toHaveURL(/\/mruk\/pay\/MU-/);
  expect(await stockOf(p1.id)).toBe(0);
});

test('edge: a promo code that expires after it was applied is not silently dropped from a placed order', async ({ page }) => {
  await page.context().clearCookies();
  const code = 'E2ELIFE';
  await c.discountCode.upsert({ where: { code }, create: { code, percent: 10 }, update: { active: true, expiresAt: null, maxUses: null, minSubtotal: null, brandKey: null } });
  const p1 = await c.product.findUniqueOrThrow({ where: { id: 'skywood-skm-e9a' } });
  await addToCart(page, 'skywood', p1.id);
  await page.locator('#dc').fill(code);
  await page.locator('.promo-apply').click();
  await expect(page.locator('.promo-on')).toContainText(code);
  const discounted = p1.price - Math.round(p1.price * 0.1) + 15_000;
  await expect(page.getByTestId('cart-total')).toHaveText(tzs(discounted));
  await fillCheckout(page, 'skywood', 'Promo Expiry', `07${rnd(8)}`);
  await page.getByTestId('pay-card').click();
  await expect(page.getByTestId('checkout-total')).toHaveText(tzs(discounted));

  // The code expires while the customer is on the checkout page.
  await c.discountCode.update({ where: { code }, data: { expiresAt: new Date(Date.now() - 60_000) } });
  const placed = () => c.order.count({ where: { discountCode: code, createdAt: { gt: new Date(Date.now() - 120_000) } } });
  const before = await c.order.count({ where: { brandKey: 'skywood' } });
  await page.getByTestId('place-order').click();
  await expect(page.getByRole('alert').filter({ hasText: 'Your total has changed to' })).toContainText('code has expired');
  expect(await c.order.count({ where: { brandKey: 'skywood' } })).toBe(before);
  // The page now shows the real total; placing again charges exactly that, without the code.
  await expect(page.getByTestId('checkout-total')).toHaveText(tzs(p1.price + 15_000));
  await page.getByTestId('place-order').click();
  await expect(page).toHaveURL(/\/skywood\/pay\/SW-/);
  const o = await orderOf(page.url().match(/SW-\d+/)![0]);
  expect(o).toMatchObject({ discount: 0, discountCode: null, total: p1.price + 15_000 });
  expect(await placed()).toBe(0);
  expect((await c.discountCode.findUniqueOrThrow({ where: { code } })).uses).toBe(0);
});

test('edge: double submit of "Place order" creates one order and takes stock once', async ({ page }) => {
  await page.context().clearCookies();
  const phone = `07${rnd(8)}`;
  await addToCart(page, 'mruk', 'mruk-g-7302');
  await fillCheckout(page, 'mruk', 'Double Click', phone);
  await page.getByTestId('pay-pay_on_delivery').click();
  // The same server action request sent twice at the same moment (double tap, flaky network retry).
  let duplicate: Promise<unknown> | null = null;
  await page.route('**/mruk/checkout**', async (route) => {
    const req = route.request();
    if (req.method() === 'POST' && req.headers()['next-action'] && (req.postData() ?? '').includes('"consent":true') && !duplicate) {
      duplicate = page.request.fetch(req).then((r) => r.text());
      const res = await route.fetch();
      await route.fulfill({ response: res });
    } else await route.fallback();
  });
  await page.getByTestId('place-order').click();
  // Whichever copy wins, the other is turned away; the shopper ends on the confirmation or is told it is placed.
  await expect(page.getByTestId('order-number').or(page.getByRole('alert').filter({ hasText: /already been placed|cart is empty/ }))).toBeVisible();
  await duplicate;
  const orders = await c.order.findMany({ where: { contactPhone: `+255${phone.slice(1)}` } });
  expect(orders).toHaveLength(1);
  expect(await stockOf('mruk-g-7302')).toBe(STOCK - 1);
});
