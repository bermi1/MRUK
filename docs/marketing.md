# Marketing, campaigns and loyalty

Commerce OS › **Campaigns and loyalty** (`/admin/marketing`) covers sign-ups for each store, bulk SMS / WhatsApp / email campaigns with promo codes, and per-brand loyalty points. Mr UK and Skywood share one database, but every subscriber, campaign and loyalty balance belongs to one brand, and staff only see the brands in their scope (the header brand switcher applies).

| Piece | Where |
|---|---|
| Data model | `Subscriber`, `Campaign`, `CampaignSend`, `LoyaltyLedger` in `packages/db/prisma/schema.prisma` |
| Pure rules (tested) | `packages/core/src/marketing.ts` (audience filters, message rendering, SMS segments, loyalty maths, `LOYALTY_DEFAULTS`) |
| Server | `apps/web/src/server/marketing.ts` (`MARKETING_DEFAULTS`, sign-up, opt-out, audience, sending), `apps/web/src/server/loyalty.ts` |
| Storefront actions | `apps/web/src/app/actions/marketing.ts` (`subscribeAction`, `unsubscribeAction`) |
| Admin actions | `apps/web/src/app/actions/marketing-admin.ts` |
| Admin pages | `/admin/marketing` (campaigns), `/new`, `/[id]`, `/subscribers`, `/loyalty`, `/admin/customers/[id]` (points + ledger) |
| Unsubscribe page | `/[brand]/unsubscribe?t=<signed token>` |
| Scheduled job | `/api/cron/campaigns` + `apps/web/vercel.json` |
| Email | `Email` interface + `MockEmail` in `packages/integrations/src/messaging.ts` (`EMAIL_ADAPTER=mock`) |

## Permissions

| Permission | Allows | Roles |
|---|---|---|
| `marketing` | View campaigns, subscribers, loyalty, live audience counts | Super admin (`*`), Store manager |
| `marketing.write` | Create/send/schedule/cancel campaigns, test-send, unsubscribe a person, adjust points | Super admin, Store manager |
| `promos.write` (existing) | Also needed to create a new promo code from inside the campaign builder | Super admin, Store manager, Catalogue editor |
| Subscriber CSV export | Super admin and Store manager roles only (personal data), audit-logged | |

Existing databases get the new permissions on the Store manager role at the next deploy: `seed.ts --tokens` (run by `db:deploy` when data already exists) adds missing permissions from `ADDED_PERMISSIONS` and never removes anything. Other roles can be granted them in Settings by an owner.

## Consent and opt-out (PDPA 2022)

- **Sign-up** (`subscribeAction`): name optional, Tanzanian mobile (normalised to `+255…`) and/or email, `consent` must be `true`, rate limited (`limit('subscribe', 5/hour per phone or email, 15/hour per IP)`), honeypot field `website` (if filled, the request is silently accepted and dropped). One row per brand + phone and per brand + email; signing up again re-subscribes and refreshes `consentAt`. The sign-up is linked to a customer account by phone or the signed-in session.
- **Every campaign message** starts with the brand name and ends with `Reply STOP to opt out or visit <unsubscribe link>` (email: an unsubscribe footer). The link is per recipient and HMAC-signed (`SESSION_SECRET`); the page asks for a click (a POST), so SMS link previewers cannot unsubscribe people.
- **Unsubscribing** writes suppression rows (`Subscriber.unsubscribedAt`) for the person's phone and email for that brand only. Every audience resolution excludes suppressed addresses on all channels. Staff can unsubscribe a person from the Subscribers list (audited).
- **Inbound STOP**: `unsubscribePhone(brand, phone)` in `server/marketing.ts` is ready for the live SMS gateway's inbound webhook (not wired: the SMS adapter is a mock).
- **Account deletion** deletes the person's sign-ups (all brands) and loyalty ledger; **data export** includes both.

## Audiences

| Audience | Who |
|---|---|
| Subscribers | Brand sign-ups with consent, not unsubscribed, opted in to the channel (SMS / WhatsApp / email) |
| Customers | People who ordered from the brand, accepted the privacy notice, account not deleted, not unsubscribed (soft opt-in, see DEFAULTS) |
| Subscribers and customers | Both, each phone/email once |

Optional filters (orders with this brand, excluding cancelled/rejected): bought from a category, no order in the last N days, at least N orders, loyalty tier. Subscribers who never ordered only match when no order-based filter is set (or tier = Member). The builder shows the live recipient count and how many were excluded because they opted out; the send confirmation repeats the count (and, for SMS, the total number of SMS parts).

SMS length: GSM-7 = 160 characters (153 per part when split); any other character (emoji, curly quotes, many accented letters) switches the whole SMS to Unicode = 70 (67 per part). The counter in the builder measures the final text including the brand prefix, opt-out text and a full-length unsubscribe link.

## Sending

`sendCampaign()` claims the campaign (`sending`), resolves the audience, then for each recipient first inserts a `CampaignSend` row keyed by `(campaign, sha256(channel:address))` and only then sends. Re-running (a retry, the cron job, two staff clicking at once) never messages anyone twice. Messages go out in chunks of 50 with a short pause; one run sends at most 1,000 messages or runs ~45 s, leaves the campaign in `sending`, and the cron job resumes it. `CampaignSend.to` holds a masked number/email only; failures keep a short error with digits removed. `Campaign.stats` = `{ targeted, sent, failed, optedOut }`.

Before sending, the attached promo code must be active, unexpired and valid for the brand; a message that uses `{code}` without a code is refused. Test-send goes to one staff phone/email, marked `[TEST]`.

## Scheduled campaigns (cron)

`GET|POST /api/cron/campaigns` with `Authorization: Bearer $CRON_SECRET` sends scheduled campaigns that are due, resumes interrupted ones (`sending` for 2+ minutes) and writes loyalty expiry. Without a `CRON_SECRET` (16+ characters) it refuses every request.

`apps/web/vercel.json` schedules it daily at 05:00 UTC (08:00 EAT). Vercel Hobby allows one run per day, so a campaign scheduled for 14:00 goes out at 08:00 the next morning; on Pro change the schedule (e.g. `*/15 * * * *`), or call the URL from any external scheduler. If the Vercel project's root directory is the repository root rather than `apps/web`, move the `crons` entry into that `vercel.json`. Staff can always open a scheduled campaign and press **Send now**.

## Loyalty

Points live in `LoyaltyLedger` per customer **and brand** (Mr UK points and Skywood points are separate). Orders earn when they move to **delivered** (staff order status change), once per order (idempotency key `order:<id>:earn`); if an order is later cancelled or rejected the points are reversed once (`order:<id>:reverse`). Today's order state machine does not allow cancelling a delivered order, so reversal triggers only if that changes (or for refunds when a refund flow exists). Guest orders earn when the phone matches a customer account. Staff adjust points from the customer page (reason required, audited; the balance cannot go below zero).

`getLoyalty(customerId, brand)` (storefront contract) returns `{ points, tier, valueTzs, nextTier, pointsToNext }`.

**Redemption at checkout is not built** (it changes payment and Salary Advance maths). `redeemPoints()` in `server/loyalty.ts` is the adapter point; see the `TODO(loyalty-redeem)`.

## DEFAULT business rules (awaiting client confirmation)

All in one place: `LOYALTY_DEFAULTS` (packages/core/src/marketing.ts) and `MARKETING_DEFAULTS` (apps/web/src/server/marketing.ts).

| # | Default | Open question |
|---|---|---|
| 1 | 1 point per TZS 1,000 of the delivered order total (incl. delivery fee, after discounts), rounded down | Exclude delivery? Earn on Salary Advance orders at delivery or after repayment? |
| 2 | 1 point = TZS 10 | Confirm value (1% back). |
| 3 | Tiers per brand by current balance: Member < 2,000 ≤ Silver < 10,000 ≤ Gold | Balance or points earned in the last 12 months? Tier benefits? |
| 4 | Points expire 12 months after they were earned (oldest first) | Confirm; notify before expiry? |
| 5 | Earn at "delivered", reverse on cancel/refund after delivery | Confirm. |
| 6 | Customers who bought from a brand and accepted the privacy notice may receive that brand's campaigns unless they opt out (soft opt-in) | Legal sign-off under PDPA 2022 for direct marketing, or switch `customersSoftOptIn` off to message explicit sign-ups only. |
| 7 | A phone sign-up opts in to SMS only, not WhatsApp | Add a WhatsApp tick to the forms? |
| 8 | Subscriber data kept until unsubscribe + 2 years (see data-retention.md) | Confirm. |
| 9 | No quiet hours / frequency cap | Add e.g. 08:00–20:00 EAT sending window and max 4 campaigns per person per month? |
