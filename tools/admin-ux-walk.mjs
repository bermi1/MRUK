// Admin UX walk: signs in as each seeded staff role, visits every tab the role can see at 1440 and 390 px,
// saves screenshots and records layout metrics (horizontal overflow, small touch targets, console errors).
// Usage: node tools/admin-ux-walk.mjs <before|after> [baseURL] [tabRegex] [roleRegex]
import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const phase = process.argv[2] ?? 'before';
const base = process.argv[3] ?? 'http://localhost:3400';
const only = process.argv[4] ? new RegExp(process.argv[4]) : null;
const roleOnly = process.argv[5] ? new RegExp(process.argv[5]) : null;
const pw = process.env.SEED_STAFF_PASSWORD ?? 'ChangeMe-2026!';
const out = path.resolve('docs/screens/admin-ux', phase);
fs.mkdirSync(out, { recursive: true });
const ROLES = [
  ['owner', 'bernard@bermitechs.com'],
  ['manager', 'amani@mruk.co.tz'],
  ['catalogue', 'halima@skywood.co.tz'],
  ['warehouse', 'daudi@mruk.co.tz'],
  ['support', 'zawadi@mruk.co.tz'],
  ['finance', 'finance@mruk.co.tz'],
];
const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL ?? 'postgresql://bt:bt@localhost:5432/bt_commerce' } } });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const report = [];
for (const [role, email] of ROLES) {
  if (roleOnly && !roleOnly.test(role)) continue;
  await db.rateLimit.deleteMany({});
  await db.staffUser.update({ where: { email }, data: { failedLogins: 0, lockedUntil: null } });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(base + '/admin/login');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', pw);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForSelector('.ad-shell', { timeout: 20000 });
  const tabs = await page.$$eval('#ad-sidenav a', (as) => as.map((a) => ({ href: a.getAttribute('href'), label: (a.textContent || '').trim() })));
  tabs.push({ href: '/admin/account', label: 'My account' });
  for (const t of tabs) {
    const slug = t.href === '/admin' ? 'dashboard' : t.href.replace('/admin/', '').replace(/[/?=&]/g, '_');
    if (only && !only.test(slug)) continue;
    for (const w of [1440, 390]) {
      await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
      errors.length = 0;
      const t0 = Date.now();
      let status = '';
      try {
        const res = await page.goto(base + t.href, { waitUntil: 'networkidle' });
        status = String(res?.status());
      } catch (e) {
        status = String(e).slice(0, 80);
      }
      const ms = Date.now() - t0;
      const m = await page.evaluate(() => {
        const sw = document.documentElement.scrollWidth;
        const vw = window.innerWidth;
        const small = [];
        if (vw < 500)
          for (const el of document.querySelectorAll('.ad-body a, .ad-body button, .ad-body input:not([type=hidden]), .ad-body select, .ad-top a, .ad-top button, .ad-top select, .ad-top input')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (getComputedStyle(el).visibility === 'hidden') continue;
            if (r.height < 40) small.push(`${el.tagName.toLowerCase()}.${el.className || ''}:"${(el.textContent || el.getAttribute('aria-label') || el.getAttribute('name') || '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
        return { overflowX: sw > vw + 1 ? sw - vw : 0, small: small.slice(0, 60), smallCount: small.length };
      });
      const file = `${role}-${slug}-${w}.png`;
      await page.screenshot({ path: path.join(out, file), fullPage: true });
      report.push({ role, tab: t.label, href: t.href, width: w, status, ms, ...m, errors: [...errors] });
      console.log(role, slug, w, status, ms + 'ms', 'overflowX=' + m.overflowX, 'small=' + m.smallCount, errors.length ? 'ERR ' + errors[0] : '');
    }
  }
  await ctx.close();
}
const mf = path.join(out, roleOnly || only ? '_metrics-partial.json' : '_metrics.json');
fs.writeFileSync(mf, JSON.stringify(report, null, 2));
await browser.close();
await db.$disconnect();
