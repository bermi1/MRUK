# Skywood photo mapping

Source: the client's Skywood photo pack and spec documents (Drive, received 2026-11). Photos are converted to WebP
(max 1400 px, quality about 80, metadata stripped, transparency kept; plain studio backgrounds cut out except on white
or silver products) and stored in `apps/web/public/img/products/skywood/<product-id>-<n>.webp`. In total there are
155 files and 8.7 MB, and every file is at most 150 KB. File 1 is always the front or main shot.

How it reaches each environment:
- **New databases**: `pnpm db:seed` reads `images` from `handoff/design/brand-data.js` (`SW_PHOTOS`), and creates the
  draft products (hidden, price 0, stock 0).
- **Live databases**: every deploy runs `seed.ts --tokens`:
  - `syncSkywoodDrafts` adds the missing sub-categories (only adds) and creates each draft product that is missing,
    hidden with price 0 and stock 0. It never changes an existing product, skips a draft when Skywood already has a
    product with the same model (for example one staff added by hand), and does not create a draft again after staff
    deleted it (the first creation is in the audit log, `system:deploy`, `catalogue.draft.create`).
  - `syncSkywoodPhotos` replaces product images, category tiles and the brand hero image **only** when they are empty,
    point at the dead `www.skywood.co.tz`, or hold the old seeded cooker placeholder. Admin uploads (`/api/files/...`)
    and any other staff URLs are never touched (`catalogue.photos.sync`).
  - Both are idempotent: a second run changes nothing.
- **Manual option**: `docs/sql/skywood-products-update.sql` (photos and features of the original 29 products) and
  `docs/sql/skywood-drafts.sql` (the drafts, `INSERT ... ON CONFLICT DO NOTHING` with the same guards, one transaction)
  can be run in the Supabase SQL editor. Run them after the deploy, because the image files ship with the site.

## Publishing a draft (staff)
Admin › Products and photos › **Drafts — needs price** (the sidebar badge shows how many drafts need a price; owner,
manager and catalogue roles). Type the price and stock, press Enter, then press **Publish**. A product cannot be made
visible while its price is 0: the drafts list, the Hidden/Live toggle, the product editor and the server all refuse with
"Set a price before publishing". Every publish is audit-logged (`product.publish`). Drafts never appear on the store,
in search, compare, the AI answers, the sitemap, `llms.txt` or structured data, and they do not raise stock tasks.

## Summary
- The whole pack (276 photos plus the spec documents) was inventoried again, including both zips and the zips nested
  in the microwave zip (those only hold control-panel artwork PDFs and two instruction manuals, no extra photos).
- **Draft products added: 60** (Refrigeration 9, Kitchen 32, Music 8, Tower fans 4, Air conditioning 4, Laundry 3).
  All are hidden with price 0 and stock 0 until staff publish them. 55 have photos (106 new files, 6.1 MB).
  Feature bullets, description and specs come only from the spec documents; models with photos but no spec sheet
  (SKY-14-2, standing cookers, range hoods, kettles, Tea Bar, music, fans, AC, washing machines) have none.
- **New sub-categories (2):** Refrigerators › *Side by side* (SKY-43-9WD) and Washing Machine › *Front load*
  (XQG100-1458DPH).
- Colour variants are one product with the variant photos, as for SKY-13-8: SKY-10-8 (I, S), SKY-12-5 (I, S, W),
  SKY-14-2 (I, S), CTF4202TR-L (white, titanium).
- **The 6 catalogue products without a photo were re-checked (nested zips included): still no clear match**, so they
  are unchanged: `skywood-q9`, `skywood-q10`, `skywood-sb-12`, `skywood-s-06` (the pack has S04/S05 speaker systems,
  not S 06), `skywood-boombox-3` (see question 1) and `skywood-r10` (the pack has R-02, R-02S and UK-R models only).
- **Drafts without a photo (5):** `skywood-lce089l` (spec sheet only), `skywood-boombox-2` (see question 1), and the
  three washing machines `skywood-xqb120-1729a`, `skywood-xqb60-1729a`, `skywood-xqg100-1458dph` (their photos carry
  another brand's logo, WEILI, on the control panel; see question 10).
- Earlier import (unchanged): 49 photos for 23 of the 29 original products; features of 10 products from the sheets.

## Draft products (hidden, price 0, stock 0)
| Product id | Model | Name | Category › sub | Photos | Spec sheet |
|---|---|---|---|---|---|
| `skywood-sky-10-8` | SKY-10-8 | Combi Refrigerator 108L | Refrigeration › Combi | 3 | yes |
| `skywood-sky-12-5` | SKY-12-5 | Top Mount Refrigerator 125L | Refrigeration › Top mount | 4 | yes |
| `skywood-sky-14-2` | SKY-14-2 | Combi Refrigerator | Refrigeration › Combi | 3 | — |
| `skywood-sky-177-biwd` | SKY-177-BIWD | Single Door Refrigerator with Water Dispenser | Refrigeration › Single door | 2 | yes |
| `skywood-sky-24-6wd` | SKY-24-6WD | Combi Refrigerator with Water Dispenser | Refrigeration › Combi | 2 | yes |
| `skywood-sky-43-9wd` | SKY-43-9WD | Side by Side Refrigerator | Refrigeration › Side by side | 2 | yes |
| `skywood-sky-10-0cf` | SKY-10-0CF | Chest Freezer 98L | Refrigeration › Chest freezers | 2 | yes |
| `skywood-sky-15-0cf` | SKY-15-0CF | Chest Freezer 142L | Refrigeration › Chest freezers | 2 | yes |
| `skywood-sky-20-0cf` | SKY-20-0CF | Chest Freezer 198L | Refrigeration › Chest freezers | 2 | yes |
| `skywood-ed25a01` | ED25A01 | 70L Built-in Oven, 10 Functions | Kitchen › Built-in ovens | 5 | yes |
| `skywood-em04a05` | EM04A05 | 70L Built-in Oven with Basket, 10 Functions | Kitchen › Built-in ovens | 5 | yes |
| `skywood-em10a02` | EM10A02 | 70L Built-in Oven, Mechanical Control | Kitchen › Built-in ovens | 5 | yes |
| `skywood-em10a04` | EM10A04 | 70L Built-in Oven, Digital Timer | Kitchen › Built-in ovens | 5 | yes |
| `skywood-sk5031geb` | SK5031GEB | Standing Cooker with Oven | Kitchen › Standing cookers | 1 | — |
| `skywood-sk5031ges` | SK5031GES | Standing Cooker with Oven | Kitchen › Standing cookers | 1 | — |
| `skywood-sk6031geb` | SK6031GEB | Standing Cooker with Oven | Kitchen › Standing cookers | 1 | — |
| `skywood-skm20-e70` | SKM20-E70 | 20L Microwave | Kitchen › Microwaves | 2 | yes |
| `skywood-skm23-e80` | SKM23-E80 | 23L Grill Microwave | Kitchen › Microwaves | 3 | yes |
| `skywood-bimwo-skq25n-e8i` | BIMWO-SKQ25N-E8I | 25L Built-in Grill Microwave | Kitchen › Microwaves | 3 | yes |
| `skywood-bimwo-ski25n` | BIMWO-SKI25N | 25L Built-in Grill Microwave, Stainless Cavity | Kitchen › Microwaves | 2 | yes |
| `skywood-sk-g01` | SK-G01 | Built-in Gas Hob with Hot Plate | Kitchen › Built-in hobs | 2 | yes |
| `skywood-sk-g02` | SK-G02 | Built-in Gas Hob with Ceramic Burner | Kitchen › Built-in hobs | 2 | yes |
| `skywood-sk-g03` | SK-G03 | Built-in Gas Hob | Kitchen › Built-in hobs | 2 | yes |
| `skywood-sk-g04` | SK-G04 | Built-in Gas Hob | Kitchen › Built-in hobs | 2 | yes |
| `skywood-r-02` | R-02 | Range Hood | Kitchen › Range hoods | 1 | — |
| `skywood-r-02s` | R-02S | Range Hood | Kitchen › Range hoods | 1 | — |
| `skywood-nk-b148` | NK-B148 | 2-in-1 Table Blender | Kitchen › Blenders | 1 | yes |
| `skywood-nk-b141` | NK-B141 | 3-in-1 Table Blender | Kitchen › Blenders | 1 | yes |
| `skywood-nk-j268` | NK-J268 | 4-in-1 Juice Extractor | Kitchen › Blenders | 1 | yes |
| `skywood-nk-j220b` | NK-J220B | 5-in-1 Juice Extractor | Kitchen › Blenders | 1 | yes |
| `skywood-sk-8823` | SK-8823 | Electric Kettle | Kitchen › Electric kettles | 1 | — |
| `skywood-sk-8870` | SK-8870 | Electric Kettle | Kitchen › Electric kettles | 1 | — |
| `skywood-lc38-white` | LC38 WHITE | LC38 Water Dispenser, White | Kitchen › Water dispensers | 1 | yes |
| `skywood-lc38-silver` | LC38 SILVER | LC38 Water Dispenser, Silver | Kitchen › Water dispensers | 1 | yes |
| `skywood-lc38t` | LC38T | LC38T Water Dispenser with Storage Cabinet | Kitchen › Water dispensers | 1 | yes |
| `skywood-lc31t` | LC31T | LC31T Water Dispenser with Refrigerator | Kitchen › Water dispensers | 1 | yes |
| `skywood-lc32f` | LC32F | LC32F Bottom Loading Water Dispenser | Kitchen › Water dispensers | 1 | yes |
| `skywood-lc37f` | LC37F | LC37F Bottom Loading Water Dispenser | Kitchen › Water dispensers | 1 | yes |
| `skywood-lcd31f` | LCD31F | LCD31F Full Touch Water Dispenser | Kitchen › Water dispensers | 1 | yes |
| `skywood-lce089l` | LCE089L | LCE089L Instant Heating Water Dispenser | Kitchen › Water dispensers | 0 | yes |
| `skywood-tea-bar` | TEA BAR | Tea Bar | Kitchen › Water dispensers | 1 | — |
| `skywood-sk2023-b01` | SK2023-B01 | Soundbar with Subwoofer | Music › Soundbars | 1 | — |
| `skywood-sk2023-b02` | SK2023-B02 | Soundbar with Subwoofer | Music › Soundbars | 1 | — |
| `skywood-sk2025-b03` | SK2025-B03 | Soundbar with Subwoofer | Music › Soundbars | 1 | — |
| `skywood-sk2025-b05` | SK2025-B05 | Soundbar with Subwoofer | Music › Soundbars | 1 | — |
| `skywood-sk2025-b07` | SK2025-B07 | Soundbar with Subwoofer | Music › Soundbars | 1 | — |
| `skywood-sk2023-s04` | SK2023-S04 | Tower Speaker System with Subwoofer | Music › Subwoofers | 1 | — |
| `skywood-sk2023-s05` | SK2023-S05 | Tower Speaker System with Subwoofer | Music › Subwoofers | 1 | — |
| `skywood-boombox-2` | BOOMBOX 2 | Boombox 2 | Music › Boombox | 0 | — |
| `skywood-ctf4202tr-l` | CTF4202TR-L | Cooling Tower Fan | Tower Fans › Cooling tower fans | 5 | — |
| `skywood-tf1302` | TF1302 | Tower Fan | Tower Fans › Tower fans | 2 | — |
| `skywood-tf2902tr-l` | TF2902TR-L | Tower Fan | Tower Fans › Tower fans | 2 | — |
| `skywood-tf4001tr-l` | TF4001TR-L | Tower Fan | Tower Fans › Tower fans | 3 | — |
| `skywood-csc-18k` | CSC-18K | 18,000 BTU Air Conditioner | Air Conditioning › On/off | 2 | — |
| `skywood-csc-24k` | CSC-24K | 24,000 BTU Air Conditioner | Air Conditioning › On/off | 2 | — |
| `skywood-csdc-09k` | CSDC-09K | 9,000 BTU Inverter AC | Air Conditioning › Inverter | 2 | — |
| `skywood-csdc-24k` | CSDC-24K | 24,000 BTU Inverter AC | Air Conditioning › Inverter | 2 | — |
| `skywood-xqb120-1729a` | XQB120-1729A | Top Load Washing Machine | Laundry › Top load | 0 | — |
| `skywood-xqb60-1729a` | XQB60-1729A | Top Load Washing Machine | Laundry › Top load | 0 | — |
| `skywood-xqg100-1458dph` | XQG100-1458DPH | Front Load Washing Machine | Laundry › Front load | 0 | — |

Not added on purpose:
- **Range hoods UK-R01, UK-R02, UK-R03, UK-R04, UK-R05, UK-R07, UK-R08 (600/800 mm), UK-R09, UK-R10**: the "UK-" prefix
  and the spec sheet title ("GAS HOBS UK & SKY") suggest Mr UK models, so they were not added to Skywood (question 11).
- **CTF4203TR-L White** photos: the catalogue has this model as `CTF4203 Black` (question 3); not added as a new product.
- **SKY-13-8S / SKY-13-8W**: already shown as extra photos of `skywood-sky-13-8`.

## Questions for the client (marked defaults are in place)
1. **Boombox 2 and Boombox 3**: the folder "Boombox 2& 3" holds three unlabelled designs (rugged with an RGB light bar,
   a red/navy model with grey ends, and a round-handle model). Which is Boombox 2 and which is Boombox 3?
   *Default: no photo on either.*
2. **B 09 Soundbar** is matched to `SK2025-B09` (a soundbar with a wireless sub). Please confirm.
3. **CTF4203 Black** uses the `CTF4203TR-L Titanium` photos (the pack has no "Black" CTF4203). Please confirm the colour name.
4. **XQB100-1729AZ** is named "12kg" in the catalogue, but its control panel in the photo reads 10.0 kg, and the pack
   also has an XQB120 model. *Name not changed.*
5. **SKY-EM19A01**: the catalogue said "11 functions"; the spec sheet says 9 functions (features now follow the sheet).
   The name says "Air Fry"; the sheet only says "with basket". *Name kept.*
6. **SK-20S03 kettle**: the catalogue says 2.2 L; the kettle spec sheet has no model numbers (1.0/1.8/2.0 L). The same
   applies to the new SK-8823 and SK-8870 drafts. *No capacity given.* Only the Skywood-branded kettle photos are used.
7. **SKY-17-3BG**: the "close" render in the pack is a flat black placeholder, so only the open-door photo is used.
8. The built-in oven photos (EM19A01 and the four new ovens) are real-world shots on a grey backdrop with stickers on
   the door, not studio renders. Studio shots would look better on the store.
9. **Prices and stock** are needed for the 60 drafts before they can be published.
10. **Washing machine photos** (XQB100, XQB120, XQB60, XQG100) show the WEILI logo on the control panel. The new drafts
    have no photo for that reason. The published `XQB100-1729AZ` photo (earlier import) has the same logo: please send
    Skywood-branded photos, or confirm it may stay.
11. **UK-R range hoods**: their photos carry a small Skywood logo, but the model names start with "UK-". Are they
    Skywood or Mr UK models? *Default: not added.*
12. **R-02S** looks like R-02 with its glass panel open. Is it a separate model? *Default: two drafts, one photo each.*
13. **SK-G04**: the spec sheet gives 600 × 520 mm, but the photo shows a wide five-burner hob (like the 900 mm SK-G05).
    *Default: specs follow the sheet; "60cm" left out of the feature bullets.* Please confirm the size.
14. **Standing cookers SK5031GEB, SK5031GES, SK6031GEB**: the cooker spec sheet lists 50 and 60 cm configurations
    (3 gas + 1 electric in black, 2 gas + 2 electric in "paton C") without model numbers. Which configuration is which
    model? *Default: no features or specs.*
15. **Assumed matches** (photo label → spec model): "lc38 standing" → LC38T, "full touch" → LCD31F, "lc31" → LC31T,
    "lc32" → LC32F, "lc37 white standing" → LC37F, "2 in 1 / 3 in 1 blender" → NK-B148 / NK-B141, "4 in 1 / 5 in 1
    juicer" → NK-J268 / NK-J220B (by the attachments in the photo), BIMWO-SKQ25N-E8I → Q25NGS96-E8I, BIMWO-SKI25N →
    I25NXP0001, SKM20-E70 → B20MXP13-E70, SKM23-E80 → C23PGP02-E80, SKY-15-0CF → SKY-150-0CF. Please confirm.
16. **AC drafts**: inverter (CSDC) or on/off (CSC) follows the existing catalogue; there is no AC spec sheet, so the
    drafts have no features.

## Inventory
Source images inventoried: **276** (photos) · used: **155** (49 for 23 catalogue products, 106 for 55 drafts) · not used: **121**

## Product → photos (catalogue products, earlier import)

| Product id | # | Files (in order; 1 = main) |
|---|---|---|
| `skywood-sky-32-0bi` | 2 | skywood-sky-32-0bi-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/16-SKY-32-0BI FS4-361 black inox/改-close.jpg<br>skywood-sky-32-0bi-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/16-SKY-32-0BI FS4-361 black inox/改-open.jpg |
| `skywood-sky-50-5bi` | 2 | skywood-sky-50-5bi-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/17-SKY-50-5BI FF4-65 black inox/改-close.jpg<br>skywood-sky-50-5bi-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/17-SKY-50-5BI FF4-65 black inox/open.jpg |
| `skywood-sky-24-6bi` | 2 | skywood-sky-24-6bi-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/14-SKY-24-6BI FN2-31D Black inox/close 已改.jpg<br>skywood-sky-24-6bi-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/14-SKY-24-6BI FN2-31D Black inox/open 已改.jpg |
| `skywood-sky-17-3bg` | 1 | skywood-sky-17-3bg-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/11-SKY-17-3BG DF1-20N black glass/open.png |
| `skywood-sky-13-8` | 4 | skywood-sky-13-8-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/4-SKY-13-8I DF2-18 inox/-close.png<br>skywood-sky-13-8-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/4-SKY-13-8I DF2-18 inox/open.jpg<br>skywood-sky-13-8-3.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/5-SKY-13-8S DF2-18 silver/-close.png<br>skywood-sky-13-8-4.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/6-SKY-13-8W DF2-18 white/-close.png |
| `skywood-sky-25-0cf` | 2 | skywood-sky-25-0cf-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/21-SKY-25-0CF BD1-251 Dark grey/改-close.png<br>skywood-sky-25-0cf-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/21-SKY-25-0CF BD1-251 Dark grey/改-open.png |
| `skywood-sk6031ges` | 1 | skywood-sk6031ges-1.webp ← standing cookers/SK6031GES.png |
| `skywood-sky-em19a01` | 5 | skywood-sky-em19a01-1.webp ← Built oven/EM19A01/1.jpg<br>skywood-sky-em19a01-2.webp ← Built oven/EM19A01/2.jpg<br>skywood-sky-em19a01-3.webp ← Built oven/EM19A01/3.jpg<br>skywood-sky-em19a01-4.webp ← Built oven/EM19A01/7.jpg<br>skywood-sky-em19a01-5.webp ← Built oven/EM19A01/9.jpg |
| `skywood-skm-e9a` | 5 | skywood-skm-e9a-1.webp ← microwave.zip/SKM30-E9A/SKM30-E9A/SKM30-E9A-----pictures/C25UGP35----普通黑门玻璃/C25UGP35-正.png<br>skywood-skm-e9a-2.webp ← microwave.zip/SKM30-E9A/SKM30-E9A/SKM30-E9A-----pictures/C25UGP35----普通黑门玻璃/C25UGP35-右.png<br>skywood-skm-e9a-3.webp ← microwave.zip/SKM30-E9A/SKM30-E9A/SKM30-E9A-----pictures/C25UGP35----普通黑门玻璃/C25UGP35-左上.png<br>skywood-skm-e9a-4.webp ← microwave.zip/SKM30-E9A/SKM30-E9A/SKM30-E9A-----pictures/C25UGP35----普通黑门玻璃/C25UGP35-开门.png<br>skywood-skm-e9a-5.webp ← microwave.zip/SKM30-E9A/SKM30-E9A/SKM30-E9A-----pictures/C25UGP35----普通黑门玻璃/C25UGP35-炉胆.png |
| `skywood-sk-g05` | 2 | skywood-sk-g05-1.webp ← gas hob.zip/25ID-08011 Gas hob HD Pictures/SK-G05 (1ú⌐.jpg<br>skywood-sk-g05-2.webp ← gas hob.zip/25ID-08011 Gas hob HD Pictures/SK-G05 (2ú⌐.jpg |
| `skywood-multi-purpose-blender-p5a` | 2 | skywood-multi-purpose-blender-p5a-1.webp ← blenders/8 in 1 blender.png<br>skywood-multi-purpose-blender-p5a-2.webp ← blenders/IMG-20260801-WA0015.jpg.jpeg |
| `skywood-sk-20s03` | 1 | skywood-sk-20s03-1.webp ← kettles/SK-20S03.jpg.png |
| `skywood-lc38-black` | 1 | skywood-lc38-black-1.webp ← water dispenser/lc38 black table top.png |
| `skywood-tf4201trl` | 2 | skywood-tf4201trl-1.webp ← towerfans/TF4201TR-L  (1）.jpg.jpeg<br>skywood-tf4201trl-2.webp ← towerfans/TF4201TR-L （2）.jpg.jpeg |
| `skywood-ctf4203-black` | 3 | skywood-ctf4203-black-1.webp ← towerfans/CTF4203TR-L Titanium (1).jpg.jpeg<br>skywood-ctf4203-black-2.webp ← towerfans/CTF4203TR-L Titanium (2).jpg.jpeg<br>skywood-ctf4203-black-3.webp ← towerfans/CTF4203TR-L Titanium (3).jpg.jpeg |
| `skywood-af4204` | 1 | skywood-af4204-1.webp ← towerfans/AF4204TR-L.jpg.jpeg |
| `skywood-ac2401` | 3 | skywood-ac2401-1.webp ← towerfans/AC2401TR-L (1).jpg.jpeg<br>skywood-ac2401-2.webp ← towerfans/AC2401TR-L (2).jpg.jpeg<br>skywood-ac2401-3.webp ← towerfans/AC2401TR-L (3）.jpg.jpeg |
| `skywood-csdc-12k` | 2 | skywood-csdc-12k-1.webp ← AC/CSDC-12K.png<br>skywood-csdc-12k-2.webp ← AC/CSDC-12K_1.png |
| `skywood-csdc-18k` | 2 | skywood-csdc-18k-1.webp ← AC/CSDC-18K_1.png<br>skywood-csdc-18k-2.webp ← AC/CSDC-18K.png |
| `skywood-csc-09k` | 2 | skywood-csc-09k-1.webp ← AC/CSC-09K.png<br>skywood-csc-09k-2.webp ← AC/CSC-09K_1.png |
| `skywood-csc-12k` | 2 | skywood-csc-12k-1.webp ← AC/CSC-12K.png<br>skywood-csc-12k-2.webp ← AC/CSC-12K_1.png |
| `skywood-xqb100-1729az` | 1 | skywood-xqb100-1729az-1.webp ← washing machine/XQB100-1729A 钛金灰 正面.jpg |
| `skywood-b-09` | 1 | skywood-b-09-1.webp ← subwoofer labeled/SK2025-B09.jpg |

## Draft product → photos

| Product id | # | Files (in order; 1 = main) |
|---|---|---|
| `skywood-sky-10-8` | 3 | skywood-sky-10-8-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/1-SKY-10-8I DD2-13 inox/-close.png<br>skywood-sky-10-8-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/1-SKY-10-8I DD2-13 inox/-open.png<br>skywood-sky-10-8-3.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/2-SKY-10-8S DD2-13 silver/-close.png |
| `skywood-sky-12-5` | 4 | skywood-sky-12-5-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/8-SKY-12-5I DF2-16 inox/-close.png<br>skywood-sky-12-5-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/8-SKY-12-5I DF2-16 inox/open.jpg<br>skywood-sky-12-5-3.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/9-SKY-12-5S DF2-16 silver/-close.png<br>skywood-sky-12-5-4.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/10-SKY-12-5W DF2-16 white/-close.png |
| `skywood-sky-14-2` | 3 | skywood-sky-14-2-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/3-SKY-14-2I DD2-20 inox/-close.png<br>skywood-sky-14-2-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/3-SKY-14-2I DD2-20 inox/open.jpg<br>skywood-sky-14-2-3.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/7-SKY-14-2S DD2-20 silver/-close.png |
| `skywood-sky-177-biwd` | 2 | skywood-sky-177-biwd-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/12-SKY-177-BIWD DF1-23D stainless steel/close.jpg<br>skywood-sky-177-biwd-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/12-SKY-177-BIWD DF1-23D stainless steel/open.jpg |
| `skywood-sky-24-6wd` | 2 | skywood-sky-24-6wd-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/13-SKY-24-6WD DE2-33D black inox/close 已改.jpg<br>skywood-sky-24-6wd-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/13-SKY-24-6WD DE2-33D black inox/open 已改.jpg |
| `skywood-sky-43-9wd` | 2 | skywood-sky-43-9wd-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/15-SKY-43-9WD FF2-55D black inox/改-close.jpg<br>skywood-sky-43-9wd-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/15-SKY-43-9WD FF2-55D black inox/open.jpg |
| `skywood-sky-10-0cf` | 2 | skywood-sky-10-0cf-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/18-SKY-10-0CF BD1-101 light grey/改-close.png<br>skywood-sky-10-0cf-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/18-SKY-10-0CF BD1-101 light grey/改-open.png |
| `skywood-sky-15-0cf` | 2 | skywood-sky-15-0cf-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/19-SKY-15-0CF BD1-145 dark grey/改-close.png<br>skywood-sky-15-0cf-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/19-SKY-15-0CF BD1-145 dark grey/改-open.png |
| `skywood-sky-20-0cf` | 2 | skywood-sky-20-0cf-1.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/20-SKY-20-0CF BD1-200 dark grey/改-close.png<br>skywood-sky-20-0cf-2.webp ← SKYWOOD REFRIGERATOR HD PICTURES (3)/20-SKY-20-0CF BD1-200 dark grey/改-open.png |
| `skywood-ed25a01` | 5 | skywood-ed25a01-1.webp ← Built oven/ED25A01/1.jpg<br>skywood-ed25a01-2.webp ← Built oven/ED25A01/2.jpg<br>skywood-ed25a01-3.webp ← Built oven/ED25A01/7.jpg<br>skywood-ed25a01-4.webp ← Built oven/ED25A01/9.jpg<br>skywood-ed25a01-5.webp ← Built oven/ED25A01/10.jpg |
| `skywood-em04a05` | 5 | skywood-em04a05-1.webp ← Built oven/EM04A05/1.jpg<br>skywood-em04a05-2.webp ← Built oven/EM04A05/2.jpg<br>skywood-em04a05-3.webp ← Built oven/EM04A05/7.jpg<br>skywood-em04a05-4.webp ← Built oven/EM04A05/9.jpg<br>skywood-em04a05-5.webp ← Built oven/EM04A05/10.jpg |
| `skywood-em10a02` | 5 | skywood-em10a02-1.webp ← Built oven/EM10A02/1.jpg<br>skywood-em10a02-2.webp ← Built oven/EM10A02/2.jpg<br>skywood-em10a02-3.webp ← Built oven/EM10A02/7.jpg<br>skywood-em10a02-4.webp ← Built oven/EM10A02/9.jpg<br>skywood-em10a02-5.webp ← Built oven/EM10A02/10.jpg |
| `skywood-em10a04` | 5 | skywood-em10a04-1.webp ← Built oven/EM10A04/1.jpg<br>skywood-em10a04-2.webp ← Built oven/EM10A04/2.jpg<br>skywood-em10a04-3.webp ← Built oven/EM10A04/7.jpg<br>skywood-em10a04-4.webp ← Built oven/EM10A04/9.jpg<br>skywood-em10a04-5.webp ← Built oven/EM10A04/10.jpg |
| `skywood-sk5031geb` | 1 | skywood-sk5031geb-1.webp ← standing cookers/SK5031GEB.png |
| `skywood-sk5031ges` | 1 | skywood-sk5031ges-1.webp ← standing cookers/SK5031GES.png |
| `skywood-sk6031geb` | 1 | skywood-sk6031geb-1.webp ← standing cookers/SK6031GEB.png |
| `skywood-skm20-e70` | 2 | skywood-skm20-e70-1.webp ← microwave.zip/SKM20-E70-pictures (1)__x/SKM20-E70-pictures/B20MXP13 白色 正面.png<br>skywood-skm20-e70-2.webp ← microwave.zip/SKM20-E70-pictures (1)__x/SKM20-E70-pictures/B20MXP13 白色 右上侧.png |
| `skywood-skm23-e80` | 3 | skywood-skm23-e80-1.webp ← microwave.zip/SKM23-E80__x/SKM23-E80/SKM23-E80---pictures(grey)/C23PGP02-E80-（WL-P-8-16灰色） 正(3).png<br>skywood-skm23-e80-2.webp ← microwave.zip/SKM23-E80__x/SKM23-E80/SKM23-E80---pictures(grey)/C23PGP02-E80-（WL-P-8-16灰色） 侧(2).png<br>skywood-skm23-e80-3.webp ← microwave.zip/SKM23-E80__x/SKM23-E80/SKM23-E80---pictures(grey)/C23PGP02-E80-（WL-P-8-16灰色） 开门.png |
| `skywood-bimwo-skq25n-e8i` | 3 | skywood-bimwo-skq25n-e8i-1.webp ← microwave.zip/BIMWO-SKQ25N-E8I---pictures__x/BIMWO-SKQ25N-E8I---pictures/C25NGP96-E8I 黑色 正面.png<br>skywood-bimwo-skq25n-e8i-2.webp ← microwave.zip/BIMWO-SKQ25N-E8I---pictures__x/BIMWO-SKQ25N-E8I---pictures/C25NGP96-E8I 黑色 右上侧.png<br>skywood-bimwo-skq25n-e8i-3.webp ← microwave.zip/BIMWO-SKQ25N-E8I---pictures__x/BIMWO-SKQ25N-E8I---pictures/C25NGP96-E8I 黑色 右上侧1.png |
| `skywood-bimwo-ski25n` | 2 | skywood-bimwo-ski25n-1.webp ← microwave.zip/BIMWO-SKI25N (2)__x/I25NGS02-正面.png<br>skywood-bimwo-ski25n-2.webp ← microwave.zip/BIMWO-SKI25N (2)__x/25L-带不锈钢_20250317155530.png |
| `skywood-sk-g01` | 2 | skywood-sk-g01-1.webp ← gas hob.zip/SK-G01 (1）.jpg<br>skywood-sk-g01-2.webp ← gas hob.zip/SK-G01 (2）.jpg |
| `skywood-sk-g02` | 2 | skywood-sk-g02-1.webp ← gas hob.zip/SK-G02 (1）.jpg<br>skywood-sk-g02-2.webp ← gas hob.zip/SK-G02 (2）.jpg |
| `skywood-sk-g03` | 2 | skywood-sk-g03-1.webp ← gas hob.zip/SK-G03 (1）.jpg<br>skywood-sk-g03-2.webp ← gas hob.zip/SK-G03 (2）.jpg |
| `skywood-sk-g04` | 2 | skywood-sk-g04-1.webp ← gas hob.zip/SK-G04 (1）.jpg<br>skywood-sk-g04-2.webp ← gas hob.zip/SK-G04 (2）.jpg |
| `skywood-r-02` | 1 | skywood-r-02-1.webp ← rangehood/R-02.png |
| `skywood-r-02s` | 1 | skywood-r-02s-1.webp ← rangehood/R-02S.png |
| `skywood-nk-b148` | 1 | skywood-nk-b148-1.webp ← blenders/2 in 1 blender.jpg |
| `skywood-nk-b141` | 1 | skywood-nk-b141-1.webp ← blenders/3 in 1 blender.jpg |
| `skywood-nk-j268` | 1 | skywood-nk-j268-1.webp ← blenders/4 in 1 juicer.jpg |
| `skywood-nk-j220b` | 1 | skywood-nk-j220b-1.webp ← blenders/5 in 1 juicer.jpg |
| `skywood-sk-8823` | 1 | skywood-sk-8823-1.webp ← kettles/SK-8823.jpg.png |
| `skywood-sk-8870` | 1 | skywood-sk-8870-1.webp ← kettles/SK-8870.png |
| `skywood-lc38-white` | 1 | skywood-lc38-white-1.webp ← water dispenser/lc38 white table top.png |
| `skywood-lc38-silver` | 1 | skywood-lc38-silver-1.webp ← water dispenser/lc38 silver table top.png |
| `skywood-lc38t` | 1 | skywood-lc38t-1.webp ← water dispenser/lc38 standing.png |
| `skywood-lc31t` | 1 | skywood-lc31t-1.webp ← water dispenser/lc31.png |
| `skywood-lc32f` | 1 | skywood-lc32f-1.webp ← water dispenser/lc32.png |
| `skywood-lc37f` | 1 | skywood-lc37f-1.webp ← water dispenser/lc37 white standing.png |
| `skywood-lcd31f` | 1 | skywood-lcd31f-1.webp ← water dispenser/full touch.png |
| `skywood-tea-bar` | 1 | skywood-tea-bar-1.webp ← water dispenser/Tea bar Skywood.jpeg |
| `skywood-sk2023-b01` | 1 | skywood-sk2023-b01-1.webp ← subwoofer labeled/SK2023-B01.jpg |
| `skywood-sk2023-b02` | 1 | skywood-sk2023-b02-1.webp ← subwoofer labeled/SK2023-B02.jpg |
| `skywood-sk2023-s04` | 1 | skywood-sk2023-s04-1.webp ← subwoofer labeled/SK2023-S04.jpg |
| `skywood-sk2023-s05` | 1 | skywood-sk2023-s05-1.webp ← subwoofer labeled/SK2023-S05.jpg |
| `skywood-sk2025-b03` | 1 | skywood-sk2025-b03-1.webp ← subwoofer labeled/SK2025-B03.jpg |
| `skywood-sk2025-b05` | 1 | skywood-sk2025-b05-1.webp ← subwoofer labeled/SK2025-B05.jpg |
| `skywood-sk2025-b07` | 1 | skywood-sk2025-b07-1.webp ← subwoofer labeled/SK2025-B07.jpg |
| `skywood-ctf4202tr-l` | 5 | skywood-ctf4202tr-l-1.webp ← towerfans/CTF4202TR-L  White (2).jpg.jpeg<br>skywood-ctf4202tr-l-2.webp ← towerfans/CTF4202TR-L  White (4).jpg.jpeg<br>skywood-ctf4202tr-l-3.webp ← towerfans/CTF4202TR-L Titanium (2).jpg.jpeg<br>skywood-ctf4202tr-l-4.webp ← towerfans/CTF4202TR-L Titanium (4).JPG.jpeg<br>skywood-ctf4202tr-l-5.webp ← towerfans/CTF4202TR-L  White (1).jpg.jpeg |
| `skywood-tf1302` | 2 | skywood-tf1302-1.webp ← towerfans/TF1302 (2).jpg.jpeg<br>skywood-tf1302-2.webp ← towerfans/TF1302 (1).jpg.jpeg |
| `skywood-tf2902tr-l` | 2 | skywood-tf2902tr-l-1.webp ← towerfans/TF2902TR-L (1).jpg.jpeg<br>skywood-tf2902tr-l-2.webp ← towerfans/TF2902TR-L (2).jpg.jpeg |
| `skywood-tf4001tr-l` | 3 | skywood-tf4001tr-l-1.webp ← towerfans/TF4001TR-L  (1).png<br>skywood-tf4001tr-l-2.webp ← towerfans/TF4001TR-L  (2).jpg.jpeg<br>skywood-tf4001tr-l-3.webp ← towerfans/TF4001TR-L  (3).jpg.jpeg |
| `skywood-csc-18k` | 2 | skywood-csc-18k-1.webp ← AC/CSC-18K .png<br>skywood-csc-18k-2.webp ← AC/CSC-18K.png |
| `skywood-csc-24k` | 2 | skywood-csc-24k-1.webp ← AC/CSC-24K.png<br>skywood-csc-24k-2.webp ← AC/CSC-24K_1.png |
| `skywood-csdc-09k` | 2 | skywood-csdc-09k-1.webp ← AC/CSDC-09K_1.png<br>skywood-csdc-09k-2.webp ← AC/CSDC-09K.png |
| `skywood-csdc-24k` | 2 | skywood-csdc-24k-1.webp ← AC/CSDC-24K_1.png<br>skywood-csdc-24k-2.webp ← AC/CSDC-24K.png |

## Images not used

Duplicates, packaging, manual, label and back shots, photos with another brand's logo, and models not added.

- **Boombox 2& 3** (10) (unlabelled, see question 1): `IMG-20250903-WA0001.jpg`, `IMG-20250903-WA0002.jpg`, `IMG-20250903-WA0003.jpg`, `IMG-20250903-WA0004.jpg`, `IMG-20250903-WA0005.jpg`, `IMG-20250903-WA0006.jpg`, `IMG-20250903-WA0007.jpg`, `IMG-20250903-WA0008.jpg`, `IMG-20250903-WA0009.jpg`, `IMG-20250903-WA0010.jpg`
- **Built oven** (65) (packaging, manual, label, cord, accessories, back and extra views): `ED25A01/11.jpg`, `ED25A01/12.jpg`, `ED25A01/13.jpg`, `ED25A01/14.jpg`, `ED25A01/15.jpg`, `ED25A01/16.jpg`, `ED25A01/17.jpg`, `ED25A01/18.jpg`, `ED25A01/3.jpg`, `ED25A01/4.jpg`, `ED25A01/5.jpg`, `ED25A01/6.jpg`, `ED25A01/8.jpg`, `EM04A05/11.jpg`, `EM04A05/12.jpg`, `EM04A05/13.jpg`, `EM04A05/14.jpg`, `EM04A05/15.jpg`, `EM04A05/16.jpg`, `EM04A05/17.jpg`, `EM04A05/18.jpg`, `EM04A05/3.jpg`, `EM04A05/4.jpg`, `EM04A05/5.jpg`, `EM04A05/6.jpg`, `EM04A05/8.jpg`, `EM10A02/11.jpg`, `EM10A02/12.jpg`, `EM10A02/13.jpg`, `EM10A02/14.jpg`, `EM10A02/15.jpg`, `EM10A02/16.jpg`, `EM10A02/17.jpg`, `EM10A02/18.jpg`, `EM10A02/3.jpg`, `EM10A02/4.jpg`, `EM10A02/5.jpg`, `EM10A02/6.jpg`, `EM10A02/8.jpg`, `EM10A04/11.jpg`, `EM10A04/12.jpg`, `EM10A04/13.jpg`, `EM10A04/14.jpg`, `EM10A04/15.jpg`, `EM10A04/16.jpg`, `EM10A04/17.jpg`, `EM10A04/18.jpg`, `EM10A04/3.jpg`, `EM10A04/4.jpg`, `EM10A04/5.jpg`, `EM10A04/6.jpg`, `EM10A04/8.jpg`, `EM19A01/10.jpg`, `EM19A01/11.jpg`, `EM19A01/12.jpg`, `EM19A01/13.jpg`, `EM19A01/14.jpg`, `EM19A01/15.jpg`, `EM19A01/16.jpg`, `EM19A01/17.jpg`, `EM19A01/18.jpg`, `EM19A01/4.jpg`, `EM19A01/5.jpg`, `EM19A01/6.jpg`, `EM19A01/8.jpg`
- **SKYWOOD REFRIGERATOR HD PICTURES (3)** (7): `10-SKY-12-5W DF2-16 white/open.jpg`, `11-SKY-17-3BG DF1-20N black glass/close.png`, `2-SKY-10-8S DD2-13 silver/-open.png`, `5-SKY-13-8S DF2-18 silver/open.jpg`, `6-SKY-13-8W DF2-18 white/open.jpg`, `7-SKY-14-2S DD2-20 silver/open.jpg`, `9-SKY-12-5S DF2-16 silver/open.jpg`
- **kettles** (3) (unbranded or other-brand JPEG versions): `SK-20S03.jpg.jpeg`, `SK-8823.jpg.jpeg`, `SK-8870.jpg.jpeg`
- **rangehood** (18) (UK-R models: not added, see question 11): `UK-R01 (1).JPG.jpeg`, `UK-R01 (1).png`, `UK-R01 (2).JPG.jpeg`, `UK-R03 (1).JPG.jpeg`, `UK-R03 (1).png`, `UK-R03 (2).JPG.jpeg`, `UK-R04 (1).png`, `UK-R04 (2).png`, `UK-R05 (1).png`, `UK-R05 (2).png`, `UK-R08 600mm (1).JPG.jpeg`, `UK-R08 600mm (1).png`, `UK-R08 600mm (2).JPG.jpeg`, `UK-R08 600mm (3).JPG.jpeg`, `UK-R08 800mm (1).JPG.jpeg`, `UK-R08 800mm (1).png`, `UK-R08 800mm (2).JPG.jpeg`, `UK-R08 800mm (3).JPG.jpeg`
- **towerfans** (9) (CTF4203 white variant, mislabelled CTF4202 Titanium (5), duplicate JPEG, extra views): `CTF4202TR-L  White (3）.jpg.jpeg`, `CTF4202TR-L Titanium (1).jpg.jpeg`, `CTF4202TR-L Titanium (3).jpg.jpeg`, `CTF4202TR-L Titanium (5).jpg.jpeg`, `CTF4203TR-L  White (1).jpg.jpeg`, `CTF4203TR-L  White (2).jpg.jpeg`, `CTF4203TR-L  White (3).jpg.jpeg`, `CTF4203TR-L  White (4).jpg.jpeg`, `TF4001TR-L  (1).jpg.jpeg`
- **washing machine** (6) (WEILI logo): `XQB100-1729A 钛金灰 正面(1).jpg`, `XQB120-1729A  钛金灰 45°侧面(1).jpg`, `XQB120-1729A  钛金灰 45°侧面.jpg`, `XQB60-1729A 45度侧面 钛金灰.jpg`, `XQG100-1458DPH 钛金灰(1).png`, `XQG100-1458DPH 钛金灰.png`
- **microwave.zip** (3): `SKM30-E9A/SKM30-E9A/SKM30-E9A-----pictures/C25UGP35----普通黑门玻璃/C25UGP35-тид.png`, `SKM30-E9A/SKM30-E9A/SKM30-E9A-----pictures/C25UGP35----普通黑门玻璃/C25UGP35-右上.png`, `SKM30-E9A/SKM30-E9A/SKM30-E9A-----pictures/C25UGP35----普通黑门玻璃/C25UGP35-正上.png`
