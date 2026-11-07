# SEO and AI readiness

How the Mr UK and Skywood storefronts present themselves to Google, other search engines and AI assistants, and what the client still has to do.

## URL scheme (canonical URLs)

Each brand is a separate Vercel project built from this codebase (`STORE_BRAND=mruk|skywood`, `APP_URL`, `OTHER_STORE_URL`). See `apps/web/src/lib/site.ts`.

| Mode | Public (canonical) URL of a product | Also resolves (not canonical) |
|---|---|---|
| Single-brand site (production) | `APP_URL/p/<id>` | `APP_URL/<brand>/p/<id>` (internal links still use this form) |
| Sister brand, linked from the other site | `OTHER_STORE_URL/p/<id>` | `/<other-brand>/...` on this site: one 308 redirect to the sister site's prefix-less URL |
| Combined site (development, `STORE_BRAND` unset) | `APP_URL/<brand>/p/<id>` | |

- `<link rel="canonical">`, `og:url`, sitemap `<loc>`, JSON-LD URLs and llms.txt links always use the public form. Every sitemap URL returns 200 with no redirect.
- No trailing slashes (Next default `trailingSlash: false`); the home page is the bare origin.
- Filtered/sorted lists (`?sort=`, `?sub=`, `?n=`) canonicalise to the unfiltered page; `/shop?cat=x` canonicalises to `/c/x`.
- Custom domains: set `APP_URL=https://shop.mruk.co.tz` (and `OTHER_STORE_URL=https://shop.skywood.co.tz`) on the Mr UK project, and the reverse on Skywood, then redeploy. Canonicals, sitemap and llms.txt move to the new domain automatically. Keep the `*.vercel.app` domains redirecting to the custom domain (Vercel › Domains › Redirect) so there is one host per brand.
- Follow-up (not done here, to avoid clashing with the storefront UI work): make internal links prefix-less on single-brand sites, so links match canonicals exactly.

## Languages (no hreflang)

English and Kiswahili are chosen with a cookie (`bt_locale`), on the same URL. Crawlers do not send the cookie and see English. Because Kiswahili pages have no URL of their own, **hreflang is not emitted** (it would point Google at URLs that serve English). `<html lang>` follows the cookie. To rank in Kiswahili, add path-based locales (e.g. `/sw/...`) and then add `alternates.languages`.

## Metadata per page

Built by `pageMeta()` in `apps/web/src/server/seo.ts`: absolute title (≤ 60 chars, clipped on a word), description (≤ 155), canonical, Open Graph (site name per brand, `en_TZ`, absolute image URLs, fallback to the brand hero) and a `summary_large_image` Twitter card.

| Page | Title | Indexed |
|---|---|---|
| Brand home | CMS SEO title (Admin › CMS), else "Brand — tagline" | yes |
| Category `/c/x` | "Category in Tanzania · Brand"; description has subcategories, model count, lowest price | yes |
| Product `/p/id` | "Model Name · TZS price · Brand" (price dropped if too long); description: key features, price, Pay Later if on, delivery | yes, `og:type=product` + `product:price:*` |
| Shop, deals, suppliers, support, privacy | own titles | yes |
| Pay Later | "How Pay Later works…" | yes while the brand's Pay Later switch is on; **404 and absent from the sitemap when off** |
| Search results | | `noindex, follow` |
| Compare | | `noindex, follow` (per-visitor) |
| Cart, checkout, account, login, signup, order, pay, track, unsubscribe, admin, azania, offline | | `noindex` |
| Any page on a Vercel preview (`VERCEL_ENV` ≠ `production`) or with `SEO_NOINDEX=true` | | `noindex, nofollow`, robots.txt `Disallow: /` |

Pay Later copy is removed from titles/descriptions while the brand's switch (Admin › Settings › Pay Later) is off.

Crawlers get the metadata in `<head>` and a real HTTP status: `htmlLimitedBots` in `next.config.ts` adds Googlebot and the AI crawlers to Next's list, so metadata is not streamed for them. Unknown products and categories return **404** (checked in `p/[id]/layout.tsx` and `c/[cat]/layout.tsx`, above the `loading.tsx` stream; otherwise Next could only send a soft 404).

## Structured data (JSON-LD)

Server-rendered `<script type="application/ld+json">` (`components/seo/JsonLd.tsx`).

- **Home:** `Organization`+`OnlineStore` (name, legal name, logo, slogan, email, `sameAs` from the CMS social links, WhatsApp `contactPoint`, area served Tanzania) and `WebSite` with a `SearchAction` (`/search?q=`).
- **Category:** `BreadcrumbList` and `ItemList` of product URLs. **Shop:** `ItemList`.
- **Product:** `Product` (name, model, sku/mpn = model, brand, category, images, features as `additionalProperty`) with an `Offer`: price in TZS (flash-deal price while a deal runs), `availability` from live stock (0 = OutOfStock, 1–5 = LimitedAvailability, matching the "Only n left" badge, otherwise InStock), `priceValidUntil` (deal end date; **default: 30 days ahead** when no end date exists), `seller`. Plus `BreadcrumbList`.
- **Pay Later:** `FAQPage` from the on-page FAQ, `BreadcrumbList`.
- **No `aggregateRating` / `review`.** The `rating`/`reviews` fields in the catalogue are seed values, not real customer reviews, so they are not marked up. (Product pages still show star ratings from these seed values: open question for the client: hide them until real reviews exist.)
- Products without a photo have no `image` in JSON-LD (Google needs one for product rich results): upload photos in Admin › Products.
- Not marked up because the business rules are not in README/Annex: `shippingDetails`, `hasMerchantReturnPolicy`, `itemCondition`. Add them when the client confirms delivery fees and the return policy.

**CSP:** the site CSP is `script-src 'self' 'nonce-…' 'strict-dynamic'`. JSON-LD is data, not script: browsers never execute it, so CSP does not apply and it carries no nonce (a nonce caused a hydration mismatch before). The e2e test loads a product page and asserts no CSP or hydration console errors and that every JSON-LD block parses.

## sitemap.xml, robots.txt, llms.txt

- `/sitemap.xml` (`app/sitemap.ts`): this site's brand only; home, shop, categories, deals, Pay Later (only while on), suppliers, support, privacy and every visible product with `lastmod` = product `updatedAt` and its photos (`<image:loc>`). Live per request (cached catalogue). One file is fine below 50,000 URLs; switch to `generateSitemaps()` beyond ~40,000 products.
- `/robots.txt` (`app/robots.ts`): allow all; disallow `/admin`, `/api/`, `/azania`, `/cart`, `/checkout`, `/account`, `/order/`, `/pay/`, `/unsubscribe` (both `/x` and `/<brand>/x` forms; trailing slashes keep `/pay-later` open). AI crawlers are named and explicitly allowed on public pages: GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, Google-Extended, CCBot, Applebot-Extended, Amazonbot. To opt out of AI training later, change those entries to `Disallow: /` for the training bots (GPTBot, ClaudeBot, Google-Extended, CCBot, Applebot-Extended) and keep the search/user bots.
- `/llms.txt` and `/llms-full.txt` (`server/llms.ts`, [llmstxt.org](https://llmstxt.org)): Markdown generated from the cached catalogue: store summary, contact, policies (delivery, warranty/VAT, payment, Pay Later only while on), categories with links, every product with model, name, price in TZS, availability and URL. The full version adds features, images, the Pay Later FAQ and showrooms. Only copy the storefront already shows; nothing invented. Cached 5 min in browsers / 15 min at the CDN.
- The middleware lets `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/llms-full.txt` and `/privacy` through without the brand rewrite on single-brand sites.

## Other technical points

- One `<h1>` per page (home: the hero slide title). Product images: alt = "Model Name" (no repeated model), gallery photos numbered.
- Security headers and CSP unchanged. LCP unchanged (no new client JS; JSON-LD is server-rendered).
- Validation: `e2e/seo.spec.ts` starts the production build as both single-brand sites (ports `E2E_PORT+1/+2`) and checks titles, descriptions, canonical, `og:image`, JSON-LD Product/Offer fields, 404s, the sister-brand redirect, robots.txt, sitemap.xml (prefix-less, no redirects) and llms.txt; then the same on the combined site. Run `pnpm build` first.
- Manual checks: [Rich Results Test](https://search.google.com/test/rich-results) and [Schema Markup Validator](https://validator.schema.org/) on a product URL.

## What the client must do

1. **Custom domains:** add `shop.mruk.co.tz` and `shop.skywood.co.tz` to the two Vercel projects (DNS CNAME to Vercel), set `APP_URL` / `OTHER_STORE_URL` as above, redeploy, and redirect the `*.vercel.app` hosts to them.
2. **Google Search Console:** add each domain as a *Domain property* (DNS TXT verification at the domain registrar). Until the custom domains are live, add the `vercel.app` URLs as URL-prefix properties (HTML-tag verification is available through a deploy if needed).
3. **Submit sitemaps:** Search Console › Sitemaps › `https://shop.mruk.co.tz/sitemap.xml` and `https://shop.skywood.co.tz/sitemap.xml`. Do the same in Bing Webmaster Tools (it can import from Search Console; Bing also feeds ChatGPT search and Copilot).
4. **Request indexing:** Search Console › URL Inspection › paste the home page and key category URLs › *Request indexing*. New products are found through the sitemap; no need to submit each one.
5. **Google Business Profile:** one profile per brand (or per showroom with a fixed address and opening hours), with the website link set to the store URL and the same phone/WhatsApp as on the site. Ask happy customers for Google reviews there.
6. **Social profiles:** fill in Admin › CMS › Social links; they become `sameAs` in the Organization markup.
7. **Content:** upload a photo for every product, set an SEO title/description per brand in the CMS, and confirm delivery fees and the return policy so they can be added to the structured data.
8. **Merchant Center (optional):** for free product listings in Google Shopping, create a Google Merchant Center account per brand and link Search Console; the product structured data is already in place.
