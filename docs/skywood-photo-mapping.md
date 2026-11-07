# Skywood photo mapping

Source: the client's Skywood photo pack and spec documents (Drive, received 2026-11). Photos are converted to WebP
(max 1400 px, quality about 80, metadata stripped, transparency kept; plain studio backgrounds cut out except on white
products) and stored in `apps/web/public/img/products/skywood/<product-id>-<n>.webp`. In total there are 49 files and
2.4 MB, and every file is at most 126 KB. File 1 is always the front or main shot.

How it reaches each environment:
- **New databases**: `pnpm db:seed` reads `images` from `handoff/design/brand-data.js` (`SW_PHOTOS`).
- **Live databases**: every deploy runs `seed.ts --tokens` (`syncSkywoodPhotos`). It replaces product images, category
  tiles and the brand hero image **only** when they are empty, point at the dead `www.skywood.co.tz`, or hold the old
  seeded cooker placeholder. Admin uploads (`/api/files/...`) and any other staff URLs are never touched. Models
  without an official photo lose their dead `www.skywood.co.tz` link, so the store shows its placeholder. The sync is
  idempotent and writes an audit entry (`system:deploy`, `catalogue.photos.sync`).
- **Manual option**: `docs/sql/skywood-products-update.sql` applies the same changes in the Supabase SQL editor, with
  the same guards. It also updates spec-sheet features, but only where staff have not edited them. Run it after the
  deploy, because the image files ship with the site.

## Summary
- 276 source images were inventoried (the folders plus both zips; the microwave zip contains nested zips). 49 are used
  for **23 of 29** Skywood products. 227 are not used: they belong to models not in the catalogue, are duplicates, or
  are packaging, manual or label shots.
- **Products with no photo (6):** `skywood-q9`, `skywood-q10`, `skywood-sb-12`, `skywood-s-06` (the pack has S04/S05,
  not S06), `skywood-boombox-3` (see question 1), and `skywood-r10` (the pack has R-02, R-02S and UK-R01/R03/R04/R05/R08,
  but no R10).
- **Features updated from the spec sheets (10):** SKY-32-0BI, SKY-50-5BI, SKY-24-6BI, SKY-17-3BG, SKY-13-8, SKY-25-0CF,
  SKY-EM19A01, SKM-E9A (doc model E30PGP45-E9A), SK-G05 and LC38 BLACK. Each has 4 short bullets or fewer, taken
  from the documents.
- **Products added: none.** None of the spec documents (PDF, XLSX, DOCX) contains a price, and the brief does not
  allow adding a product without a price.

## Models in the photos or spec documents that are missing from the catalogue (not added: no price)
| Category | Models (photos / spec docs) |
|---|---|
| Refrigerators | SKY-10-8I, SKY-10-8S, SKY-12-5I/S/W, SKY-14-2I/S, SKY-177-BIWD, SKY-24-6WD, SKY-43-9WD (specs + photos); SKY-10-0CF, SKY-15-0CF (doc: SKY-150-0CF), SKY-20-0CF chest freezers (specs + photos). Variants SKY-13-8S/W are shown as extra photos of SKY-13-8 |
| Built-in ovens | ED25A01, EM04A05, EM10A02, EM10A04 (specs + 18 photos each) |
| Standing cookers | SK5031GEB, SK5031GES, SK6031GEB (photos; the spec sheet lists configurations without model numbers) |
| Microwaves | SKM20-E70 (B20MXP13), SKM23-E80 (C23PGP02), BIMWO-SKQ25N-E8I (Q25NGS96), BIMWO-SKI25N (I25NXP0001) (specs + photos) |
| Gas hobs | SK-G01, SK-G02, SK-G03, SK-G04 (specs + photos) |
| Range hoods | R-02, R-02S, UK-R01, UK-R03, UK-R04, UK-R05, UK-R08 600/800 mm (photos); UK-R02, UK-R07, UK-R09, UK-R10 (specs only; the "UK-" prefix suggests these may be Mr UK models) |
| Blenders | 2-in-1 (NK-B148?), 3-in-1 (NK-B141?), 4-in-1 / 5-in-1 juicers (NK-J268 / NK-J220B?). Photo names do not give model numbers |
| Kettles | SK-8823, SK-8870 (photos); the spec sheet lists 1.0 L, 1.8 L and 2.0 L kettles without model numbers |
| Water dispensers | LC38 WHITE, LC38 SILVER, LC38T standing, LC31T, LC32F, LC37F, LCD31F "full touch", LCE089L (specs), Tea bar (photo) |
| Music | Subwoofer systems SK2023-B01/B02/S04/S05, SK2025-B03/B05/B07 (photos); Boombox 2 (photo) |
| Tower fans | CTF4202TR-L (white, titanium), TF1302, TF2902TR-L, TF4001TR-L (photos) |
| Air conditioning | CSC-18K, CSC-24K, CSDC-09K, CSDC-24K (photos) |
| Washing machines | XQB120-1729A, XQB60-1729A (top load), XQG100-1458DPH (front load) (photos) |

## Questions for the client (marked defaults are in place)
1. **Boombox 3**: the folder "Boombox 2& 3" holds two designs (rugged with an RGB light bar, and a round-handle model),
   without labels. Which one is Boombox 3? *Default: no photo.*
2. **B 09 Soundbar** is matched to `SK2025-B09` (a soundbar with a wireless sub). Please confirm.
3. **CTF4203 Black** uses the `CTF4203TR-L Titanium` photos (the pack has no "Black" CTF4203). Please confirm the colour name.
4. **XQB100-1729AZ** is named "12kg" in the catalogue, but the photo pack also has an XQB120 model (normally 12 kg).
   Is the XQB100 a 10 kg machine? *Name not changed.*
5. **SKY-EM19A01**: the catalogue said "11 functions"; the spec sheet says 9 functions (features now follow the sheet).
   The name says "Air Fry"; the sheet only says "with basket". *Name kept.*
6. **SK-20S03 kettle**: the catalogue says 2.2 L; the kettle spec sheet has no model numbers (1.0/1.8/2.0 L). *Features
   unchanged.* The JPEG version of this photo carries another brand's logo (LONGLIER), so only the Skywood-branded PNG is used.
7. **SKY-17-3BG**: the "close" render in the pack is a flat black placeholder, so only the open-door photo is used.
8. The EM19A01 oven photos are real-world shots on a grey backdrop (with stickers on the door), not studio renders.
   Studio shots would look better on the store.
9. Prices are needed for the models in the table above before they can be added.


## Inventory
Source images inventoried: **276** · used: **49** (for 23 products) · not used: **227**

## Product → photos

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

## Images not used

- **AC** (8): `CSC-18K .png`, `CSC-18K.png`, `CSC-24K.png`, `CSC-24K_1.png`, `CSDC-09K.png`, `CSDC-09K_1.png`, `CSDC-24K.png`, `CSDC-24K_1.png`
- **Boombox 2& 3** (10): `IMG-20250903-WA0001.jpg`, `IMG-20250903-WA0002.jpg`, `IMG-20250903-WA0003.jpg`, `IMG-20250903-WA0004.jpg`, `IMG-20250903-WA0005.jpg`, `IMG-20250903-WA0006.jpg`, `IMG-20250903-WA0007.jpg`, `IMG-20250903-WA0008.jpg`, `IMG-20250903-WA0009.jpg`, `IMG-20250903-WA0010.jpg`
- **Built oven** (85): `ED25A01/1.jpg`, `ED25A01/10.jpg`, `ED25A01/11.jpg`, `ED25A01/12.jpg`, `ED25A01/13.jpg`, `ED25A01/14.jpg`, `ED25A01/15.jpg`, `ED25A01/16.jpg`, `ED25A01/17.jpg`, `ED25A01/18.jpg`, `ED25A01/2.jpg`, `ED25A01/3.jpg`, `ED25A01/4.jpg`, `ED25A01/5.jpg`, `ED25A01/6.jpg`, `ED25A01/7.jpg`, `ED25A01/8.jpg`, `ED25A01/9.jpg`, `EM04A05/1.jpg`, `EM04A05/10.jpg`, `EM04A05/11.jpg`, `EM04A05/12.jpg`, `EM04A05/13.jpg`, `EM04A05/14.jpg`, `EM04A05/15.jpg`, `EM04A05/16.jpg`, `EM04A05/17.jpg`, `EM04A05/18.jpg`, `EM04A05/2.jpg`, `EM04A05/3.jpg`, `EM04A05/4.jpg`, `EM04A05/5.jpg`, `EM04A05/6.jpg`, `EM04A05/7.jpg`, `EM04A05/8.jpg`, `EM04A05/9.jpg`, `EM10A02/1.jpg`, `EM10A02/10.jpg`, `EM10A02/11.jpg`, `EM10A02/12.jpg`, `EM10A02/13.jpg`, `EM10A02/14.jpg`, `EM10A02/15.jpg`, `EM10A02/16.jpg`, `EM10A02/17.jpg`, `EM10A02/18.jpg`, `EM10A02/2.jpg`, `EM10A02/3.jpg`, `EM10A02/4.jpg`, `EM10A02/5.jpg`, `EM10A02/6.jpg`, `EM10A02/7.jpg`, `EM10A02/8.jpg`, `EM10A02/9.jpg`, `EM10A04/1.jpg`, `EM10A04/10.jpg`, `EM10A04/11.jpg`, `EM10A04/12.jpg`, `EM10A04/13.jpg`, `EM10A04/14.jpg`, `EM10A04/15.jpg`, `EM10A04/16.jpg`, `EM10A04/17.jpg`, `EM10A04/18.jpg`, `EM10A04/2.jpg`, `EM10A04/3.jpg`, `EM10A04/4.jpg`, `EM10A04/5.jpg`, `EM10A04/6.jpg`, `EM10A04/7.jpg`, `EM10A04/8.jpg`, `EM10A04/9.jpg`, `EM19A01/10.jpg`, `EM19A01/11.jpg`, `EM19A01/12.jpg`, `EM19A01/13.jpg`, `EM19A01/14.jpg`, `EM19A01/15.jpg`, `EM19A01/16.jpg`, `EM19A01/17.jpg`, `EM19A01/18.jpg`, `EM19A01/4.jpg`, `EM19A01/5.jpg`, `EM19A01/6.jpg`, `EM19A01/8.jpg`
- **SKYWOOD REFRIGERATOR HD PICTURES (3)** (29): `1-SKY-10-8I DD2-13 inox/-close.png`, `1-SKY-10-8I DD2-13 inox/-open.png`, `10-SKY-12-5W DF2-16 white/-close.png`, `10-SKY-12-5W DF2-16 white/open.jpg`, `11-SKY-17-3BG DF1-20N black glass/close.png`, `12-SKY-177-BIWD DF1-23D stainless steel/close.jpg`, `12-SKY-177-BIWD DF1-23D stainless steel/open.jpg`, `13-SKY-24-6WD DE2-33D black inox/close 已改.jpg`, `13-SKY-24-6WD DE2-33D black inox/open 已改.jpg`, `15-SKY-43-9WD FF2-55D black inox/open.jpg`, `15-SKY-43-9WD FF2-55D black inox/改-close.jpg`, `18-SKY-10-0CF BD1-101 light grey/改-close.png`, `18-SKY-10-0CF BD1-101 light grey/改-open.png`, `19-SKY-15-0CF BD1-145 dark grey/改-close.png`, `19-SKY-15-0CF BD1-145 dark grey/改-open.png`, `2-SKY-10-8S DD2-13 silver/-close.png`, `2-SKY-10-8S DD2-13 silver/-open.png`, `20-SKY-20-0CF BD1-200 dark grey/改-close.png`, `20-SKY-20-0CF BD1-200 dark grey/改-open.png`, `3-SKY-14-2I DD2-20 inox/-close.png`, `3-SKY-14-2I DD2-20 inox/open.jpg`, `5-SKY-13-8S DF2-18 silver/open.jpg`, `6-SKY-13-8W DF2-18 white/open.jpg`, `7-SKY-14-2S DD2-20 silver/-close.png`, `7-SKY-14-2S DD2-20 silver/open.jpg`, `8-SKY-12-5I DF2-16 inox/-close.png`, `8-SKY-12-5I DF2-16 inox/open.jpg`, `9-SKY-12-5S DF2-16 silver/-close.png`, `9-SKY-12-5S DF2-16 silver/open.jpg`
- **blenders** (4): `2 in 1 blender.jpg`, `3 in 1 blender.jpg`, `4 in 1 juicer.jpg`, `5 in 1 juicer.jpg`
- **kettles** (5): `SK-20S03.jpg.jpeg`, `SK-8823.jpg.jpeg`, `SK-8823.jpg.png`, `SK-8870.jpg.jpeg`, `SK-8870.png`
- **rangehood** (20): `R-02.png`, `R-02S.png`, `UK-R01 (1).JPG.jpeg`, `UK-R01 (1).png`, `UK-R01 (2).JPG.jpeg`, `UK-R03 (1).JPG.jpeg`, `UK-R03 (1).png`, `UK-R03 (2).JPG.jpeg`, `UK-R04 (1).png`, `UK-R04 (2).png`, `UK-R05 (1).png`, `UK-R05 (2).png`, `UK-R08 600mm (1).JPG.jpeg`, `UK-R08 600mm (1).png`, `UK-R08 600mm (2).JPG.jpeg`, `UK-R08 600mm (3).JPG.jpeg`, `UK-R08 800mm (1).JPG.jpeg`, `UK-R08 800mm (1).png`, `UK-R08 800mm (2).JPG.jpeg`, `UK-R08 800mm (3).JPG.jpeg`
- **standing cookers** (3): `SK5031GEB.png`, `SK5031GES.png`, `SK6031GEB.png`
- **subwoofer labeled** (7): `SK2023-B01.jpg`, `SK2023-B02.jpg`, `SK2023-S04.jpg`, `SK2023-S05.jpg`, `SK2025-B03.jpg`, `SK2025-B05.jpg`, `SK2025-B07.jpg`
- **towerfans** (21): `CTF4202TR-L  White (1).jpg.jpeg`, `CTF4202TR-L  White (2).jpg.jpeg`, `CTF4202TR-L  White (3）.jpg.jpeg`, `CTF4202TR-L  White (4).jpg.jpeg`, `CTF4202TR-L Titanium (1).jpg.jpeg`, `CTF4202TR-L Titanium (2).jpg.jpeg`, `CTF4202TR-L Titanium (3).jpg.jpeg`, `CTF4202TR-L Titanium (4).JPG.jpeg`, `CTF4202TR-L Titanium (5).jpg.jpeg`, `CTF4203TR-L  White (1).jpg.jpeg`, `CTF4203TR-L  White (2).jpg.jpeg`, `CTF4203TR-L  White (3).jpg.jpeg`, `CTF4203TR-L  White (4).jpg.jpeg`, `TF1302 (1).jpg.jpeg`, `TF1302 (2).jpg.jpeg`, `TF2902TR-L (1).jpg.jpeg`, `TF2902TR-L (2).jpg.jpeg`, `TF4001TR-L  (1).jpg.jpeg`, `TF4001TR-L  (1).png`, `TF4001TR-L  (2).jpg.jpeg`, `TF4001TR-L  (3).jpg.jpeg`
- **washing machine** (6): `XQB100-1729A 钛金灰 正面(1).jpg`, `XQB120-1729A  钛金灰 45°侧面(1).jpg`, `XQB120-1729A  钛金灰 45°侧面.jpg`, `XQB60-1729A 45度侧面 钛金灰.jpg`, `XQG100-1458DPH 钛金灰(1).png`, `XQG100-1458DPH 钛金灰.png`
- **water dispenser** (8): `Tea bar Skywood.jpeg`, `full touch.png`, `lc31.png`, `lc32.png`, `lc37 white standing.png`, `lc38 silver table top.png`, `lc38 standing.png`, `lc38 white table top.png`
- **gas hob.zip** (8): `25ID-08011 Gas hob HD Pictures/SK-G01 (1ú⌐.jpg`, `25ID-08011 Gas hob HD Pictures/SK-G01 (2ú⌐.jpg`, `25ID-08011 Gas hob HD Pictures/SK-G02 (1ú⌐.jpg`, `25ID-08011 Gas hob HD Pictures/SK-G02 (2ú⌐.jpg`, `25ID-08011 Gas hob HD Pictures/SK-G03 (1ú⌐.jpg`, `25ID-08011 Gas hob HD Pictures/SK-G03 (2ú⌐.jpg`, `25ID-08011 Gas hob HD Pictures/SK-G04 (1ú⌐.jpg`, `25ID-08011 Gas hob HD Pictures/SK-G04 (2ú⌐.jpg`
- **microwave.zip** (13): `BIMWO-SKI25N (2)/25L-带不锈钢_20250317155530.png`, `BIMWO-SKI25N (2)/I25NGS02-正面.png`, `BIMWO-SKQ25N-E8I---pictures/BIMWO-SKQ25N-E8I---pictures/C25NGP96-E8I 黑色 右上侧.png`, `BIMWO-SKQ25N-E8I---pictures/BIMWO-SKQ25N-E8I---pictures/C25NGP96-E8I 黑色 右上侧1.png`, `BIMWO-SKQ25N-E8I---pictures/BIMWO-SKQ25N-E8I---pictures/C25NGP96-E8I 黑色 正面.png`, `SKM20-E70-pictures (1)/SKM20-E70-pictures/B20MXP13 白色 右上侧.png`, `SKM20-E70-pictures (1)/SKM20-E70-pictures/B20MXP13 白色 正面.png`, `SKM23-E80/SKM23-E80/SKM23-E80---pictures(grey)/C23PGP02-E80-（WL-P-8-16灰色） 侧(2).png`, `SKM23-E80/SKM23-E80/SKM23-E80---pictures(grey)/C23PGP02-E80-（WL-P-8-16灰色） 开门.png`, `SKM23-E80/SKM23-E80/SKM23-E80---pictures(grey)/C23PGP02-E80-（WL-P-8-16灰色） 正(3).png`, `SKM30-E9A/SKM30-E9A/SKM30-E9A-----pictures/C25UGP35----普通黑门玻璃/C25UGP35-тид.png`, `SKM30-E9A/SKM30-E9A/SKM30-E9A-----pictures/C25UGP35----普通黑门玻璃/C25UGP35-右上.png`, `SKM30-E9A/SKM30-E9A/SKM30-E9A-----pictures/C25UGP35----普通黑门玻璃/C25UGP35-正上.png`
