# Admin UX audit: Commerce OS (Mr UK and Skywood)

Date: 12 November 2026 · Build: Next.js 15.5.28, served locally on port 3400 with `DEMO_MODE=true`, staff 2FA off (`STAFF_2FA_REQUIRED=false`) · Pay Later by Azania Bank: **OFF on both stores** (left off).

How this was tested:

- Each of the six seeded staff roles signed in with Playwright: Super admin, Store manager, Catalogue editor (Skywood only), Warehouse (Mr UK only), Support and Finance.
- Each role walked every tab it can see, at 1440 px and 390 px wide. That is 118 page views, all returning HTTP 200.
- The real daily jobs were then done in a browser, counting the clicks, typed fields and screens each one took.
- Scripts:
  - `tools/admin-ux-walk.mjs <before|after>` saves screenshots and layout metrics (horizontal scroll, touch targets under 40 px, console errors) to `docs/screens/admin-ux/{before,after}/_metrics.json`.
  - `tools/admin-ux-jobs.mjs [url] [width]` runs the daily jobs and writes `docs/screens/admin-ux/jobs/_jobs-<width>.json`. It cleans up after itself: the test product, the promo code and the announcement are put back.
- Screenshots:
  - `docs/screens/admin-ux/before/<role>-<tab>-<width>.png`: every role and every tab.
  - `docs/screens/admin-ux/after/`: the tabs changed by this audit. These are dashboard, orders, customers, products, inventory, promos and cms.

## Verdict

**Yes, it is a standard, modern admin, and it is easy to run day to day. Ease score: 7.5 / 10 now, up from about 6.5 before the fixes.**

The basics are solid:

- Every function the client asked about works end to end:
  - receiving an order and taking it through to delivery
  - pay-on-delivery cash being recorded
  - downloading the invoice PDF
  - restocking and low-stock lists
  - pricing and publishing drafts
  - adding a product with photos
  - CMS edits that go live at once
  - promo codes
  - ticket replies and internal notes
  - reports with CSV export
  - staff and roles
  - the audit log
- Each role sees only its own tabs, and the dashboard opens on that role's work queue ("My tasks").
- Status badges use the same colours on every page. Money is shown in TZS. Phone numbers use the +255 format.
- There was **no horizontal page scroll** on any tab at 390 px, before or after the fixes.

The weak spots were:

- **Phone use was hard.**
  - Orders, inventory, products and customers were wide tables that scrolled sideways inside the card, so the status, amount and stock columns were hidden off-screen.
  - Tapping an order opened its detail about 5,200 px further down the page, below 50 rows.
  - 920 touch targets were smaller than 40 px across all 390 px views. Hidden file inputs and checkboxes inside labels are not counted in that number.
- **A warehouse user could not take stock down** for damaged or miscounted units. Their only option was "Add". A minus number was refused with a raw developer message: "Number must be greater than or equal to 1".
- **Pay Later read as on when it is off.** The sidebar said "Azania Bank link · Connected · mock". The CMS showed Pay Later wording that the store quietly leaves out.
- Small things made the screens feel less polished:
  - Amounts wrapped onto two lines ("TZS / 2,704,800").
  - Prices in the edit boxes had no thousands separators (2450000).
  - The quick-restock box and button sat on two lines, which doubled each row's height.
  - Product images that failed to load showed the browser's broken-image icon.
  - The Skywood status pill showed in a white box, because the storefront's Skywood styles leaked into the admin.
  - Hot-pick cards had their "Off" tags out of line.
  - "+ New discount code" was hidden at the bottom of the page, under the codes table.

After the fixes:

- Undersized touch targets dropped from 920 to 68, and those 68 are mostly date pickers and links inside paragraphs.
- On a phone, the order detail now opens at the top of the screen (519 px down, just under the page header) instead of about 5,200 px down.
- Every job runs end to end at both widths.

It does not yet match the most polished commercial admins (Shopify or Stripe level) in three places:

- There is no bulk editing. Pricing the 50 Mr UK drafts takes about 100 interactions, one row at a time.
- The tables have no column sorting.
- The audit log is a section at the bottom of Settings, not its own page.

## Per-tab review

Ease of use: 5 = effortless. Difficulty to operate: 1 = trivial, 5 = hard. Scores are after the fixes; where a fix changed the score, the "before" score is in brackets.

| Tab | Roles | Purpose | Ease (1–5) | Difficulty (1–5) | Issues found | Status |
|---|---|---|---|---|---|---|
| Dashboard | all (each role sees its own version) | Greeting, quick actions, role queue, KPIs, brand performance, recent orders | 4 | 2 | Recent-orders table scrolled sideways on a phone and order numbers were 16 px tap targets. The "Awaiting Azania Bank" KPI still counts old applications while Pay Later is off. | Fixed: cards on phone, whole row opens the order. KPI left as is, because it is correct for applications already in progress. |
| My tasks | all | Work routed to me or my team, with Open / Take it / Mark done | 4 | 2 | Task titles were 19 px tap targets on a phone. | Fixed: 44 px. |
| Orders | owner, manager, warehouse, support, finance | Order queue, status tabs, search, detail with one-click steps | 4.5 (3) | 2 (3) | Phone: status and amount were off-screen and the detail was about 5,200 px down. Amounts and "Dar es Salaam" wrapped. Only the tiny order number opened an order. Pay-on-delivery "Mark delivered" did not say it records the cash. | Fixed: phone cards (number + amount, customer + status), detail first with "← Back to the order list", whole row clickable, no wrapping. The button now reads "Mark delivered · cash TZS X collected" with an explanation. |
| Invoices | owner, manager, finance | List, preview, PDF, WhatsApp/SMS send, void, walk-in invoice | 4 | 2 | Clear and well aligned. Search needs Enter (no button). | Open (minor) |
| Salary Advance | owner, manager, finance | Azania application pipeline (kanban) | 4 | 2 | The Skywood "Off" pill in the banner sat in a white box (storefront CSS leak). The pipeline still shows old applications while Pay Later is off, which is correct. | Fixed (CSS leak) |
| Customers | owner, manager, support, finance | Customer list and detail | 4 (3) | 2 | Seven-column table scrolled sideways on a phone and the name link was the only target. | Fixed: phone cards (name + lifetime value, phone + Salary Advance), whole row opens the customer. |
| Products and photos | owner, manager, catalogue | Catalogue table, inline price and stock, Live/Hidden, drafts, photo upload, editor | 4 (3) | 2.5 (3) | Prices without separators and left-aligned. Tapping "Live" hid a product from the store with no confirmation. Only a green border showed that an edit was saved. Status pills were 23 px on a phone. No bulk price entry for the 50 drafts. | Fixed: "2,450,000" right-aligned, "Saved" message, confirmation before hiding, phone cards with 44 px controls. Bulk pricing is **open** (client decision). |
| Inventory | owner, manager, catalogue, warehouse | Stock by SKU, reserved units, low stock, restock | 4.5 (3) | 2 (3.5) | Units could not be removed (raw validation error). Restock box and button on two lines. Broken images. Available and restock off-screen on a phone. | Fixed: "Add / remove units" (−2 removes, never below 0, audit-logged as `product.stock_remove`), one-line form, image fallback, phone cards (product + status, Available + restock). |
| Brands and categories | owner, manager, catalogue | Brand cards, categories and sub-categories, show/hide in the menu | 3.5 | 2 | Shows developer design tokens (card corners, heading weight, letter tracking) that mean nothing to staff. | Open (client decision: hide or keep) |
| Promotions and deals | owner, manager, catalogue | Hot picks, combo deals, flash deals, discount codes | 4 (3) | 2 (3) | "+ New discount code" was hidden at the bottom under the table. Hot-pick tags were out of line. Brand chip touched the text in flash deals. | Fixed: button at the top of the card with a short help line, aligned card footers, chip spacing. |
| Campaigns and loyalty | owner, manager | SMS/WhatsApp/email campaigns, subscribers, loyalty | 4 | 2.5 | Well laid out. Full of "E2E offer …" test campaigns. | Open: clean the demo data before UAT |
| Website CMS | owner, manager, catalogue | Announcement, hero slides, social links, mega-menu promo, bundles, SEO previews | 4 | 3 | The page is long (hero form with 5 slides). Pay Later wording is shown although the store leaves it out while Pay Later is off. | Fixed: a note explains that Pay Later copy is left out of the live site while it is off. Long page is open (could use collapsible slides). |
| Support tickets | owner, manager, support | Ticket list, reply by SMS, internal note, status, WhatsApp | 4.5 | 1.5 | Clear. Reply → "Internal note added" feedback. | No change needed |
| Reports | owner, manager, finance | Period presets, KPIs, brand, category, region, top products, CSV and PDF | 4.5 | 1.5 | Clear, numbers right-aligned. | No change needed |
| Settings and users | owner (manager: Pay Later switch only) | Pay Later switch, staff and roles, notifications, security, integrations, audit log | 3.5 | 3 | The audit log is at the bottom of a long page. The "2FA On" column shows enrolment while the server does not require 2FA. | Open (recommend its own Audit page) |
| My account | all | Password, own notifications | 4.5 | 1 | Clear rules checklist. "Not required on this server" shown for 2FA. | No change needed |
| Sidebar | all | Navigation with badges | 4.5 (3.5) | 1 | Said "Azania Bank link · Connected · mock" while Pay Later was off. | Fixed: "Pay Later by Azania · Off on both stores · test link" (or "On: Mr UK" and so on) |

## Daily jobs: clicks and screens

The numbers come from `tools/admin-ux-jobs.mjs`. Each count is clicks + typed fields, then the number of screens. At 390 px, opening a sidebar tab costs one extra tap on "Menu".

| Job (role) | 1440 px before | 1440 px after | 390 px after | Notes |
|---|---|---|---|---|
| Receive a pay-on-delivery order and take it to delivered (warehouse) | 6 clicks, 3 screens | 6 clicks, 3 screens | 7 taps, 3 screens | Before, on a phone, the detail opened about 5,200 px down and the status and amount columns were hidden. Now the detail is on top. Cash is recorded on "Mark delivered", which now says so. DB check: payment `captured/POD-CASH`, invoice `paid`. |
| Find that order's invoice and download the PDF (finance) | 3 clicks + 1 field, 2 screens | same | 4 + 1 | PDF HTTP 200 |
| See low stock and receive 5 units (warehouse) | 3 clicks + 1 field | same | 4 + 1 | Feedback "+5 · now 5" |
| Remove 1 damaged unit (warehouse) | **not possible** (error "Number must be greater than or equal to 1") | 1 click + 1 field | same | "−1 · now 8", audit-logged |
| Price and publish one Mr UK draft (manager) | 5 clicks + 1 field, 3 screens | same | 6 + 1 | About 2 interactions per draft after the first. 50 drafts ≈ 100 interactions. |
| Add a product with a photo (catalogue editor) | 5 clicks + 4 fields | same | 6 + 4 | Inline validation, live preview, duplicate-model warning |
| Edit the announcement bar and see it live (manager) | 2 clicks + 1 field | same | 3 + 1 | Live on the store immediately |
| Create a 10% promo code (catalogue editor) | the button was hard to find (bottom of the page; the test script typed into an edit form instead) | 3 clicks + 2 fields | 4 + 2 | "Code UXAUDIT10 saved" |
| Answer a ticket with an internal note (support) | 3 clicks + 1 field | same | 4 + 1 | One more click to resolve |
| Last month report, CSV export, audit log (owner) | 4 clicks, 3 screens | same | 6 | The audit log needs a scroll to the bottom of Settings |

## Fixes made (all inside admin code)

1. **Phone tables became cards.** Orders, customers, dashboard recent orders, inventory and products, using `.ad-table.cards` plus `ca/cb/cc/cd/ce` cell slots in `apps/web/src/styles/admin.css`. Region, payment, SKU and value are kept on desktop and in the detail view.
2. **The whole row opens the record** (stretched link) in orders, customers and dashboard recent orders.
3. **Picking an order on a phone shows its detail first**, with "← Back to the order list" (`orders/page.tsx`).
4. **Pay on delivery reads clearly.** The button says "Mark delivered · cash TZS X collected" and explains that it records the payment and marks the invoice paid.
5. **Inventory "Add / remove units".** A minus number removes units, never below zero, with the message "Only N available to remove". It is audit-logged as `product.stock_remove` (`restockAction` in `app/actions/admin.ts`). The input and button now sit on one line (`AForm inline`).
6. **Friendlier number errors** for every admin number field ("Enter 1,000 or more").
7. **Product price editing.** Prices show thousands separators and right-align, a "Saved" confirmation appears, and staff must confirm before a live product is hidden (`InlineNumber grouped`).
8. **Sidebar Pay Later status** comes from the real switch. The **CMS note** explains that Pay Later copy is left out while it is off.
9. **Storefront brand styles no longer leak into the admin** (`.ad [data-brand]` reset). This fixes the white-box Skywood pill.
10. **Broken product images** fall back to the model label (`ThumbImg`). Hot-pick cards are aligned. Flash and combo chips have proper spacing.
11. **"+ New discount code"** is now a primary button at the top of its card, with a short help line.
12. **Touch targets of at least 44 px on phones** for the branch selector, search, inline inputs, status pills, task titles and row links.

Test changes:

- `e2e/admin-qa.spec.ts` (restock) now expects a minus number to remove units, and checks that removing more than is available is refused. This follows the deliberate behaviour change above.
- `e2e/admin-workflows.spec.ts` (add product) now deletes the "QA Air Fryer 5L" product left by an earlier run before it starts. Without this, the spec failed on every run after the first, and the leftover product showed on the Skywood store.

## Open issues, ranked by impact

1. **No bulk editing** of price, stock or publish. Getting the 50 Mr UK drafts live is about 100 interactions. *Recommend a CSV import, or a "price several" mode, on Products › Drafts.*
2. **No stock movement history or supplier receiving.** Restocks are only visible in the audit log. There is no delivery note, supplier or reason field. *Recommend a stock ledger with a reason (delivery, damaged, count) and a supplier.*
3. **The audit log is buried** at the bottom of Settings. *Recommend its own "Audit log" page under System.*
4. **No column sorting** in tables. Lists use fixed orders (newest first, lowest stock first).
5. **Demo data clutter**: "E2E offer …" campaigns, "Stock Tester" and "Roles Test" orders, test tickets. *Clean before UAT so staff see realistic screens.*
6. **The Brands and categories tab shows design tokens** (corner radius, heading weight, tracking) that staff do not need.
7. **The Orders queue and tabs use different words for the same state.** The queue says "New · to pack" and the tab says "Processing". *Pick one wording.*
8. **An intermittent React hydration warning (#418) appears in the browser console.** It showed on one random admin page per full walk (orders, tickets or products) and the page still renders correctly. The likely cause is a client component that renders a relative time. Low impact. Not reproduced on demand.
9. **The Settings staff table shows "2FA On"** even when the server is set not to require 2FA. Wording only.
10. The warehouse dashboard has no persistent "new order" banner. The banner appears only for orders that arrive while the page is open (polled every 45 s). The sidebar badge and "My tasks" still show the work.

## Decisions needed from the client

- **Bulk pricing for drafts:** CSV import or an on-screen multi-edit? (Issue 1)
- **Stock ledger:** should staff record a supplier, a delivery note number and a reason for each stock change? (Issue 2)
- **Audit log as its own tab**, visible to Super admin only, or also to Finance? (Issue 3)
- **Order status wording:** "Processing" or "New · to pack"? (Issue 7)
- **Brands and categories:** hide the design tokens from staff, or keep them for the owner only? (Issue 6)
- **Demo data:** clean it now or at UAT? (Issue 5)

## Gates (this branch after merging main, server on port 3400)

- `pnpm lint`: pass.
- `pnpm typecheck`: pass.
- `pnpm test`: pass (core 120/120, integrations 7/7).
- Admin e2e: **25/25 passed**. Specs: `admin-brands`, `admin-cms`, `admin-marketing`, `admin-password`, `admin-qa`, `admin-roles`, `admin-workflows`, `skywood-drafts`, `stock-and-promo`.
- Note on demo data: repeated e2e runs on the shared database bought up the demo stock of `mruk-pump-control`. It was topped back up to 10 so `admin-roles` can still add it to the cart. Pay Later is still OFF on both stores, and the 50 Mr UK drafts are still hidden with price 0.
