import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { APIRequestContext } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * SEO and AI-crawler readiness (docs/seo.md).
 *
 * 1. Single-brand sites: starts the production build twice more (STORE_BRAND=mruk and =skywood,
 *    on E2E_PORT+1 / +2, each other's OTHER_STORE_URL) and checks home, category and product pages,
 *    robots.txt, sitemap.xml and llms.txt as Googlebot sees them. Needs `next build` first
 *    (apps/web/.next/BUILD_ID); skipped otherwise.
 * 2. The combined site under test (baseURL): same checks on the "/<brand>/..." URLs.
 */

const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const PORT = Number(process.env.E2E_PORT ?? 3000);
const WEB = resolve(__dirname, '../apps/web');
const BUILT = existsSync(resolve(WEB, '.next/BUILD_ID'));

interface Page {
  status: number;
  html: string;
  head: string;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogImage: string[];
  ogType: string[];
  ld: Record<string, unknown>[];
}

const attr = (html: string, re: RegExp) => html.match(re)?.[1]?.replace(/&amp;/g, '&').replace(/&quot;/g, '"') ?? '';

async function getPage(request: APIRequestContext, url: string): Promise<Page> {
  const res = await request.get(url, { headers: { 'User-Agent': GOOGLEBOT }, maxRedirects: 0 });
  const html = await res.text();
  const head = html.slice(0, html.indexOf('</head>'));
  const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap((m) => {
    const d = JSON.parse(m[1]!) as Record<string, unknown>;
    return (d['@graph'] as Record<string, unknown>[] | undefined) ?? [d];
  });
  return {
    status: res.status(),
    html,
    head,
    title: attr(head, /<title>([^<]*)<\/title>/),
    description: attr(head, /<meta name="description" content="([^"]*)"/),
    canonical: attr(head, /<link rel="canonical" href="([^"]*)"/),
    robots: attr(html, /<meta name="robots" content="([^"]*)"/),
    ogImage: [...head.matchAll(/<meta property="og:image" content="([^"]*)"/g)].map((m) => m[1]!),
    ogType: [...html.matchAll(/<meta property="og:type" content="([^"]*)"/g)].map((m) => m[1]!),
    ld,
  };
}

const types = (p: Page) => p.ld.flatMap((n) => (Array.isArray(n['@type']) ? (n['@type'] as string[]) : [n['@type'] as string]));
const node = (p: Page, type: string) => p.ld.find((n) => (Array.isArray(n['@type']) ? (n['@type'] as string[]).includes(type) : n['@type'] === type));
const sameUrl = (a: string, b: string) => a.replace(/\/$/, '') === b.replace(/\/$/, '');

function expectIndexable(p: Page, canonical: string) {
  expect(p.status).toBe(200);
  expect(p.title.length, `title "${p.title}"`).toBeGreaterThan(10);
  expect(p.title.length, `title "${p.title}"`).toBeLessThanOrEqual(60);
  expect(p.description.length, `description "${p.description}"`).toBeGreaterThan(50);
  expect(p.description.length, `description "${p.description}"`).toBeLessThanOrEqual(155);
  expect(sameUrl(p.canonical, canonical), `canonical ${p.canonical} != ${canonical}`).toBe(true);
  expect(p.robots).not.toContain('noindex');
  expect(p.ogImage.length).toBeGreaterThan(0);
  for (const u of p.ogImage) expect(u).toMatch(/^https?:\/\//);
  expect(p.html.match(/<h1[\s>]/g)?.length ?? 0).toBe(1);
}

function expectProductLd(p: Page, url: string) {
  const prod = node(p, 'Product');
  expect(prod, 'Product JSON-LD').toBeTruthy();
  expect(prod!.name).toBeTruthy();
  expect(prod!.sku).toBeTruthy();
  expect(sameUrl(String(prod!.url), url)).toBe(true);
  expect((prod!.brand as { name?: string }).name).toBeTruthy();
  expect(prod!.aggregateRating, 'no invented ratings').toBeUndefined();
  const offer = prod!.offers as Record<string, unknown>;
  expect(offer['@type']).toBe('Offer');
  expect(offer.priceCurrency).toBe('TZS');
  expect(Number(offer.price)).toBeGreaterThan(0);
  expect(String(offer.availability)).toMatch(/^https:\/\/schema\.org\/(InStock|OutOfStock|LimitedAvailability)$/);
  expect(String(offer.priceValidUntil)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(offer.seller).toBeTruthy();
  const crumbs = node(p, 'BreadcrumbList');
  expect(crumbs).toBeTruthy();
  const items = crumbs!.itemListElement as { item: string }[];
  expect(sameUrl(items[items.length - 1]!.item, url)).toBe(true);
}

async function waitUp(url: string, ms = 60_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server did not start: ${url}`);
}

const SITES = [
  { brand: 'mruk', other: 'skywood', port: PORT + 1 },
  { brand: 'skywood', other: 'mruk', port: PORT + 2 },
] as const;
const origin = (port: number) => `http://localhost:${port}`;

test.describe('single-brand sites', () => {
  test.skip(!BUILT, 'needs a production build (pnpm build) to start single-brand servers');
  const procs: ChildProcess[] = [];

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    for (const s of SITES) {
      const other = SITES.find((x) => x.brand === s.other)!;
      const p = spawn(resolve(WEB, 'node_modules/.bin/next'), ['start', '-p', String(s.port)], {
        cwd: WEB,
        env: { ...process.env, STORE_BRAND: s.brand, APP_URL: origin(s.port), OTHER_STORE_URL: origin(other.port), DEV_SHOW_OTP: 'false', DEMO_MODE: 'true', VERCEL_ENV: '', SEO_NOINDEX: '' },
        stdio: 'ignore',
      });
      procs.push(p);
    }
    await Promise.all(SITES.map((s) => waitUp(`${origin(s.port)}/robots.txt`)));
  });

  test.afterAll(() => {
    for (const p of procs) p.kill();
  });

  for (const s of SITES) {
    test(`${s.brand}: home, category and product metadata + JSON-LD`, async ({ request }) => {
      const o = origin(s.port);
      const home = await getPage(request, `${o}/`);
      expectIndexable(home, `${o}/`);
      expect(types(home)).toEqual(expect.arrayContaining(['Organization', 'WebSite']));
      const site = node(home, 'WebSite')!;
      expect(JSON.stringify(site.potentialAction)).toContain(`${o}/search?q={search_term_string}`);
      const org = node(home, 'Organization')!;
      expect(String((org.logo as { url: string }).url)).toMatch(/^https?:\/\//);

      // Pick a category and a product from the sitemap (public, prefix-less URLs).
      const xml = await (await request.get(`${o}/sitemap.xml`)).text();
      const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
      const cat = locs.find((u) => u.startsWith(`${o}/c/`))!;
      const prod = locs.find((u) => u.startsWith(`${o}/p/`))!;
      expect(cat && prod).toBeTruthy();

      const c = await getPage(request, cat);
      expectIndexable(c, cat);
      expect(types(c)).toEqual(expect.arrayContaining(['BreadcrumbList', 'ItemList']));
      const list = node(c, 'ItemList')!.itemListElement as { url: string }[];
      for (const it of list) expect(it.url.startsWith(`${o}/p/`)).toBe(true);

      const p = await getPage(request, prod);
      expectIndexable(p, prod);
      expect(p.ogType).toContain('product');
      expectProductLd(p, prod);

      // Titles are unique across these pages.
      expect(new Set([home.title, c.title, p.title]).size).toBe(3);
    });

    test(`${s.brand}: robots.txt, sitemap.xml and llms.txt`, async ({ request }) => {
      const o = origin(s.port);
      const robots = await (await request.get(`${o}/robots.txt`)).text();
      expect(robots).toContain(`Sitemap: ${o}/sitemap.xml`);
      for (const bot of ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'CCBot']) expect(robots).toContain(`User-Agent: ${bot}`);
      for (const path of ['/admin', '/api/', '/azania', '/cart', '/checkout', '/account', '/order/', '/pay/']) expect(robots).toContain(`Disallow: ${path}\n`);
      expect(robots).not.toMatch(/Disallow: \/\n/);
      expect(robots).not.toMatch(/Disallow: \/pay\n/);

      const xml = await (await request.get(`${o}/sitemap.xml`)).text();
      const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
      expect(locs.length).toBeGreaterThan(10);
      for (const u of locs) {
        expect(u.startsWith(`${o}/`), u).toBe(true);
        expect(u).not.toMatch(/\/(mruk|skywood)(\/|$)/);
      }
      expect(xml).toContain('<lastmod>');
      expect(xml).toContain('<image:loc>');

      // Every sitemap URL resolves without a redirect (sample: home, first category, first product).
      for (const u of [locs[0]!, locs.find((x) => x.includes('/c/'))!, locs.find((x) => x.includes('/p/'))!]) {
        expect((await request.get(u, { maxRedirects: 0 })).status(), u).toBe(200);
      }

      // Pay Later page is listed only while the brand's switch is on (off = 404).
      const pl = (await request.get(`${o}/pay-later`, { headers: { 'User-Agent': GOOGLEBOT } })).status();
      expect([200, 404]).toContain(pl);
      expect(locs.includes(`${o}/pay-later`)).toBe(pl === 200);

      const llms = await request.get(`${o}/llms.txt`);
      expect(llms.status()).toBe(200);
      expect(llms.headers()['content-type']).toContain('text/markdown');
      const md = await llms.text();
      expect(md).toMatch(/^# (Mr UK|Skywood)\n/);
      expect(md).toContain('TZS');
      expect(md).toContain(`(${o}/p/`);
      expect(md).toContain(`(${o}/c/`);
      expect(md).not.toMatch(/\/(mruk|skywood)\/p\//);
      const full = await (await request.get(`${o}/llms-full.txt`)).text();
      expect(full).toContain('- Availability:');
      expect(full.length).toBeGreaterThan(md.length);
    });

    test(`${s.brand}: status codes and sister-brand redirect`, async ({ request }) => {
      const o = origin(s.port);
      expect((await request.get(`${o}/p/does-not-exist`, { headers: { 'User-Agent': GOOGLEBOT } })).status()).toBe(404);
      expect((await request.get(`${o}/c/does-not-exist`, { headers: { 'User-Agent': GOOGLEBOT } })).status()).toBe(404);
      expect((await request.get(`${o}/p/does-not-exist`)).status()).toBe(404);
      const r = await request.get(`${o}/${s.other}/c/fridges`, { maxRedirects: 0 });
      expect(r.status()).toBe(308);
      expect(r.headers().location).toBe(`${origin(SITES.find((x) => x.brand === s.other)!.port)}/c/fridges`);
      for (const path of ['/cart', '/checkout', '/search?q=fan']) {
        const pg = await getPage(request, `${o}${path}`);
        expect(pg.robots, path).toContain('noindex');
      }
      expect((await getPage(request, `${o}/privacy`)).status).toBe(200);
    });
  }

  test('JSON-LD is not blocked by the CSP and survives hydration', async ({ browser }) => {
    const o = origin(SITES[0].port);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && /Content Security Policy|hydrat/i.test(m.text())) errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/*', (r) => (r.request().url().startsWith(o) ? r.continue() : r.abort()));
    const xml = await (await page.request.get(`${o}/sitemap.xml`)).text();
    const prod = [...xml.matchAll(/<loc>([^<]+\/p\/[^<]+)<\/loc>/g)][0]![1]!;
    await page.goto(prod);
    await page.waitForLoadState('networkidle');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) expect(() => JSON.parse(b)).not.toThrow();
    expect(errors).toEqual([]);
    await ctx.close();
  });
});

test.describe('combined site (/<brand>/... URLs)', () => {
  for (const brand of ['mruk', 'skywood'] as const) {
    test(`${brand}: canonical, OG and JSON-LD`, async ({ request, baseURL }) => {
      const xml = await (await request.get('/sitemap.xml')).text();
      const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
      // The server under test may itself be single-brand (STORE_BRAND set): then only check its own brand.
      const single = !locs.some((u) => /\/(mruk|skywood)(\/|$)/.test(new URL(u).pathname));
      test.skip(single, 'server under test is a single-brand site (covered above)');
      const home = await getPage(request, `${baseURL}/${brand}`);
      expect(home.status).toBe(200);
      expect(home.canonical).toMatch(new RegExp(`^https?://[^/]+/${brand}/?$`));
      expect(types(home)).toEqual(expect.arrayContaining(['Organization', 'WebSite']));
      const prod = locs.find((u) => new URL(u).pathname.startsWith(`/${brand}/p/`))!;
      const path = new URL(prod).pathname;
      const p = await getPage(request, `${baseURL}${path}`);
      expect(p.title.length).toBeLessThanOrEqual(60);
      expect(p.description.length).toBeLessThanOrEqual(155);
      expect(new URL(p.canonical).pathname).toBe(path);
      for (const u of p.ogImage) expect(u).toMatch(/^https?:\/\//);
      expectProductLd(p, p.canonical);
      expect(locs.some((u) => new URL(u).pathname.startsWith(`/${brand === 'mruk' ? 'skywood' : 'mruk'}/`))).toBe(true);
    });
  }
});
