# OWASP ASVS L2 — status (Phase 0–4 build)

| Area | Control | Status | Where |
|---|---|---|---|
| V2 Authentication | Customer phone OTP, 6 digits, 5-min expiry, 5 attempts, rate limited | ✅ | server/auth.ts |
| V2 | Staff password (scrypt) + mandatory TOTP, lockout after 5 failures | ✅ | server/auth.ts |
| V3 Sessions | Random 256-bit tokens, SHA-256 stored, httpOnly, SameSite=Lax, Secure in prod, staff idle timeout | ✅ | server/session.ts |
| V4 Access control | RBAC permissions + per-brand scopes on every admin page/action; IDOR-safe order links (HMAC token or owner) | ✅ | requireStaff, orderForOwner |
| V5 Validation | Zod on every server action and route input; Prisma parameterised queries | ✅ | app/actions/* |
| V6 Cryptography | AES-256-GCM for NIDA, salary, account, TOTP secrets | ✅ | packages/db/src/crypto.ts |
| V7 Logging | Audit log on admin mutations; no PII in logs | ✅ | server/audit.ts |
| V8 Data protection | PDPA consent at checkout, export and delete | ✅ | checkout, /account |
| V9 Communications | HSTS, upgrade-insecure-requests | ✅ | next.config.ts, middleware |
| V12 Files | Upload type/size/magic-byte checks, safe storage keys, private files behind auth | ✅ | integrations/storage.ts, api/files |
| V13 API | Server actions have built-in Origin check (CSRF); route handlers are GET-only downloads | ✅ | |
| V14 Config | Strict CSP with nonce + strict-dynamic, no inline scripts; `style-src 'unsafe-inline'` for theming | ⚠️ accepted | middleware.ts |
| Bot protection | Rate limits on OTP, login, checkout, tickets, AI | ⚠️ partial — add Turnstile/hCaptcha before launch | |
| Pentest | Internal attack test (OWASP Top 10, payment tampering, IDOR) | ⏳ Phase 5 | docs/security/PENTEST.md |

## Marketing module
- Every marketing mutation (campaign create/schedule/send/cancel, test send, unsubscribe, loyalty adjust, CSV export, inline promo code) runs `requireStaff('marketing.write')` (export: Super admin / Store manager only), checks the brand scope, validates with Zod and writes `AuditLog` without PII (counts, ids, brand, channel only).
- Sign-up: Zod, +255 normalisation, consent required, DB rate limit per phone/email and IP, honeypot. Unsubscribe links are HMAC-signed per recipient and need a POST.
- `CampaignSend` stores masked recipients and a SHA-256 hash; message bodies and numbers are never logged. Sending is idempotent per recipient.
- `/api/cron/campaigns` requires `Authorization: Bearer CRON_SECRET` (constant-time compare; disabled when unset).
- Subscriber CSV export neutralises spreadsheet formulas (CSV injection).

Payment tampering: totals are always recomputed on the server from DB prices; the client never sends prices.
