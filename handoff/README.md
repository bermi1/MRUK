# Handoff: Mr UK and Skywood Commerce Platform

Project: BT-UXD-2026-014 · Agreement: BT-AGR-2026-015
Built by Bermi Techs (Bernard Salia, Founder and CTO, bernard@bermitechs.com, +255 686 990 359)
Live design reference: https://mrukandskywooduiandux.vercel.app/

## How to use this package with Claude Code

1. Create an empty repo and copy this whole folder into it as `/handoff`.
2. Copy `handoff/CLAUDE.md` to the repo root (Claude Code reads it automatically on every session).
3. Open Claude Code in the repo and paste the contents of `handoff/MASTER_PROMPT.md` as the first message.
4. Claude Code works phase by phase (see CLAUDE.md). It stops at every **CHECKPOINT** and writes a report to `docs/progress/PHASE-N.md`. Review it, then reply `approved, continue` or give corrections.

## Single-file version
`Mr UK and Skywood - Full Platform (single file).html` contains the whole design in one offline file: the landing page, both brand stores, the mobile web app, the Azania mini app and the Commerce OS admin. Open it in any browser or attach it straight to Claude. The separate files in `design/` hold the same screens, split up for easier reading.

## Overview

One commerce platform for two Tanzanian home-appliance brands, **Mr UK** and **Skywood**, with Azania Bank Salary Advance (buy now, pay monthly from salary). It has four surfaces sharing one backend:

| Surface | Users | Design file |
|---|---|---|
| Website, a shared landing page plus two full brand stores | Customers on desktop | `design/Mr UK and Skywood Website.dc.html`, `design/Brand Store.dc.html` |
| Web app (PWA): the same site on phones, behaving like a native app | Customers on mobile | `design/Brand App.dc.html` |
| Azania Bank mini app, embedded in the Azania app | Azania customers | `design/Azania Mini App.dc.html` |
| Commerce OS admin, one portal for both brands | Staff | `design/Commerce Admin v2.dc.html` |

Shared sample data, brand config and the CMS model are in `design/brand-data.js`. The full contractual scope is in the Annex of `contract/Bermi Techs Agreement and MOU - English.dc.html`; that Annex is the source of truth for scope.

## About the design files

The `.dc.html` files are **design references built in HTML**. They are clickable prototypes showing the intended look and behaviour, **not production code**. Open them in a browser; `support.js` must sit next to them. Recreate them in the production stack defined in CLAUDE.md. Do not copy prototype code or `localStorage` persistence into production.

## Fidelity

**High-fidelity.** Colours, type, spacing, radii and flows are final. Recreate them pixel-close, one brand theme at a time, using the tokens below.

## Screens

### Website (desktop, ≥1024px)
- **Landing page** (`Mr UK and Skywood Website`): a clean hero with both brand entrances; a three-step Salary Advance explainer; hot products from both brands (staff-picked in admin); combo deals; one combined footer with both logos, category lists, help links and the Azania partnership.
- **Brand store** (`Brand Store`, themed per brand):
  - Header: announcement bar, logo, search, login, compare, cart and a category bar.
  - Mega menu on category hover: sub-categories, 4 featured products, and a promo card (editable in CMS).
  - Home: rotating hero with monthly price, photo category cards, "New this season" auto-scroll (up to 8 items, pauses on hover), spotlight product, favourites with ratings, reviews, deals, and suppliers near you.
  - Category page: sub-category filters, sort, grid/list toggle, and compact cards showing stock, price, monthly price and quick add.
  - Product page: gallery, features, stock, and two clear purchase paths, **Pay in full** or **Azania Salary Advance** (3/6/12-month terms, live monthly amount). Also a share sheet (WhatsApp, Facebook, Instagram Story, X) that previews the Open Graph card.
  - AI compare: up to 3 products side by side with an AI verdict (best overall, best value, who each suits) and a free-text question. Answers come **only from catalogue data** (retrieval over the products table).
  - Deals: countdown, bundles with was/now prices, offer banners.
  - Suppliers near you: list sorted by distance, with map, directions, WhatsApp and call.
  - Support: pick an issue, add details and a photo, see AI quick fixes, then send to the team or WhatsApp. Each request creates a ticket in admin.
  - Track order: enter the order number to see a status timeline.
  - Checkout: delivery region and fee, contact details, and payment options: Azania Salary Advance and Azania account (shown with the **Azania logo** as their icon), card, and pay on delivery. **No mobile money in this phase.**
  - Salary Advance application: NIDA, employer, check number, job title, net salary and Azania account. A live affordability check flags instalments above one third of net salary.
  - Digital contract: parties, goods, total, term, monthly instalment, first deduction date and the full schedule. Then 8 key terms, a typed signature and 2 consent boxes. Produces a PDF stored with the order.
  - Order confirmed: next steps, Salary Advance card (paid/remaining/monthly), summary and contract download.

### Web app (mobile, <768px): same routes, app chrome
- Brand switch at the top, so one app covers both brands.
- Bottom bar: Home · Shop · **raised centre Cart** · Deals · Account.
- Shop: 3-column compact cards (square image, round "+" button, name, price, monthly price).
- Product page: sticky app bar (back · category/brand · share · cart with badge), category chips, a contained hero image, breadcrumb, price row, purchase options and a "More in {category}" horizontal rail.
- Account: login/register by phone OTP, orders, details, payment methods, language (EN/SW), settings.
- Installable PWA: manifest, theme colour `#1D2366`, standalone display, offline shell.

### Azania mini app
Four steps: Shop (shows pre-approved limit) → Choose term → Review and sign with PIN → Approved (active plan). Uses bank-held KYC data, so the customer fills no forms.

### Commerce OS admin
Pages: Dashboard (KPIs; filter by brand and branch), Orders, Salary Advance, Invoices, Products and photos, Website CMS (announcement, hero slides, mega-menu promo, deals, SEO/OG with Google/WhatsApp/Facebook previews), Promotions and deals (hot picks, combos, discount codes), Support tickets, Reports (Excel/PDF export), and Settings and users (roles, per-brand access, integrations, notifications, 2FA, session timeout, backups).

## Interactions and behaviour
- Admin changes (price, stock, photos, CMS, hot picks) go live on every surface without redeploying.
- Stock is reserved when an order is placed and released on cancel or timeout.
- Order states: `placed → bank_review → approved → packed → out_for_delivery → delivered` (plus `cancelled` and `rejected`).
- Salary Advance states: `draft → submitted → approved | rejected → disbursed → repaying → closed`.
- A WhatsApp floating button appears on every customer page.
- Every product and page has OG/Twitter meta generated server-side (image, name, price, monthly price).
- Transitions are 150–250 ms ease-out; mega menus open on hover with a 120 ms delay.

## Design tokens

| Token | Mr UK | Skywood |
|---|---|---|
| primary | `#1D2366` | `#111216` |
| dark | `#12164A` | `#0A0A0C` |
| soft (surface) | `#EEF0F8` | `#F1F1F2` |
| accent | `#A7A9AC` | `#C9A96E` (champagne gold) |
| highlight | `#0098DA` | `#C9A96E` |
| radius large / small | `22px` / `16px` | `8px` / `6px` |
| heading weight / tracking | `600` / `-0.032em` | `500` / `-0.01em` |

- Shared: text `#12152B`, muted `#8A8EA3`, monthly-price blue `#0078B4`, border `#F0F1F5`.
- Fonts: Geist (UI) with IBM Plex Sans/Mono (documents). Use system fallbacks.
- Spacing: 4-based scale (4, 8, 12, 14, 16, 20, 24, 32, 48, 72). Cards are shadowless or carry a soft shadow `0 10px 30px rgba(18,22,74,.10)`.
- Currency: `TZS 2,450,000` (no decimals).

## Assets
- `design/assets/`: Mr UK, Skywood, Azania Bank and Bermi Techs logos. Get the official vector logos from each company before launch.
- Product photos in the prototypes are hot-linked from mruk.co.tz and skywood.co.tz. Production must use images uploaded via admin to object storage.

## Files
`design/*.dc.html` (prototypes), `design/brand-data.js` (data model and sample catalogue), `contract/` (scope Annex, SLA and timeline).
