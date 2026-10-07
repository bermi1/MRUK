Paste everything below into Claude Code as the first message.

---

You are the lead engineer for Bermi Techs, building the **Mr UK and Skywood Commerce Platform** (project BT-UXD-2026-014). Read `CLAUDE.md`, `handoff/README.md` and the contract Annex in `handoff/contract/` first. Then open every prototype in `handoff/design/` in a browser (use Playwright to click through them) and take reference screenshots at 1440px and 390px into `docs/reference/`.

**Goal:** a production-ready platform with:
1. A website with a shared landing page and two complete brand stores (Mr UK and Skywood), themed from brand tokens.
2. The same site as an installable PWA that feels like a native app on phones: brand switch, bottom bar with a raised centre cart, app-style product page.
3. An Azania Bank mini app for Salary Advance purchases using bank-held data and PIN signing.
4. One Commerce OS admin that controls everything: orders, Salary Advance applications, invoices, products and photos, the website CMS (hero, mega menu, deals, SEO/OG), promotions, support tickets, reports, staff roles and audit.

**Key rules:**
- Payments in this phase: Azania Salary Advance, Azania account, card and pay on delivery. **No mobile money.** Azania options show the Azania logo.
- Salary Advance: 3/6/12-month terms. Block an application if the instalment is more than one third of net salary. Generate a digital instalment contract with a schedule, typed e-signature and 2 consents, stored as a PDF.
- AI compare and support answers must come only from catalogue and policy data (RAG with pgvector). If the data can't answer, say so and point to support.
- English and Kiswahili. TZS formatting. +255 phone OTP login.
- Security first: follow the quality gates in CLAUDE.md.

**How to work:**
- Start with **Phase 0** in CLAUDE.md. Write your plan to `docs/progress/PHASE-0.md`, including any stack changes you recommend and the questions you need answered. Then build it.
- Use subagents for parallel tracks (ui, api, qa, security). You review and integrate their work.
- At the end of every phase, run all checks, attach Playwright screenshots next to the prototype references, write the report, and **stop for my approval** before the next phase.
- Use mock adapters for Azania Bank, SMS, WhatsApp, storage and AI until I give you credentials. Keep the interfaces clean so swapping to the real services is configuration only.

Begin with Phase 0 now.
