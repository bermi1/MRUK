---
name: lean-delivery
description: How to work on the Mr UK / Skywood project while saving the client's tokens and credits. Use for every task in this repository, especially UI/design changes, product pages, screenshots, tests and reports.
---

# Lean delivery (save tokens, get it right first time)

Lessons from this project: too many redesign rounds, pages overloaded then stripped, and heavy screenshots cost the client credits. Follow these rules on every task.

## 1. Agree before building (design work)
- Before any redesign, state in 3–6 bullets: the reference, and **one customer purpose per section**. Build only after the user agrees, unless they said "just do it".
- If the user names a reference site and it cannot be opened (bot protection, network), ask once for 2–4 screenshots; never try to bypass protection.
- Change only what was asked. Do not add sections, panels or features "to impress".

## 2. Accuracy over decoration
- Product pages: only that product's own photos and its own video. No generic category films, stock lifestyle shots or brand-wide quotes presented as product content.
- Never invent prices, discounts, urgency ("prices reset at midnight"), counts or claims. Use real catalogue data or a clearly marked placeholder.
- Hide what would look broken (products without photos, single-item "bundles", out-of-stock items in "best sellers").

## 3. Design defaults the client approved
- Calm type (display 300/400, UI 400/500, prices 600; nothing heavier). Navy/sky for Mr UK; ivory/bronze for Skywood.
- Product photos fill their frames; no hover zoom that crops (zoom on click/tap only).
- Hero video must fit the screen (16:9; on phones the full film above the copy) and must not be covered by the header; header compacts after scrolling.
- Light surfaces with a few blue bands; every image used once; ≥44px touch targets; reduced-motion safe.

## 4. Spend tokens carefully
- One pass of edits → one build → **one small check** → targeted tests → commit. Do not rebuild or screenshot after every tiny tweak.
- Screenshots: crop to the changed area, downscale (≈720px wide); avoid full-page captures unless the whole page changed. Never send more than 1–3 images per change.
- Run only the e2e specs that cover the change; run the full suite once before a larger commit or when shared code changed.
- Read only the lines you need (grep/sed ranges), not whole files. Reuse what is already known in the conversation.
- Use subagents only when the user asks or for genuinely parallel research; give them tight briefs and word limits.
- Keep replies short: what changed, how it was checked, what is open. No long essays.

## 5. Environment gotchas (avoid wasted runs)
- If Postgres refuses connections: `service postgresql start` first.
- Always test against a production build (`next build` + `next start -p 3000`); if Playwright starts `next dev` it overwrites `.next` — rebuild before `next start`.
- Before e2e: clear `"RateLimit"`, set `payLater.*` settings to `enabled=false`, remove `apps/web/.next/cache/fetch-cache`.
- Prisma CLI: run from `packages/db` (root `npx prisma` pulls a different version).
- New public folders served on single-brand sites must be added to `PASS_THROUGH` in `apps/web/src/middleware.ts`.

## 6. Finish properly
- Commit small, conventional messages with the session trailer; push to the session branch; no PR unless asked.
- Report honestly: tests run and results, anything not verified (e.g. live deploy), and open questions — in a few lines.
