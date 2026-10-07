# Architecture

```
Browser / PWA / Azania webview
        │  HTTPS (CSP nonce, HSTS)
        ▼
apps/web (Next.js 15, App Router, server components + server actions)
  ├─ middleware.ts      host → brand rewrite, CSP nonce, /admin gate
  ├─ app/[brand]/*      storefront (home, category, product, search, compare, deals,
  │                     suppliers, support, track, cart, checkout, pay, order, account)
  ├─ app/azania/*       Azania mini app (SSO cookie, PIN signing)
  ├─ app/admin/*        Commerce OS (staff session + TOTP, RBAC, audit)
  ├─ app/api/*          file downloads (contracts, invoices, uploads), reports CSV, data export
  └─ server/*           sessions, auth, cart, orders/checkout engine, catalog/CMS, support/AI
        │
        ├─ packages/core          pure domain logic (shared with the browser)
        ├─ packages/db            Prisma → PostgreSQL (field encryption, password hashing)
        └─ packages/integrations  adapters: AzaniaBank, Sms, WhatsApp, Storage, Ai, Pdf
```

Key decisions (Phase 0 proposals):
- **One Next.js app instead of three.** Storefront, admin and mini app share the domain engine, sessions and database; admin is isolated by route, auth and RBAC. Splitting `apps/admin`/`apps/mini` later is mechanical (they only import `server/*`).
- **Plain CSS with brand tokens as CSS variables** instead of a Tailwind preset — the prototypes are inline-styled; tokens live in the Brand table and are editable.
- **Own small i18n dictionary** (EN/SW) instead of next-intl for this phase; product data stays as entered.
- **Retrieval for AI** is keyword + synonym retrieval over the catalogue (`packages/core/src/catalogue-ai.ts`); ProductEmbedding stores the indexed text. pgvector embeddings can replace the retriever without changing callers (the docker image already ships pgvector).
- **Payments:** card and Azania account use a hosted-payment step (`/[brand]/pay/[number]`), mocked until gateway credentials arrive. Stock is reserved at order time and released after 30 minutes unpaid, on cancel or on bank rejection.
- **Order states** `placed → bank_review → approved → packed → out_for_delivery → delivered` (+ `cancelled`, `rejected`); **advance states** `draft → submitted → approved|rejected → disbursed → repaying → closed`. Both enforced in `packages/core`.
