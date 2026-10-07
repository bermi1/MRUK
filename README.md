# Mr UK and Skywood Commerce Platform

One platform for two Tanzanian appliance brands with Azania Bank Salary Advance (project BT-UXD-2026-014, Bermi Techs).

| Surface | URL |
|---|---|
| Shared landing page | `/` |
| Mr UK store / Skywood store (desktop + installable PWA on phones) | `/mruk`, `/skywood` (or hosts `shop.mruk.co.tz`, `shop.skywood.co.tz`) |
| Azania Bank mini app | `/azania?token=<sso token>` (demo sign-in button in development) |
| Commerce OS admin | `/admin` |

## Quick start

Requirements: Node 22, pnpm 10, PostgreSQL 16 (Docker or local).

```bash
cp .env.example .env          # then set ENCRYPTION_KEY and SESSION_SECRET (openssl rand -hex 32 / -base64 48)
pnpm install
pnpm db:up                    # docker compose postgres, or the local service
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm dev                      # http://localhost:3000
```

Staff sign in at `/admin/login` with a seeded account (e.g. `bernard@bermitechs.com`, password `SEED_STAFF_PASSWORD`, default `ChangeMe-2026!`). Two-factor authentication (TOTP) is enrolled with an authenticator app on first sign-in.

## Test payments (mock adapters)
- Card: `4242 4242 4242 4242`, any future expiry and CVC. `4000 0000 0000 0002` is declined.
- Azania account: any 10+ digit account, any 4-digit PIN except `0000`.
- Salary Advance: instalment must be at most one third of net salary; the mock bank approves when that holds.
- Phone OTP: in development the code is shown on screen (`DEV_SHOW_OTP=true`); SMS is mocked.

## Checks
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
```

## Layout
- `apps/web` — Next.js 15: storefront, PWA, mini app, admin, API routes.
- `packages/core` — domain logic (pricing, instalments, affordability, state machines, catalogue-grounded AI), 100% unit-tested.
- `packages/db` — Prisma schema, seed, field encryption.
- `packages/integrations` — Azania Bank, SMS, WhatsApp, storage, AI (Anthropic), PDF adapters with mocks.
- `handoff/` — the design handoff (prototypes, brand data, contract brief).
- `assets/logos`, `tools/remove-logo-bg.py` — transparent brand logos and the background-removal tool.
- `docs/` — architecture, runbook, security, retention, phase reports.
