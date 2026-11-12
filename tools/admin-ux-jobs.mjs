// Admin daily-jobs walkthrough: performs real staff jobs in a browser and counts the interactions
// (clicks, typed fields, page loads) each one takes. Leaves the demo data as it found it where it can.
// Usage: node tools/admin-ux-jobs.mjs [baseURL] [width]
import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] ?? 'http://localhost:3400';
const width = Number(process.argv[3] ?? 1440);
const pw = process.env.SEED_STAFF_PASSWORD ?? 'ChangeMe-2026!';
const shots = path.resolve('docs/screens/admin-ux/jobs');
fs.mkdirSync(shots, { recursive: true });
const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL ?? 'postgresql://bt:bt@localhost:5432/bt_commerce' } } });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const results = [];

function job(name) {
  const r = { name, width, clicks: 0, typed: 0, pages: 0, notes: [], ok: true, ms: 0 };
  results.push(r);
  const t0 = Date.now();
  return {
    r,
    click: async (loc) => { r.clicks++; await loc.click(); },
    type: async (loc, v) => { r.typed++; await loc.fill(v); },
    nav: () => { r.pages++; },
    note: (s) => r.notes.push(s),
    done: () => { r.ms = Date.now() - t0; },
  };
}

async function signIn(email) {
  await db.rateLimit.deleteMany({});
  await db.staffUser.update({ where: { email }, data: { failedLogins: 0, lockedUntil: null } });
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, deviceScaleFactor: 1, hasTouch: width < 500 });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  await page.goto(base + '/admin/login');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', pw);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForSelector('.ad-shell');
  return { ctx, page };
}

/** Open a sidebar tab; on a phone the sidebar sits behind the Menu button (one extra tap). */
async function go(j, page, href) {
  if (width < 500) await j.click(page.locator('.ad-menu'));
  await j.click(page.locator(`a.ad-nav[href="${href}"]`));
}

async function attempt(j, fn) {
  try {
    await fn();
  } catch (e) {
    j.r.ok = false;
    j.note('FAILED: ' + String(e.message || e).split('\n')[0].slice(0, 220));
  }
  j.done();
}

// 0. Customer places a pay-on-delivery order on the Mr UK store (Dar es Salaam).
let orderNo = '';
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const pick = await db.product.findFirst({ where: { brandKey: 'mruk', hidden: false, price: { gt: 0 }, stock: { gte: 5 } }, orderBy: { stock: 'desc' } });
  await page.goto(base + '/mruk/p/' + pick.id);
  const full = page.getByRole('radio', { name: /Pay in full/ });
  if (await full.count()) await full.click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.waitForURL(/\/mruk\/cart/);
  await page.getByTestId('go-checkout').click();
  await page.locator('input[name=name]').fill('UX Audit Customer');
  await page.locator('input[name=phone]').fill('0754999111');
  await page.locator('input[name=address]').fill('Mikocheni B, near the market');
  await page.getByTestId('pay-pay_on_delivery').click();
  await page.getByTestId('consent').check();
  await page.getByTestId('place-order').click();
  await page.waitForURL(/\/mruk\/order\/MU-/);
  orderNo = page.url().match(/MU-\d+/)[0];
  console.log('placed', orderNo);
  await ctx.close();
}

// 1. Warehouse receives the order and takes it to delivered (cash collected).
{
  const j = job('Receive a new pay-on-delivery order and deliver it (warehouse)');
  const { ctx, page } = await signIn('daudi@mruk.co.tz');
  await attempt(j, async () => {
    const alert = page.locator('.ad-neworder');
    if (await alert.count()) j.note('New-order alert banner visible on sign-in: ' + (await alert.innerText()).replace(/\s+/g, ' ').slice(0, 120));
    else j.note('No new-order banner on the dashboard');
    await go(j, page, '/admin/orders'); j.nav();
    await j.click(page.getByTestId('queue-new')); j.nav();
    const link = page.getByRole('link', { name: `Open order ${orderNo}` });
    await j.click(link); j.nav();
    const aside = page.locator(`aside[aria-label="Order ${orderNo}"]`);
    await aside.waitFor();
    await page.waitForTimeout(800);
    const top = await aside.evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
    if (width < 500) j.note(`Order detail starts ${Math.round(top)} px down the page after tapping the order`);
    for (const label of ['Mark packed', 'Mark dispatched', 'Mark delivered']) {
      const b = aside.getByRole('button', { name: label });
      await j.click(b);
      await page.waitForTimeout(400);
      await aside.getByRole('button', { name: label }).waitFor({ state: 'detached', timeout: 15000 }).catch(() => j.note(`"${label}" did not move on`));
    }
    const o = await db.order.findUnique({ where: { number: orderNo }, include: { payments: true, invoices: true } });
    j.note(`DB: status=${o.status}, payment=${o.payments.map((p) => p.status + '/' + p.reference).join(',')}, invoice=${o.invoices.map((i) => i.status).join(',')}`);
    await page.screenshot({ path: path.join(shots, `warehouse-order-delivered-${width}.png`), fullPage: false });
  });
  await ctx.close();
}

// 2. Finance downloads the invoice for that order.
{
  const j = job('Find the order invoice and download the PDF (finance)');
  const { ctx, page } = await signIn('finance@mruk.co.tz');
  await attempt(j, async () => {
    await go(j, page, '/admin/invoices'); j.nav();
    await j.type(page.getByPlaceholder('INV or order no.'), orderNo);
    await page.keyboard.press('Enter'); j.r.clicks++; j.nav();
    await page.waitForTimeout(800);
    const dl = page.getByRole('link', { name: 'Download PDF' });
    const href = await dl.getAttribute('href');
    const res = await page.request.get(base + href);
    j.r.clicks++;
    j.note(`Download PDF → HTTP ${res.status()} ${res.headers()['content-type']}`);
  });
  await ctx.close();
}

// 3. Warehouse restocks and checks low stock.
{
  const j = job('See low stock and receive a delivery of 5 units (warehouse)');
  const { ctx, page } = await signIn('daudi@mruk.co.tz');
  await attempt(j, async () => {
    await go(j, page, '/admin/inventory'); j.nav();
    await j.click(page.getByRole('link', { name: /Needs attention/ })); j.nav();
    const pid = await page.locator('tr[data-product]').first().getAttribute('data-product');
    const row = page.locator(`tr[data-product="${pid}"]`);
    const before = (await db.product.findUnique({ where: { id: pid } })).stock;
    try {
      await j.type(row.getByLabel(/^Units to add/), '5');
      await j.click(row.getByRole('button', { name: /^Add/ }));
      await page.goto(base + '/admin/inventory');
      await row.getByText(/now/).waitFor({ timeout: 10000 }).catch(() => {});
      const after = (await db.product.findUnique({ where: { id: pid } })).stock;
      j.note(`Stock ${before} → ${after}`);
    } finally {
      const now = (await db.product.findUnique({ where: { id: pid } })).stock;
      if (now !== before) await db.product.update({ where: { id: pid }, data: { stock: { decrement: 5 } } });
    }
    // Correcting a miscount downwards (damaged unit)
    const pid2 = await page.locator('tr[data-product]').nth(3).getAttribute('data-product');
    const r2 = page.locator(`tr[data-product="${pid2}"]`);
    const b2 = (await db.product.findUnique({ where: { id: pid2 } })).stock;
    try {
      await r2.getByLabel(/^Units to add/).fill('-1');
      await r2.getByRole('button', { name: /^Add/ }).click();
      await page.waitForTimeout(2000);
      const msg = (await r2.locator('.ad-msg').innerText().catch(() => '')).trim();
      const a2 = (await db.product.findUnique({ where: { id: pid2 } })).stock;
      j.note(`Remove 1 unit (miscount/damaged) → "${msg}" stock ${b2} → ${a2}`);
    } finally {
      if (/now/.test((await r2.locator('.ad-msg').innerText().catch(() => '')) || '')) await db.product.update({ where: { id: pid2 }, data: { stock: { increment: 1 } } });
    }
  });
  await ctx.close();
}

// 4. Catalogue: price and publish a Mr UK draft, then put it back.
{
  const j = job('Price and publish a Mr UK draft (manager)');
  const { ctx, page } = await signIn('amani@mruk.co.tz');
  const pid = 'mruk-uk-f215';
  const orig = await db.product.findUnique({ where: { id: pid } });
  await attempt(j, async () => {
    await go(j, page, '/admin/products'); j.nav();
    if (!page.url().includes('b=mruk')) { await j.click(page.getByRole('group', { name: 'Catalogue brand' }).getByRole('link', { name: 'Mr UK' })); j.nav(); }
    await j.click(page.getByTestId('drafts-filter')); j.nav();
    const row = page.locator(`tr[data-product="${pid}"]`);
    const price = row.getByLabel(/^Price of /);
    await j.type(price, '1,250,000');
    await price.press('Enter'); j.r.clicks++;
    await row.getByRole('button', { name: /^Publish / }).waitFor({ timeout: 30000 });
    await j.click(row.getByRole('button', { name: /^Publish / }));
    await row.waitFor({ state: 'detached', timeout: 15000 });
    const p = await db.product.findUnique({ where: { id: pid } });
    j.note(`DB: hidden=${p.hidden} price=${p.price}`);
  });
  await db.product.update({ where: { id: pid }, data: { hidden: orig.hidden, price: orig.price, stock: orig.stock } });
  await ctx.close();
}

// 5. Catalogue editor adds a product (hidden) with a photo.
{
  const j = job('Add a new product with a photo (catalogue editor, Skywood)');
  const { ctx, page } = await signIn('halima@skywood.co.tz');
  await attempt(j, async () => {
    await go(j, page, '/admin/products'); j.nav();
    await j.click(page.getByRole('link', { name: '+ Add product' })); j.nav();
    await j.type(page.locator('input[name=model]'), 'SKY-UXA-01');
    await j.type(page.locator('input[name=name]'), 'UX Audit Test Kettle');
    await j.type(page.locator('input[name=price]'), '95,000');
    await j.type(page.locator('input[name=stock]'), '3');
    await page.locator('input[aria-label="Add photos"]').setInputFiles(path.resolve('apps/web/public/brand/mruk.png')); j.r.clicks++;
    await page.waitForTimeout(2500);
    await j.click(page.locator('input[name=visible]').locator('xpath=ancestor::label[1]'));
    await j.click(page.getByRole('button', { name: /Save as hidden|Publish to store/ }));
    await page.waitForURL(/\/admin\/products(\/|\?)/, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const p = await db.product.findFirst({ where: { model: 'SKY-UXA-01' } });
    j.note(p ? `Created ${p.id} hidden=${p.hidden} images=${p.images.length}` : 'Product not created; errors: ' + (await page.locator('.ad-err, [role=alert]').allInnerTexts()).join(' | ').slice(0, 200));
    if (p) await db.product.delete({ where: { id: p.id } }).catch((e) => j.note('cleanup failed ' + e.message.slice(0, 80)));
  });
  await ctx.close();
}

// 6. CMS: change the announcement bar and check the store, then restore.
{
  const j = job('Edit the announcement bar and see it live (manager)');
  const { ctx, page } = await signIn('amani@mruk.co.tz');
  await attempt(j, async () => {
    await go(j, page, '/admin/cms'); j.nav();
    const input = page.locator('input[name=announcement]');
    const orig = await input.inputValue();
    await j.type(input, 'UX audit: free delivery in Dar es Salaam this week');
    await j.click(page.getByRole('button', { name: 'Publish announcement' }));
    await page.getByText(/saved|published|live/i).first().waitFor({ timeout: 10000 }).catch(() => j.note('no visible confirmation after publishing'));
    await page.waitForTimeout(1500);
    const store = await (await page.request.get(base + '/mruk')).text();
    j.note('Store shows new text: ' + store.includes('UX audit: free delivery'));
    await input.fill(orig);
    await page.getByRole('button', { name: 'Publish announcement' }).click();
    await page.waitForTimeout(1000);
  });
  await ctx.close();
}

// 7. Promo code create.
{
  const j = job('Create a 10% promo code (catalogue editor)');
  const { ctx, page } = await signIn('halima@skywood.co.tz');
  await attempt(j, async () => {
    await go(j, page, '/admin/promos'); j.nav();
    await j.click(page.getByText('+ New discount code'));
    const form = page.locator('details[open] form').filter({ has: page.locator('input[name=code]') }).last();
    await j.type(form.locator('input[name=code]'), 'UXAUDIT10');
    await j.type(form.locator('input[name=percent]'), '10');
    await j.click(form.getByRole('button').last());
    await page.waitForTimeout(1500);
    const c = await db.discountCode.findFirst({ where: { code: 'UXAUDIT10' } });
    j.note(c ? `Created code active=${c.active} brand=${c.brandKey}; feedback: "${(await form.locator('.ad-msg').innerText().catch(() => '')).trim()}"` : 'Code not created');
    if (c) await db.discountCode.delete({ where: { id: c.id } });
  });
  await ctx.close();
}

// 8. Support answers a ticket (internal note to avoid texting a real number).
{
  const j = job('Answer a support ticket and resolve it (support)');
  const { ctx, page } = await signIn('zawadi@mruk.co.tz');
  await attempt(j, async () => {
    await go(j, page, '/admin/tickets'); j.nav();
    const t = await db.ticket.findFirst({ where: { status: 'new' }, orderBy: { createdAt: 'desc' } });
    await j.type(page.locator('textarea[name=body]'), 'UX audit note: checked, calling the customer.');
    await j.click(page.locator('input[name=internal]'));
    await j.click(page.getByRole('button', { name: 'Send' }));
    await page.waitForTimeout(1200);
    j.note('Feedback after send: "' + (await page.locator('form[aria-label="Reply to customer"] .ad-msg').innerText().catch(() => '')).trim() + '"');
    j.note('Resolve needs one more click ("Mark resolved"); not pressed to keep demo data. Ticket ' + (t?.number ?? '?'));
  });
  await ctx.close();
}

// 9. Owner: reports, staff, audit log.
{
  const j = job('Open last month report, export CSV, open audit log (owner)');
  const { ctx, page } = await signIn('bernard@bermitechs.com');
  await attempt(j, async () => {
    await go(j, page, '/admin/reports'); j.nav();
    await j.click(page.getByRole('link', { name: 'Last month' }).or(page.getByRole('button', { name: 'Last month' })).first()); j.nav();
    const csv = page.getByRole('link', { name: /Export Excel/ });
    const res = await page.request.get(new URL(await csv.getAttribute('href'), base).toString());
    j.r.clicks++;
    j.note(`CSV → HTTP ${res.status()} ${res.headers()['content-type']}`);
    await go(j, page, '/admin/settings'); j.nav();
    const audit = page.getByRole('heading', { name: 'Audit log' });
    await audit.scrollIntoViewIfNeeded();
    const y = (await audit.boundingBox()).y;
    j.note(`Audit log heading is ${Math.round(y)} px down the Settings page (scroll needed)`);
  });
  await ctx.close();
}

fs.writeFileSync(path.join(shots, `_jobs-${width}.json`), JSON.stringify(results, null, 2));
for (const r of results) console.log(`${r.ok ? 'OK ' : 'ERR'} [${r.width}] ${r.name}: ${r.clicks} clicks, ${r.typed} fields, ${r.pages} screens, ${(r.ms / 1000).toFixed(1)}s\n     ${r.notes.join('\n     ')}`);
await browser.close();
await db.$disconnect();
