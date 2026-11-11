# Mr UK product photos (client Google Drive pack, November 2026)

Source: the Mr UK product pictures folder (10 sub-folders, 103 files). Every photo is converted to WebP (max 1600 px) under `apps/web/public/img/products/mruk/<product-id>-<n>.webp`; `-1` is the front shot. Mapping data: `MU_PHOTOS` and `MRUK_DRAFTS` in `handoff/design/brand-data.js`.

**How it reaches the live site:** every mruk-web deploy runs `seed.ts --tokens`, which (1) creates the missing Air Conditioning category and the new sub-categories (Blenders, Hose pipes), (2) creates the drafts below (hidden, price 0, stock 0) and (3) sets the photos on live products and category tiles. Photos staff uploaded in the admin are never replaced; a draft staff delete is never recreated. A category only shows in the store once it has a published product, so Air Conditioning stays hidden until the first AC is priced and published.

**Clean-up applied:** fake transparency checkerboard removed (UK-F120), black studio backdrops turned white (UK-F143, UK-F103 WD, AC indoor unit), background-removed cut-outs used as the main shot for the three pumps.

## Live products that now have official photos (14)

| Product | Photos | Source files |
|---|---|---|
| `mruk-uk-f275-58-5di0wd` | 1 | FRIDGE/Uk-f275 WD.png |
| `mruk-uk-f215-30-4dl-wd` | 1 | FRIDGE/uk-f215 WD.png |
| `mruk-uk-f143-27-0wd` | 1 | FRIDGE/uk-f143 WD.png |
| `mruk-uk-f120-20-2diwd` | 1 | FRIDGE/uk-f120 WD.png |
| `mruk-uk-50` | 1 | FREEZER/Chest Freezer 50.png |
| `mruk-uk-1500` | 1 | GENERATORS/UK-1500Q Gasoline Generator.png |
| `mruk-uk-2500q` | 1 | GENERATORS/UK-2500Q Gasoline Generator.png |
| `mruk-uk-g3500q` | 1 | GENERATORS/UK-3500Q Gasoline Generator.webp |
| `mruk-uk-g5500q` | 1 | GENERATORS/UK-5500Q Gasoline Generator.png |
| `mruk-uk-t09` | 3 | SUBWOOFER/UK T09.png<br>SUBWOOFER/UK2020T09-reflct.png<br>SUBWOOFER/UKT09.jpg |
| `mruk-uk-6134-ge` | 1 | GAS HOB & STAND COOKER/Uk-Gas Hob 6134GE.png |
| `mruk-pump-control` | 2 | VIFAA SHAMBA/_MG_6515-removebg-preview.png<br>VIFAA SHAMBA/_MG_6515.JPG |
| `mruk-surface-pump` | 3 | VIFAA SHAMBA/_MG_6530-removebg-preview.png<br>VIFAA SHAMBA/_MG_6530.JPG<br>VIFAA SHAMBA/_MG_6521.JPG |
| `mruk-submissible-pump` | 2 | VIFAA SHAMBA/_MG_6536-removebg-preview.png<br>VIFAA SHAMBA/_MG_6536.JPG |

## New drafts, hidden until staff add a price and publish (50)

| Draft id | Category / sub | Model | Name | Photos | Source files |
|---|---|---|---|---|---|
| `mruk-uk-f42` | fridges / Fridges | UK-F42 | Double Door Refrigerator (white, silver, black) | 1 | FRIDGE/Uk-f42 (White_Silver_Black).png |
| `mruk-uk-f43` | fridges / Fridges | UK-F43 | Double Door Refrigerator (stainless) | 1 | FRIDGE/uk-f43.png |
| `mruk-uk-f56` | fridges / Fridges | UK-F56 | Double Door Refrigerator | 1 | FRIDGE/uk-f56.png |
| `mruk-uk-f57` | fridges / Fridges | UK-F57 | Double Door Refrigerator (gold) | 1 | FRIDGE/uk-f57 gold.png |
| `mruk-uk-f93` | fridges / Fridges | UK-F93 | Double Door Refrigerator | 1 | FRIDGE/uk-f93.png |
| `mruk-uk-f103-wd` | fridges / Fridges | UK-F103 WD | Double Door Refrigerator with Dispenser | 1 | FRIDGE/uk-f103 WD.png |
| `mruk-uk-f215` | fridges / Fridges | UK-F215 | Side by Side Refrigerator (no dispenser) | 1 | FRIDGE/uk-f215.png |
| `mruk-uk-showcase-fridge` | fridges / Fridges | UK Showcase Fridge | Showcase Display Fridge | 1 | FRIDGE/Uk- Showcase fridge.png |
| `mruk-dsc01525` | fridges / Fridges | DSC01525 | Double Door Refrigerator (model to confirm) | 1 | FRIDGE/DSC01525.JPG.png |
| `mruk-chest-freezer-75` | fridges / Freezers | Chest Freezer 75 | Chest Freezer 75 | 1 | FREEZER/Chest Freezer 75.png |
| `mruk-chest-freezer-100` | fridges / Freezers | Chest Freezer 100 | Chest Freezer 100 | 1 | FREEZER/Chest Freezer 100.png |
| `mruk-chest-freezer-125` | fridges / Freezers | Chest Freezer 125 | Chest Freezer 125 | 1 | FREEZER/Chest Freezer 125.png |
| `mruk-double-lid-chest-freezer` | fridges / Freezers | Double-Lid Chest Freezer | Double-Lid Chest Freezer | 1 | FREEZER/Double-Lid Chest Freezer.png |
| `mruk-showcase-chest-freezer-big` | fridges / Freezers | Showcase Chest Freezer Big | Showcase Chest Freezer (large) | 1 | FREEZER/Showcase Chest Freezer Big.png |
| `mruk-showcase-chest-freezer-small` | fridges / Freezers | Showcase Chest Freezer Small | Showcase Chest Freezer (small) | 1 | FREEZER/Showcase Chest Freezer Small.png |
| `mruk-uk-6500q` | generators / Generators | UK-6500Q | 6500Q Generator | 1 | GENERATORS/UK-6500Q Gasoline Generator.png |
| `mruk-uk-t05` | music-tv / Subwoofers | UK-T05 | T05 Subwoofer System | 1 | SUBWOOFER/UK-T05.jpg |
| `mruk-uk-t08` | music-tv / Subwoofers | UK-T08 | T08 Subwoofer System | 2 | SUBWOOFER/UK-T08.jpg<br>SUBWOOFER/UKT08.png |
| `mruk-uk-t11` | music-tv / Subwoofers | UK-T11 | T11 Home Theatre System | 2 | SUBWOOFER/UK2020T11.png<br>SUBWOOFER/UK-t11.jpg |
| `mruk-uk-t18` | music-tv / Subwoofers | UK-T18 | T18 Subwoofer System | 1 | SUBWOOFER/UK-T18.jpg |
| `mruk-uk-t19` | music-tv / Subwoofers | UK-T19 | T19 Subwoofer System | 1 | SUBWOOFER/UK-T19.jpg |
| `mruk-uk-t21` | music-tv / Subwoofers | UK-T21 | T21 Home Theatre System | 2 | SUBWOOFER/UK2020T21-reflction.png<br>SUBWOOFER/UK-T21.jpg |
| `mruk-uk-t22` | music-tv / Subwoofers | UK-T22 | T22 Subwoofer System | 3 | SUBWOOFER/t22.png<br>SUBWOOFER/UK T22.jpg<br>SUBWOOFER/WhatsApp Image 2022-01-28 at 5.16.06 PM.jpeg |
| `mruk-uk-s16` | music-tv / Subwoofers | UK-S16 | S16 Subwoofer System | 1 | SUBWOOFER/UK-s16.jpg |
| `mruk-uk-s17` | music-tv / Subwoofers | UK-S17 | S17 Home Theatre System | 1 | SUBWOOFER/S17.png |
| `mruk-uk-sb234` | music-tv / Subwoofers | UK-SB234 | SB 234 Speaker System | 1 | SUBWOOFER/SB 234.png |
| `mruk-uk-sb243` | music-tv / Subwoofers | UK-SB243 | SB 243 Speaker System | 1 | SUBWOOFER/SB 243.png |
| `mruk-uk-rgb-system` | music-tv / Subwoofers | UK RGB System | RGB Home Audio Speaker System | 2 | SUBWOOFER/RGB Home Audio Speaker System.png<br>SUBWOOFER/WhatsApp Image 2022-01-28 at 5.16.07 PM (1).png |
| `mruk-uk-40` | music-tv / Televisions | UK 40 | 40" LED TV | 1 | TV/UK 40-For-box.png |
| `mruk-uk-43p9` | music-tv / Televisions | UK 43P9 | 43" LED TV (43P9) | 1 | TV/43P9.png |
| `mruk-uk-55-new` | music-tv / Televisions | UK 55 New | 55" LED TV (new model, to confirm) | 2 | TV/55-NEW-TV-PNG-1.png<br>TV/55-NEW-TV-PNG-free-3D.png |
| `mruk-tv-525d8181` | music-tv / Televisions | TV 525D8181 | LED TV (model to confirm) | 2 | TV/525D8181-2.png<br>TV/525D8182.jpg |
| `mruk-tv-20210129` | music-tv / Televisions | TV 20210129 | LED TV (model to confirm, side view) | 1 | TV/20210129_114189.png |
| `mruk-l500` | kitchen / Standing cookers | L500 | L500 Standing Cooker | 2 | GAS HOB & STAND COOKER/STOVE L500 UK BLACK.jpg<br>GAS HOB & STAND COOKER/STOVE L500 UK SILVER.jpg |
| `mruk-uk-9285` | kitchen / Gas hobs | UK 9285 | Gas Hob 9285 | 1 | GAS HOB & STAND COOKER/Uk-Gas Hob 9285.jpg |
| `mruk-uk-ge1` | kitchen / Gas hobs | UK GE1 | Gas and Electric Hob GE1 | 1 | GAS HOB & STAND COOKER/Uk-Gas Hob GE1.jpg |
| `mruk-uk-se1` | kitchen / Gas hobs | UK SE1 | Stainless Gas and Electric Hob SE1 | 1 | GAS HOB & STAND COOKER/Uk-Gas Hob SE1.png |
| `mruk-blender-stainless` | kitchen / Blenders | Blender Stainless | Blender with Grinder (stainless) | 1 | BLENDER/20210115_122818.png |
| `mruk-blender-3-in-1` | kitchen / Blenders | Blender 3-in-1 | 3-in-1 Blender (red) | 2 | BLENDER/DSC015431.png<br>BLENDER/DSC015431saa.jpg |
| `mruk-ac-9000-btu` | ac / Split units | AC 9000 BTU | 9,000 BTU Split Air Conditioner | 4 | AC & FAN/AC 9000 BTU.jpg<br>AC & FAN/Air Conditioner .png<br>AC & FAN/PIS_6119.jpg<br>AC & FAN/PIS_6140.png |
| `mruk-uk-wm-6-5kg` | washing / Washing machines | UK-WM 6.5kg | 6.5kg Twin Tub Washing Machine | 1 | WASHING MACHINE/UK-WM 6.5kg white color.png |
| `mruk-uk-wm-8kg` | washing / Washing machines | UK-WM 8kg | 8kg Twin Tub Washing Machine | 1 | WASHING MACHINE/UK-WM 8kg.png |
| `mruk-uk-wm-10kg` | washing / Washing machines | UK-WM 10kg | 10kg Twin Tub Washing Machine | 1 | WASHING MACHINE/UK-WM 10kg.png |
| `mruk-uk-wm-14kg` | washing / Washing machines | UK-WM 14kg | 14kg Twin Tub Washing Machine | 1 | WASHING MACHINE/UK-WM 14kg color.png |
| `mruk-uk-wm-16kg` | washing / Washing machines | UK-WM 16kg | 16kg Twin Tub Washing Machine | 1 | WASHING MACHINE/UK-WM 16kg white color.png |
| `mruk-twin-tub-525d8129` | washing / Washing machines | Twin Tub 525D8129 | Twin Tub Washing Machine (model to confirm) | 2 | WASHING MACHINE/525D8129.jpg<br>WASHING MACHINE/DSC05337.PNG |
| `mruk-uk-0-37-f` | agriculture / Water pumps | UK 0.37 F | Submersible Pump 0.37 kW with Float Switch | 2 | VIFAA SHAMBA/UK 0.37 F.jpg<br>VIFAA SHAMBA/20210217_133214.png |
| `mruk-uk-1-1-f` | agriculture / Water pumps | UK 1.1 F | Submersible Pump 1.1 kW with Float Switch | 2 | VIFAA SHAMBA/UK 1.1 F.jpg<br>VIFAA SHAMBA/20210217_135615.png |
| `mruk-submersible-pump-yellow` | agriculture / Water pumps | Submersible Pump Yellow | Submersible Dirty Water Pump (model to confirm) | 3 | VIFAA SHAMBA/20220905_122035B.jpg<br>VIFAA SHAMBA/20220905_122214B.jpg<br>VIFAA SHAMBA/20220905_123205B.jpg |
| `mruk-hose-pipe` | agriculture / Hose pipes | Hose Pipe | Layflat Hose Pipe | 2 | VIFAA SHAMBA/HorsePipe.jpg<br>VIFAA SHAMBA/HorsePipe-2.jpg |

## Not used (duplicates of a photo already used)

JPG/PNG twins of the same shot (AC 9000 BTU.png, Ac.png, PIS_6119.png, new ac.png, HorsePipe-2.png, the yellow pump PNG/JPG twins and non-"B" retouch variants) and the RAW file _MG_6536.CR2.

## Questions for the client

1. Prices, stock and specs for the 50 drafts (they stay hidden until priced).
2. Drafts named "model to confirm" have no model in the file name: the DSC01525 fridge, the two unnamed TVs (525D8181/525D8182 and 20210129), the 55" TV pair, the older twin tub (525D8129/DSC05337) and the yellow submersible pump. Please give the model numbers.
3. No photo was supplied for: UK59, UK F47-094I, UK-145, UK 32/43/43 SMART/55 SMART TVs, UK X-15, 2024R, 2024 M, G 7302, UK-5055G3E1, Engine 170F, Sewage Water Pump-5HP, Heavy Duty Water Pump-13HP, Sprayer Pump WX 6C, UK 7OWM and UK 90WM. These keep their current image (hot-linked from www.mruk.co.tz where one exists) or the placeholder.
4. Is "Chest Freezer 50" the live "UK 50 200L Chest Freezer"? It was matched by the number 50.
5. Air Conditioning is a new Mr UK category: confirm you want it in the menu once the 9,000 BTU unit is priced.

