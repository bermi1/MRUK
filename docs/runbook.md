# Runbook

## Deploy
1. Managed PostgreSQL 16 (pgvector enabled), object storage (S3-compatible), CDN in front of the app.
2. Set environment from `.env.example` (production: real `ENCRYPTION_KEY`, `SESSION_SECRET` ≥ 32 chars, `APP_URL`, `DEV_SHOW_OTP=false`, adapters `live` once credentials exist).
3. `pnpm install --frozen-lockfile && pnpm db:generate && pnpm --filter @bt/db exec prisma db push && pnpm build && pnpm start`.
4. Seed only once on an empty database (`pnpm db:seed` wipes data).

## Rotate keys
- `SESSION_SECRET`: rotating signs everyone out and invalidates order-confirmation links.
- `ENCRYPTION_KEY`: requires re-encrypting `*Enc` columns (decrypt with old key, encrypt with new) — do it in a maintenance window.

## Operations
- Unpaid card/Azania-account orders auto-cancel after 30 min (run on checkout and dashboard load). For a cron, call `releaseExpiredReservations()`.
- Rate limits are in-memory per instance; for multiple instances move `server/ratelimit.ts` to Redis.
- Logs never contain message bodies, NIDA, salary or account numbers.

## Incidents
- Azania Bank API down: Salary Advance orders stay in `bank_review`; staff can request decisions later from Admin › Salary Advance.
- SMS down: orders still complete; customers can see status via Track order.
