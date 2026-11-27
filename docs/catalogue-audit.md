# Catalogue audit: client sources compared with the catalogue (27 Nov 2026)

Scope: every product shown in the three client Drive folders, compared with `handoff/design/brand-data.js` and the local
database. Full photo-by-photo mapping: `docs/skywood-photo-mapping.md` and `docs/mruk-photo-mapping.md`.

| Source | Contents |
|---|---|
| Skywood Drive (`1O0dAQzaCxhjoaJB9Cw41BVS5IwDGghyN`) | 7 spec documents (`descriptions/`), 276 photos in 14 folders and 2 zips (`pngs skywood/`) |
| Mr UK Drive (`1Wwmqfo996GtnYuUYMT7F-tvPRsurY_2a`) | 103 photos in 10 folders, no spec documents |
| Third folder (`1LQGJutJvSAS-9Z3EwloKUzhD0Psa9s7y`) | 18 adverts and videos (TVCs, category films). No product photos or specs, so no products come from it |

## Result
| | Mr UK | Skywood |
|---|---|---|
| Products in the catalogue | 82 (32 live, 50 drafts) | 99 (29 live, 70 drafts) |
| Added today | 0 products, 1 extra photo | 10 range hood drafts (6 with photos), 2 Boombox 2 photos |
| Source products still missing | 0 | 1 (UK-R10, probably the live `R10`, see question 3) |

Drafts are hidden, with price 0 and stock 0. They appear in Admin › Products › **Drafts — needs price** and go live once
staff set a price and press Publish. Every deploy (`seed.ts --tokens`) creates the drafts and photos that are missing. It
never changes prices, stock or staff photos (no seed change was needed, see the last section).

## Skywood: source → status
| Source (folder or document) | Products | Status |
|---|---|---|
| `SKYWOOD REFRIGERATOR HD PICTURES (3)` + `SKYWOOD REFRIGERATORS & C.FREEZER.pdf` | SKY-32-0BI, SKY-50-5BI, SKY-24-6BI, SKY-17-3BG, SKY-13-8 (I/S/W), SKY-25-0CF | present, with photos |
| same | SKY-10-8, SKY-12-5, SKY-14-2, SKY-177-BIWD, SKY-24-6WD, SKY-43-9WD, SKY-10-0CF, SKY-15-0CF, SKY-20-0CF | present (draft), with photos. SKY-14-2 has no spec sheet |
| `Built oven/` + `OVEN & FREESTANDING COOKER DESCRIPTION.xlsx` | EM19A01 | present, with photos. **Spec mismatch**: the catalogue said 11 functions, the sheet says 9 (features follow the sheet) |
| same | ED25A01, EM04A05, EM10A02, EM10A04 | present (draft), 5 photos each |
| `standing cookers/` + oven sheet | SK6031GES | present, with photo |
| same | SK5031GEB, SK5031GES, SK6031GEB | present (draft), with photo. The sheet has no model numbers, so there are no specs |
| `microwave .zip` + `MICROWAVES DESCRIPTION.docx` | SKM30-E9A (sheet E30PGP45-E9A) | present, with photos |
| same | SKM20-E70, SKM23-E80, BIMWO-SKQ25N-E8I, BIMWO-SKI25N | present (draft), with photos |
| `25ID-08011 Gas hob HD Pictures.zip` + `GAS HOBS UK & SKY.pdf` | SK-G05 | present, with photos |
| same | SK-G01, SK-G02, SK-G03, SK-G04 | present (draft), with photos. **Spec mismatch**: SK-G04 is 600 mm on the sheet but the photo shows a wide five-burner hob |
| `rangehood/` | R-02, R-02S | present (draft), with photo. There is no spec sheet for them |
| `rangehood/` + `GAS HOBS UK & SKY.pdf` | **UK-R01, UK-R03, UK-R04, UK-R05, UK-R08 600mm, UK-R08 800mm** | **added today** (draft), 2–3 photos each, specs from the sheet |
| `GAS HOBS UK & SKY.pdf` (sheet only, no photo) | **UK-R02, UK-R07 600mm, UK-R07 800mm, UK-R09** | **added today** (draft), **no photo** |
| same | UK-R10 | not added: probably the live `R10` (question 3). **Spec mismatch**: the live R10 lists "Flat top, Touch panel", which is not on the UK-R10 sheet |
| `blenders/` + `LANCO BLENDER DESCRIPTION.xlsx` | Multi-purpose blender P5A | present, with photos |
| same | NK-B148, NK-B141, NK-J268, NK-J220B | present (draft), with photo |
| `kettles/` + `kettle description.pdf` | SK-20S03 | present, with photo. **Spec mismatch**: the catalogue says 2.2 L but the sheet has no model numbers (1.0/1.8/2.0 L) |
| same | SK-8823, SK-8870 | present (draft), with photo |
| `water dispenser/` + `water dispenser description.pdf` | LC38 Black | present, with photo |
| same | LC38 White, LC38 Silver, LC38T, LC31T, LC32F, LC37F, LCD31F, Tea Bar | present (draft), with photo |
| sheet only | LCE089L | present (draft), **no photo** in the pack |
| `subwoofer labeled/` | SK2025-B09 (live "B 09") | present, with photo |
| same | SK2023-B01, B02, S04, S05, SK2025-B03, B05, B07 | present (draft), with photo. No spec sheet |
| `Boombox 2& 3/` (10 unlabelled photos, 3 designs) | Boombox 2 | present (draft). **2 photos attached today** (red and navy design, best guess, question 1) |
| same | Boombox 3 (live, TZS 290,000) | present but **missing photos**. Candidate photos are ready but **not attached** (question 1). **Spec mismatch risk**: its features (120 W, IPX6) are in no source document |
| `towerfans/` | TF4201TR-L, CTF4203 Black, AF4204, AC2401 | present, with photos (CTF4203 uses the Titanium photos, question 5) |
| same | CTF4202TR-L, TF1302, TF2902TR-L, TF4001TR-L | present (draft), with photos |
| same | CTF4203TR-L White | not added: a colour of the live `CTF4203 Black` (question 5) |
| `AC/` | CSDC-12K, CSDC-18K, CSC-09K, CSC-12K | present, with photos (staff have replaced the CSC-12K photos in the admin) |
| same | CSC-18K, CSC-24K, CSDC-09K, CSDC-24K | present (draft), with photos. No spec sheet |
| `washing machine/` | XQB100-1729AZ | present, with photo. **Spec mismatch**: named 12 kg but the panel reads 10.0 kg; the photo also shows the WEILI logo |
| same | XQB120-1729A, XQB60-1729A, XQG100-1458DPH | present (draft), **no photo** on purpose (WEILI logo, question 6) |
| not in any source | Q9, Q10, SB-12, S 06 (live) | live products with no source photo or spec |

## Mr UK: source → status
All 103 files were checked again. Every product is in the catalogue (see `docs/mruk-photo-mapping.md`).

| Source folder | Status |
|---|---|
| FRIDGE (14) | 4 live with photos (UK-F275, F215 WD, F143, F120) + 9 drafts with photos |
| FREEZER (8) | UK 50 live with photo (matched by "50", question 7) + 6 drafts with photos |
| GENERATORS (6) | 4 live with photos + UK-6500Q draft |
| SUBWOOFER (22) | UK-T09 live with photos + 12 drafts with photos |
| TV (8) | 5 drafts with photos (3 still need a model number) |
| GAS HOB & STAND COOKER (7) | UK 6134 GE live + L500, 9285, GE1, SE1 drafts, with photos |
| BLENDER (4) | 2 drafts with photos |
| AC & FAN (9) | 9,000 BTU AC draft, 4 photos (the rest are duplicates) |
| WASHING MACHINE (8) | 6 drafts with photos |
| VIFAA SHAMBA (27) | 3 live pumps with photos + 4 drafts. **Today**: the yellow submersible pump draft gets a 4th photo (rear view, `20220905_122118.jpg`) |

There are no Mr UK spec documents, so the Mr UK drafts have no specs. These live products have no source photo: UK59,
UK F47-094I, UK-145, UK 32/43/43 SMART TVs, UK X-15, 2024R, 2024 M, G 7302, UK-5055G3E1, Engine 170F, Heavy Duty Water
Pump-13HP, Sprayer Pump WX 6C, UK 70WM, UK 90WM.

## Needs a price from the client (drafts, hidden until priced)
- **Skywood (70)**: the 60 drafts listed in `docs/skywood-photo-mapping.md`, plus the 10 range hoods added today:
  UK-R01, UK-R02, UK-R03, UK-R04, UK-R05, UK-R07 600mm, UK-R07 800mm, UK-R08 600mm, UK-R08 800mm, UK-R09.
- **Mr UK (50)**: listed in `docs/mruk-photo-mapping.md`.

## Questions for the client (defaults in place)
1. **Boombox 2 and 3.** The folder holds 3 unlabelled designs and no spec sheet:
   - A: rugged, with an RGB light bar and "BOOMBOX" embossed (grey, black/orange, camouflage; WA0001, 0002, 0005);
   - B: red or navy with grey ends (WA0003, 0004);
   - C: half-dome with a metal handle, 5 colours (WA0006–0010).

   *Default*: B is attached to the hidden **Boombox 2** draft. A is converted (`skywood-boombox-3-1..3.webp`) but **not
   attached** to the live Boombox 3, so no unconfirmed photo is published. C is not used. To attach A once it is confirmed,
   add `'skywood-boombox-3': 3` to `SW_PHOTOS`. Please say which design is which model, and what C is.
2. **UK-R range hoods.** They are added to **Skywood**: the spec sheet and photos are in the Skywood pack, the photos carry
   the Skywood logo, and Skywood already sells "R10". Please confirm they are Skywood and not Mr UK.
3. **UK-R10.** Is the live Skywood `R10` (TZS 450,000) the UK-R10 on the sheet (600 × 460 mm, black glass panel, 2
   motors, 2 baffle filters)? If so, its features ("Flat top, Touch panel") should follow the sheet. There is no UK-R10
   photo in the pack.
4. **UK-R02 compared with R-02.** The UK-R02 sheet describes an 800 mm T-shape hood, but the R-02 photo is an angled
   chimney hood. They are kept as separate drafts. Please confirm.
5. **CTF4203.** The catalogue says Black, but the pack has Titanium and White photos only.
6. **Washing machine photos** show the WEILI logo. Please send Skywood-branded photos.
7. Earlier questions that are still open are in the two mapping documents: model numbers for 5 Mr UK drafts, kettle
   capacities, standing cooker configurations, SK-G04 size and XQB100 capacity.

## How it reaches the live database
No change to `seed.ts`. Each deploy runs `seed.ts --tokens`:
- `syncBrandDrafts` creates each missing draft, hidden with price 0 and stock 0. It never edits an existing product, skips
  a model the brand already has, and never recreates a draft that staff deleted.
- `syncBrandPhotos` sets photos only where the current ones are empty, from the dead old site, or a seeded placeholder.
  Staff uploads are kept.

Local run (27 Nov):
- Skywood: 10 drafts created; Boombox 2 photos set; CSC-12K staff photos kept.
- Mr UK: the yellow pump photo was added.
