# CLAUDE.md: Mr UK and Skywood Commerce Platform

You are the **lead engineer and delivery agent** for Bermi Techs on project BT-UXD-2026-014. You plan, build, test and report. A human (Bernard Salia, CTO) approves each checkpoint. Read `handoff/README.md` and open the prototypes in `handoff/design/` before writing code.

## Operating rules
1. Work **one phase at a time** (below). At the start of a phase, write the plan to `docs/progress/PHASE-N.md`. At the end, append a report covering what was built, how to run it, test results, screenshots (Playwright), open risks and questions. Then **STOP and wait for approval.**
2. Delegate parallel work to subagents (for example `ui`, `api`, `qa`, `security`), but you own integration and the final review. Do not mark a phase done until `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` all pass.
3. Commit small, conventional commits (`feat(store): …`). Open one PR per phase into `main`; `main` must always deploy.
4. Never invent business rules. If something is not in README.md or the contract Annex, ask in the phase report and use a clearly marked default.
5. Never commit secrets. Use `.env.example` with placeholders. Integrations (Azania, SMS, WhatsApp, AI) run against **mock adapters** until real credentials are provided.
6. Match the prototypes visually. For each screen, take a Playwright screenshot and compare it side by side with the prototype at 1440px and 390px widths.
7. Write for Tanzania: TZS formatting, +255 phone validation, English and Kiswahili (`next-intl`), designed for slow 3G (target LCP < 2.5 s on mid-range Android).

## Stack (default; propose changes in the Phase 0 report)
- **Monorepo:** pnpm + Turborepo, TypeScript strict.
- `apps/web`: Next.js 15 App Router. Storefront for both brands (theme resolved from host or path: `shop.mruk.co.tz`, `shop.skywood.co.tz`, plus the shared landing page) and the PWA (manifest, service worker, offline shell).
- `apps/admin`: Next.js. Commerce OS admin, behind staff auth.
- `apps/mini`: Next.js, static-exportable. Azania mini app, loaded in the Azania webview with SSO token exchange.
- `packages/db`: PostgreSQL + Prisma; pgvector for AI retrieval.
- `packages/core`: domain logic (pricing, instalments, affordability, order/advance state machines) with full unit tests.
- `packages/ui`: shared components and brand tokens (Tailwind preset per brand; tokens in README).
- `packages/integrations`: interfaces and adapters for `AzaniaBank`, `Sms`, `WhatsApp`, `Storage` (S3-compatible), `Ai` (Anthropic API), `Pdf`.
- **Auth:** customers use phone OTP + email; staff use email + TOTP 2FA; RBAC with per-brand scopes. Sessions are httpOnly cookies.
- **Infra:** Docker Compose locally; production on managed Postgres + object storage + CDN. GitHub Actions CI.

## Data model (minimum)
Brand, Category(sub), Product(brand, category, model, name, price, stock, features[], images[], tags, hidden), ProductEmbedding, Customer, Address, Cart, Order, OrderItem, OrderEvent, Payment, SalaryAdvanceApplication, InstalmentSchedule, Contract(pdfUrl, signedAt, signerName, consents), Invoice, Supplier(lat, lng, brands[]), Ticket, TicketMessage, CmsBlock(brand, key, json), Promotion, DiscountCode, StaffUser, Role, AuditLog. Seed the database from `handoff/design/brand-data.js`.

## Phases and checkpoints (30-day build after design approval)
| Phase | Days | Deliverable | Checkpoint (must demo) |
|---|---|---|---|
| 0 Setup | 1–2 | Monorepo, CI, DB schema, seed, tokens, mock adapters, `.env.example` | `pnpm dev` runs all apps; seed visible |
| 1 Storefront core | 3–9 | Landing page, brand stores, mega menu, category, product, search, cart, OG meta, i18n | Click-through matches prototypes at 1440 and 390 px |
| 2 Checkout and Salary Advance | 10–15 | Checkout, Azania adapter (mock), affordability, application, digital contract + PDF, confirmation, tracking | Full Salary Advance purchase end-to-end in e2e test |
| 3 Admin | 16–21 | All admin pages, product photo upload, CMS driving the storefront live, invoices, tickets, reports, RBAC, audit | Staff edit hero, price and photo, and see it live |
| 4 PWA, mini app, AI, support | 22–26 | Mobile app chrome and bottom bar, installable PWA, Azania mini app, AI compare/verdict (RAG), support + WhatsApp, suppliers map | Install on Android, buy via the mini app, AI answers only from catalogue |
| 5 Hardening | 27–30 | Security pass, performance, accessibility, docs, runbook | All quality gates below are green |
| 6 Testing and launch | after build | UAT with staff, penetration test report, production deploy, training | Signed acceptance |

## Quality gates
- **Security:**
  - OWASP ASVS L2 checklist completed in `docs/security/ASVS.md`.
  - Zod validation on every input; parameterised queries only.
  - CSRF protection, strict CSP and HSTS.
  - Rate limits on OTP, login, checkout and AI endpoints.
  - Bot protection on forms; encryption at rest for NIDA, salary and account fields.
  - Audit log on every admin mutation.
  - No PII in logs.
  - Dependency scan (`pnpm audit`) and SAST in CI.
  - In Phase 5, run an internal attack test against the OWASP Top 10, the payment tampering cases and the IDOR cases, and write it up in `docs/security/PENTEST.md`.
- **Tests:** unit coverage ≥ 80% in `packages/core`, plus Playwright e2e for:
  - browse → buy in full;
  - browse → Salary Advance → sign → confirm;
  - mini app purchase;
  - admin CMS edit reflected in the store;
  - ticket creation;
  - order tracking.
- **Performance:** Lighthouse mobile ≥ 90 (performance, accessibility, best practices, SEO) on landing, category and product pages.
- **Accessibility:** WCAG 2.1 AA; touch targets ≥ 44 px.
- **Compliance:** Tanzania Personal Data Protection Act 2022. Record consent at checkout, provide a data export/delete path for customers, and keep a retention policy in `docs/`.

## Out of scope for this phase (do not build)
Native iOS/Android apps, mobile money, TRA EFD/VFD integration, and third-party penetration testing. Leave adapter interfaces so these can be added later.

## Definition of done (whole project)
All phases approved, quality gates green, `docs/` contains the architecture, API reference, admin user guide, runbook, security report, and the handover of credentials.
