# Build report — Phases 0–4 (first working build)

Bernard asked for a working app from the handoff plus transparent logos, so this build goes past Phase 0: every surface in the README runs against a real database with mock bank/SMS/AI adapters. **Stopping here for review** before Phase 5 (hardening) and Phase 6 (UAT/launch).

## What was built
| Area | Status |
|---|---|
| Logos | White backgrounds removed from the Mr UK, Skywood and Azania Bank logos (`assets/logos`, tool `tools/remove-logo-bg.py`), plus reversed and mark-only variants. Swapped into every prototype and the single-file bundle too. |
| Phase 0 | pnpm monorepo, Prisma schema (all CLAUDE.md models), seed from `handoff/design/brand-data.js` with 87 demo orders, advances, tickets and 6 staff roles; mock adapters; `.env.example`; CI workflow. |
| Phase 1 | Landing page; both brand stores themed from tokens; mega menu (120 ms hover); category (sub-filters, sort, grid/list); product page (gallery, pay in full / Salary Advance 3-6-12, share sheet with OG preview, related rail); search; cart; OG/Twitter meta + JSON-LD; EN/SW UI strings. |
| Phase 2 | Checkout (regions/fees, PDPA consent, 4 payment methods, Azania options with the Azania logo, no mobile money); hosted mock payment; Salary Advance application with live 1/3 affordability; digital contract (schedule, 8 terms, typed signature, 2 consents) → PDF stored; confirmation; tracking; stock reservation and release. |
| Phase 3 | Commerce OS admin: dashboard, orders, Salary Advance pipeline, invoices (PDF), customers, products and photo upload, inventory, brands/categories, website CMS (hero, mega promo, deals, SEO/OG previews) live on the store, promotions (hot picks, flash deals, codes), tickets, reports (CSV), settings/users, audit log. Staff 2FA (TOTP), RBAC with brand scopes. |
| Phase 4 | Phone app chrome (brand switch, bottom bar with raised cart); installable PWA (manifest, service worker, offline page); Azania mini app (SSO, bank-held KYC, PIN signing, approval); AI compare/verdict and support quick fixes answering only from catalogue/policy data (Anthropic adapter ready, mock by default); support tickets with photo + WhatsApp; suppliers with distance sort and map. |

## How to run
See the root `README.md` (`pnpm setup`, `pnpm dev`). Staff: `bernard@bermitechs.com` / `ChangeMe-2026!`, 2FA enrolled on first sign-in. Test card `4242 4242 4242 4242`.

## Results
- `pnpm lint && pnpm typecheck && pnpm test` — green. Core unit coverage 100% lines / 97% branches (41 tests); integrations 6 tests.
- `pnpm e2e` (production build) — **9/9 passed**: buy in full (incl. declined card), Salary Advance affordability block, Salary Advance → sign → confirm (contract PDF), ticket creation, order tracking, AI answers only from catalogue, admin 2FA + CMS edit live in store, mini app purchase (desktop + mobile).
- `next build` — passes; first-load JS ≈ 103–114 KB per route.
- Screenshots: `docs/progress/screens/`.

## Stack changes (proposed, please confirm)
1. One Next.js app (`apps/web`) for store, admin and mini app instead of three apps — shared domain engine, one deploy; admin isolated by route + auth + RBAC. Can be split later.
2. Plain CSS with brand tokens as CSS variables (prototypes are inline-styled) instead of a Tailwind preset; no `packages/ui` yet.
3. Small in-house EN/SW dictionary instead of `next-intl`.
4. AI retrieval is keyword+synonym over the catalogue (works without pgvector); pgvector embeddings can be added behind the same function.
5. Turborepo not added (pnpm workspaces are enough at this size).

## Defaults I chose (business rules not in the brief — please confirm)
- Unpaid card/Azania-account orders hold stock 30 minutes.
- First salary deduction on the 25th of the month after signing (from the prototype).
- Mock bank approves when instalment ≤ 1/3 of net salary and salary ≥ TZS 300,000.
- Bundles: the CMS "save %" is applied automatically when all bundle items are in the cart; flash deal % applies to the unit price.
- Pay on delivery only in Dar es Salaam (prototype). Free Dar delivery from TZS 500,000.
- Inventory is one stock figure per product (no per-branch stock in the schema yet).

## Open risks and questions
1. **Product photos** are hot-linked from mruk.co.tz / skywood.co.tz (3 are bundled locally). Please upload official photos in Admin › Products before launch; the store falls back to model-number tiles.
2. **Official vector logos** — the transparent PNGs are cleaned from the supplied rasters; vectors are still needed for print.
3. **Azania Bank API**: need the real contract (SSO token format, decision callback, account debit, customer lookup) and credentials.
4. SMS gateway, WhatsApp Business and S3 storage credentials.
5. Bot protection (CAPTCHA) and a shared rate-limit store (Redis) before multi-instance deploy.
6. Phase 5 items: pentest write-up, Lighthouse runs on a real device profile, WCAG audit.
