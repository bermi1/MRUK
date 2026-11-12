import { PrismaClient } from '@prisma/client';
import type { APIResponse, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { staffSignIn } from './staff';

/**
 * Internal attack tests for the order flow without Azania (docs/security/PENTEST.md, "Order flow without Azania").
 * Server actions are called the way an attacker would: the browser's request is captured once, then
 * replayed with a tampered body (price, quantity, product, method, order number, token).
 */
const db = new PrismaClient();
const KETTLE = 'skywood-sk-20s03';
const DRAFT = 'skywood-sec-draft';

const phone = () => `0754${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
const intl = (p: string) => `+255${p.slice(1)}`;

test.beforeAll(async () => {
  // These tests run with Azania (Pay Later, Azania account) switched off, the client's current setting.
  for (const key of ['payLater.mruk', 'payLater.skywood']) {
    const value = { enabled: false, updatedBy: 'e2e-security', at: new Date().toISOString() };
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  await db.rateLimit.deleteMany({});
  const kettle = await db.product.findUniqueOrThrow({ where: { id: KETTLE } });
  if (kettle.stock < 20) await db.product.update({ where: { id: KETTLE }, data: { stock: 40 } });
  // A hidden draft with no price but stock on hand: it must never be sold for 0.
  await db.product.upsert({
    where: { id: DRAFT },
    create: { id: DRAFT, brandKey: 'skywood', categoryId: kettle.categoryId, sub: kettle.sub, model: 'SEC-DRAFT', name: 'Security draft', price: 0, stock: 5, hidden: true, features: [], images: [] },
    update: { price: 0, stock: 5, hidden: true },
  });
});

test.afterAll(async () => {
  await db.orderItem.deleteMany({ where: { productId: DRAFT } });
  await db.cartItem.deleteMany({ where: { productId: DRAFT } });
  await db.product.deleteMany({ where: { id: DRAFT } });
  // Azania stays switched off (the client's setting).
  await db.rateLimit.deleteMany({});
  await db.$disconnect();
});

test.beforeEach(async () => {
  await db.rateLimit.deleteMany({});
});

// Server action capture and replay ------------------------------------------------------------------

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: string;
}

/** Capture the next server action POST whose body matches; abort it so it never reaches the server. */
async function capture(page: Page, match: (body: string) => boolean, trigger: () => Promise<unknown>, opts: { abort?: boolean } = {}): Promise<Captured> {
  let got: Captured | null = null;
  const handler = async (route: import('@playwright/test').Route) => {
    const r = route.request();
    const h = r.headers();
    const body = r.postData() ?? '';
    if (!got && r.method() === 'POST' && h['next-action'] && match(body)) {
      got = { url: r.url(), headers: pick(h), body };
      if (opts.abort !== false) return route.abort();
    }
    return route.fallback();
  };
  await page.route('**/*', handler);
  await trigger();
  await expect.poll(() => got !== null, { timeout: 15_000 }).toBe(true);
  await page.unroute('**/*', handler);
  return got!;
}

function pick(h: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ['next-action', 'next-router-state-tree', 'content-type', 'accept', 'origin']) if (h[k]) out[k] = h[k];
  return out;
}

async function replay(page: Page, c: Captured, body: string): Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }> {
  const res: APIResponse = await page.request.post(c.url, { headers: c.headers, data: body });
  const text = await res.text();
  const m = /\{"ok":(?:true|false).*\}/.exec(text);
  if (!m) return { ok: false, error: `no action result (HTTP ${res.status()})` };
  return JSON.parse(m[0]);
}

/** Replace the JSON args of a captured server action body. */
function withArgs(c: Captured, f: (args: unknown[]) => unknown[]): string {
  return JSON.stringify(f(JSON.parse(c.body) as unknown[]));
}

async function addProduct(page: Page, brand: 'mruk' | 'skywood', id: string) {
  await page.goto(`/${brand}/p/${id}`);
  await page.getByRole('radio', { name: /Pay in full/ }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page).toHaveURL(new RegExp(`/${brand}/cart`));
}
const addKettle = (page: Page) => addProduct(page, 'skywood', KETTLE);

/** Fill the checkout and capture (without sending) the placeOrder call for the card method. */
async function capturePlaceOrder(page: Page, p: string): Promise<Captured> {
  await page.goto('/skywood/checkout');
  await page.locator('input[name=name]').fill('Security Tester');
  await page.locator('input[name=phone]').fill(p);
  await page.getByTestId('pay-card').click();
  await page.getByTestId('consent').check();
  return capture(page, (b) => b.includes('"consent":true'), () => page.getByTestId('place-order').click());
}

const ordersFor = (p: string) => db.order.findMany({ where: { contactPhone: intl(p) }, include: { items: true, payments: true } });

// 1. Payment method tampering: Azania switched off -------------------------------------------------

test('Azania off: checkout offers no Azania method and the server refuses azania_account and salary_advance', async ({ page }) => {
  await addKettle(page);
  // The storefront reads the switch through a cache of up to 60 s (the server re-checks it live on every order).
  await expect
    .poll(async () => {
      await page.goto('/skywood/checkout?method=azania_account');
      await expect(page.getByTestId('pay-card')).toBeVisible();
      return page.getByTestId('pay-azania_account').count();
    }, { timeout: 80_000, intervals: [2_000, 5_000, 10_000] })
    .toBe(0);
  await expect(page.getByTestId('pay-salary_advance')).toHaveCount(0);
  await addProduct(page, 'mruk', 'mruk-pump-control');
  await page.goto('/mruk/checkout?method=salary_advance');
  await expect(page.getByTestId('pay-card')).toBeVisible();
  await expect(page.getByTestId('pay-azania_account')).toHaveCount(0);
  await expect(page.getByTestId('pay-salary_advance')).toHaveCount(0);
  await page.goto('/skywood/checkout');

  const p = phone();
  const c = await capturePlaceOrder(page, p);
  for (const method of ['azania_account', 'salary_advance', 'mobile_money', 'cash']) {
    const r = await replay(page, c, withArgs(c, ([b, d]) => [b, { ...(d as object), method }]));
    expect(r.ok, method).toBe(false);
  }
  expect(await ordersFor(p)).toHaveLength(0);
});

test('pay on delivery outside Dar es Salaam is refused, unknown regions are ignored', async ({ page }) => {
  await addKettle(page);
  const p = phone();
  const region = await capture(page, (b) => b.includes('"region"'), async () => {
    await page.goto('/skywood/checkout');
    await page.getByRole('radiogroup', { name: 'Delivery region' }).getByRole('radio', { name: 'Arusha' }).click();
  }, { abort: false });
  await expect(page.getByText('Delivery · Arusha')).toBeVisible();
  const c = await capturePlaceOrder(page, p);
  const pod = await replay(page, c, withArgs(c, ([b, d]) => [b, { ...(d as object), method: 'pay_on_delivery' }]));
  expect(pod).toMatchObject({ ok: false, error: expect.stringContaining('Dar es Salaam') });
  // A made-up region is not stored (the cart keeps Arusha and its fee).
  expect((await replay(page, region, withArgs(region, ([b]) => [b, { region: 'Atlantis' }]))).ok).toBe(true);
  await page.goto('/skywood/checkout');
  await expect(page.getByText('Delivery · Arusha')).toBeVisible();
  expect(await ordersFor(p)).toHaveLength(0);
});

// 2. Price, quantity and product tampering -----------------------------------------------------------

test('cart: hidden draft, other brand, bad quantities and client prices are refused', async ({ page }) => {
  const add = await capture(page, (b) => b.includes(KETTLE), async () => {
    await page.goto(`/skywood/p/${KETTLE}`);
    await page.getByRole('radio', { name: /Pay in full/ }).click();
    await page.getByRole('button', { name: 'Add to cart' }).click();
  }, { abort: false });
  await expect(page).toHaveURL(/\/skywood\/cart/);
  const set = await capture(page, (b) => b.includes(KETTLE), () => page.getByRole('button', { name: /^Increase/ }).click(), { abort: false });

  // Hidden draft (price 0) and a Mr UK product in the Skywood cart.
  expect(await replay(page, add, withArgs(add, ([b]) => [b, DRAFT, 1]))).toMatchObject({ ok: false });
  expect(await replay(page, add, withArgs(add, ([b]) => [b, 'mruk-pump-control', 1]))).toMatchObject({ ok: false });
  // Quantities: negative, fractional, huge, string; an extra "price" argument is ignored.
  for (const qty of [-5, 1.5, 1000, 1e9, '3']) expect((await replay(page, add, withArgs(add, ([b, id]) => [b, id, qty]))).ok, String(qty)).toBe(false);
  for (const qty of [-1, 2.5, 21, 1e9]) expect((await replay(page, set, withArgs(set, ([b, id]) => [b, id, qty]))).ok, String(qty)).toBe(false);
  expect((await replay(page, add, withArgs(add, ([b, id]) => [b, id, 1, { price: 1 }]))).ok).toBe(true);

  // The order is priced from the database, never from the client.
  const p = phone();
  const c = await capturePlaceOrder(page, p);
  const r = await replay(page, c, withArgs(c, ([b, d]) => [b, { ...(d as object), price: 1, total: 1, subtotal: 1, items: [{ productId: DRAFT, qty: 5, price: 0 }] }]));
  expect(r.ok).toBe(true);
  const [o] = await ordersFor(p);
  const kettle = await db.product.findUniqueOrThrow({ where: { id: KETTLE } });
  expect(o!.items.map((i) => i.productId)).toEqual([KETTLE]);
  expect(o!.items[0]!.price).toBe(kettle.price);
  expect(o!.subtotal).toBe(kettle.price * o!.items[0]!.qty);
  expect(o!.total).toBe(o!.subtotal - o!.discount + o!.deliveryFee);
});

test('discount codes: expired, used up, below minimum, other brand and paused are refused; case is normalised', async ({ page }) => {
  await addKettle(page);
  const apply = await capture(page, (b) => b.includes('discountCode'), async () => {
    await page.locator('#dc').fill('E2EOLD');
    await page.locator('.promo-apply').click();
  }, { abort: false });
  const code = (c: string) => replay(page, apply, withArgs(apply, ([b]) => [b, { discountCode: c }]));
  expect(await code('E2EOLD')).toMatchObject({ ok: false, error: expect.stringContaining('expired') });
  expect(await code('E2EUSED')).toMatchObject({ ok: false, error: expect.stringContaining('fully used') });
  expect(await code('E2EMIN')).toMatchObject({ ok: false, error: expect.stringContaining('Spend at least') });
  expect(await code('POWER15')).toMatchObject({ ok: false, error: expect.stringContaining('brand') }); // Mr UK only
  expect(await code('WELCOME5')).toMatchObject({ ok: false, error: expect.stringContaining('not active') });
  expect(await code(' karibu10 ')).toMatchObject({ ok: true });
  // A code paused after it was applied is refused when the order is placed.
  await db.discountCode.update({ where: { code: 'KARIBU10' }, data: { active: false } });
  try {
    const p = phone();
    const c = await capturePlaceOrder(page, p);
    const r = await replay(page, c, c.body);
    expect(r.ok).toBe(true);
    const [o] = await ordersFor(p);
    expect(o!.discountCode).toBeNull();
    expect(o!.discount).toBe(0);
  } finally {
    await db.discountCode.update({ where: { code: 'KARIBU10' }, data: { active: true } });
  }
});

// 3. Cart cookie forgery ------------------------------------------------------------------------------

test('a Skywood cart cookie copied into the Mr UK cart is not honoured', async ({ page, context }) => {
  await context.clearCookies();
  await addKettle(page);
  const sky = (await context.cookies()).find((c) => c.name === 'bt_cart_skywood')!;
  expect(sky).toBeTruthy();
  await context.addCookies([{ ...sky, name: 'bt_cart_mruk' }]);
  await page.goto('/mruk/cart');
  await expect(page.getByTestId('cart-line')).toHaveCount(0);
  // A forged id with a bad signature is ignored too.
  await context.addCookies([{ ...sky, value: `${sky.value.split('.')[0]}.forged` }]);
  await page.goto('/skywood/cart');
  await expect(page.getByTestId('cart-line')).toHaveCount(0);
});

// 4. Double submit / race --------------------------------------------------------------------------

test('double submit: two concurrent placeOrder calls create one order', async ({ page }) => {
  await addKettle(page);
  const p = phone();
  const c = await capturePlaceOrder(page, p);
  const rs = await Promise.all([replay(page, c, c.body), replay(page, c, c.body), replay(page, c, c.body)]);
  expect(rs.filter((r) => r.ok)).toHaveLength(1);
  expect(await ordersFor(p)).toHaveLength(1);
});

test('checkout is rate limited', async ({ page }) => {
  await addKettle(page);
  const c = await capturePlaceOrder(page, phone());
  // Same phone, cart emptied by the first order: the later calls hit the limit.
  const results = [];
  for (let i = 0; i < 12; i++) results.push(await replay(page, c, c.body));
  expect(results.at(-1)).toMatchObject({ ok: false, error: expect.stringContaining('Too many attempts') });
  await db.rateLimit.deleteMany({});
});

// 5. Mock card payment: ownership and replay -----------------------------------------------------------

async function placedCardOrder(page: Page): Promise<string> {
  await addKettle(page);
  const c = await capturePlaceOrder(page, phone());
  const r = await replay(page, c, c.body);
  expect(r.ok).toBe(true);
  await page.goto(String((r.data as { redirect: string }).redirect));
  return page.url().match(/SW-\d+/)![0];
}

test('payment: another order number or a bad link token is refused; a paid order cannot be paid twice', async ({ page }) => {
  const a = await placedCardOrder(page);
  const pay = await capture(page, (b) => b.includes(a), async () => {
    await page.locator('input[name=cardNumber]').fill('4242 4242 4242 4242');
    await page.locator('input[name=expiry]').fill('12/29');
    await page.locator('input[name=cvc]').fill('123');
    await page.getByTestId('pay-submit').click();
  });
  const b = await placedCardOrder(page);
  // Order A's captured payment re-pointed at order B (no link token for B): refused, B stays unpaid.
  const forged = await replay(page, pay, pay.body.split(a).join(b));
  expect(forged.ok).toBe(false);
  expect((await db.order.findUniqueOrThrow({ where: { number: b } })).status).toBe('placed');
  // Garbage token for A: refused.
  const tokenArg = (JSON.parse(pay.body) as unknown[]).findIndex((x) => typeof x === 'string' && /^[A-Za-z0-9_-]{32}$/.test(x));
  expect(tokenArg).toBeGreaterThan(0);
  expect((await replay(page, pay, withArgs(pay, (args) => args.map((x, i) => (i === tokenArg ? 'x'.repeat(32) : x))))).ok).toBe(false);
  // The real payment, then a replay of the same request: one capture, one invoice.
  const [r1, r2] = await Promise.all([replay(page, pay, pay.body), replay(page, pay, pay.body)]);
  expect([r1.ok, r2.ok].filter(Boolean)).toHaveLength(1);
  expect((await replay(page, pay, pay.body)).ok).toBe(false);
  const o = await db.order.findUniqueOrThrow({ where: { number: a }, include: { payments: true, invoices: true, events: true } });
  expect(o.status).toBe('approved');
  expect(o.payments.filter((x) => x.status === 'captured')).toHaveLength(1);
  expect(o.invoices).toHaveLength(1);
  expect(o.events.filter((e) => e.status === 'approved')).toHaveLength(1);
});

// 6. Tracking and order pages -------------------------------------------------------------------------

test('tracking: masked phone only, no name or address; other brand orders open in their own store', async ({ page, context }) => {
  const number = await placedCardOrder(page);
  const o = await db.order.findUniqueOrThrow({ where: { number } });
  await context.clearCookies();
  await page.goto(`/skywood/track?o=${number}`);
  await expect(page.getByTestId('track-result')).toBeVisible();
  const html = await page.content();
  expect(html).not.toContain(o.contactPhone);
  expect(html).not.toContain(o.contactName);
  // On the sister store it is never shown under the wrong brand: it opens in its own store instead.
  await page.goto(`/mruk/track?o=${number}`);
  await expect(page).toHaveURL(new RegExp(`/skywood/track\\?o=${number}`));
  // Order page and invoice need the signed token or the owner's session.
  expect((await page.goto(`/skywood/order/${number}`))!.status()).toBe(404);
  expect((await page.goto(`/skywood/order/${number}?t=${'A'.repeat(32)}`))!.status()).toBe(404);
  expect((await page.request.get(`/api/orders/${number}/invoice`)).status()).toBe(404);
  expect((await page.goto(`/skywood/pay/${number}`))!.status()).toBe(404);
});

// 7. Staff RBAC: brand scope and the order state machine on replayed admin actions ---------------------

test('staff: Mr UK-only warehouse cannot move a Skywood order, skip steps or open invoices', async ({ page }) => {
  const mine = await db.order.findFirst({ where: { brandKey: 'mruk', status: 'approved' }, orderBy: { createdAt: 'desc' } });
  const theirs = await db.order.findFirst({ where: { brandKey: 'skywood', status: 'approved' }, orderBy: { createdAt: 'desc' } });
  test.skip(!mine || !theirs, 'needs a confirmed order on each brand');
  await staffSignIn(page, 'daudi@mruk.co.tz');
  await page.goto(`/admin/orders?o=${mine!.number}`);
  const detail = page.getByRole('complementary', { name: `Order ${mine!.number}` });
  const act = await capture(page, (b) => b.includes(mine!.number), () => detail.getByRole('button', { name: 'Mark packed' }).click());
  // The captured call re-pointed at a Skywood order: refused by the brand scope, nothing changes.
  expect(await replay(page, act, withArgs(act, () => [theirs!.number, 'packed']))).toMatchObject({ ok: false, error: expect.stringContaining('access to this brand') });
  expect((await db.order.findUniqueOrThrow({ where: { id: theirs!.id } })).status).toBe('approved');
  // Skipping straight to delivered, or an unknown status: refused by the state machine / validation.
  expect((await replay(page, act, withArgs(act, () => [mine!.number, 'delivered']))).ok).toBe(false);
  expect((await replay(page, act, withArgs(act, () => [mine!.number, 'teleported']))).ok).toBe(false);
  expect((await db.order.findUniqueOrThrow({ where: { id: mine!.id } })).status).toBe('approved');
  // Invoice PDFs need the invoices permission (warehouse has none).
  const inv = await db.invoice.findFirst({ where: { order: { brandKey: 'mruk' } } });
  if (inv) expect((await page.request.get(`/api/admin/invoices/${inv.number}`)).status()).toBe(403);
});
