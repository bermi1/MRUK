-- Skywood catalogue update: official product photos and spec-sheet features.
-- Generated from handoff/design/brand-data.js (branch feat/skywood-photos).
--
-- IMPORTANT: the image files are NOT in the database. They live in
-- apps/web/public/img/products/skywood/ and are served by the site, so run this
-- only AFTER the new version of the site is deployed (or skip it entirely: every
-- deploy runs "seed.ts --tokens", which applies the same photo changes automatically).
--
-- Safe to run more than once. It never overwrites photos staff uploaded in the admin:
-- images are only replaced when they are empty or point at the old www.skywood.co.tz
-- site (which no longer resolves); features only when they still hold the original text.
-- Mr UK rows are not touched.

BEGIN;

-- 1. Product photos (front shot first) -----------------------------------------
-- Q9: no official photo yet; remove dead www.skywood.co.tz links so the store shows its placeholder.
UPDATE "Product" SET images = '{}'::text[], "updatedAt" = now()
 WHERE id = 'skywood-q9' AND "brandKey" = 'skywood' AND cardinality(images) > 0 AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE u !~* '^https?://(www\.)?skywood\.co\.tz/');
-- Q10: no official photo yet; remove dead www.skywood.co.tz links so the store shows its placeholder.
UPDATE "Product" SET images = '{}'::text[], "updatedAt" = now()
 WHERE id = 'skywood-q10' AND "brandKey" = 'skywood' AND cardinality(images) > 0 AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE u !~* '^https?://(www\.)?skywood\.co\.tz/');
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-b-09-1.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-b-09' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-b-09-1.webp']::text[];
-- SB 12: no official photo yet; remove dead www.skywood.co.tz links so the store shows its placeholder.
UPDATE "Product" SET images = '{}'::text[], "updatedAt" = now()
 WHERE id = 'skywood-sb-12' AND "brandKey" = 'skywood' AND cardinality(images) > 0 AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE u !~* '^https?://(www\.)?skywood\.co\.tz/');
-- S 06: no official photo yet; remove dead www.skywood.co.tz links so the store shows its placeholder.
UPDATE "Product" SET images = '{}'::text[], "updatedAt" = now()
 WHERE id = 'skywood-s-06' AND "brandKey" = 'skywood' AND cardinality(images) > 0 AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE u !~* '^https?://(www\.)?skywood\.co\.tz/');
-- BOOMBOX 3: no official photo yet; remove dead www.skywood.co.tz links so the store shows its placeholder.
UPDATE "Product" SET images = '{}'::text[], "updatedAt" = now()
 WHERE id = 'skywood-boombox-3' AND "brandKey" = 'skywood' AND cardinality(images) > 0 AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE u !~* '^https?://(www\.)?skywood\.co\.tz/');
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-sky-32-0bi-1.webp', '/img/products/skywood/skywood-sky-32-0bi-2.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-32-0bi' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-sky-32-0bi-1.webp', '/img/products/skywood/skywood-sky-32-0bi-2.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-sky-50-5bi-1.webp', '/img/products/skywood/skywood-sky-50-5bi-2.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-50-5bi' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-sky-50-5bi-1.webp', '/img/products/skywood/skywood-sky-50-5bi-2.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-sky-24-6bi-1.webp', '/img/products/skywood/skywood-sky-24-6bi-2.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-24-6bi' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-sky-24-6bi-1.webp', '/img/products/skywood/skywood-sky-24-6bi-2.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-sky-17-3bg-1.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-17-3bg' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-sky-17-3bg-1.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-sky-13-8-1.webp', '/img/products/skywood/skywood-sky-13-8-2.webp', '/img/products/skywood/skywood-sky-13-8-3.webp', '/img/products/skywood/skywood-sky-13-8-4.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-13-8' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-sky-13-8-1.webp', '/img/products/skywood/skywood-sky-13-8-2.webp', '/img/products/skywood/skywood-sky-13-8-3.webp', '/img/products/skywood/skywood-sky-13-8-4.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-sky-25-0cf-1.webp', '/img/products/skywood/skywood-sky-25-0cf-2.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-25-0cf' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-sky-25-0cf-1.webp', '/img/products/skywood/skywood-sky-25-0cf-2.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-sk6031ges-1.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sk6031ges' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-sk6031ges-1.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-sky-em19a01-1.webp', '/img/products/skywood/skywood-sky-em19a01-2.webp', '/img/products/skywood/skywood-sky-em19a01-3.webp', '/img/products/skywood/skywood-sky-em19a01-4.webp', '/img/products/skywood/skywood-sky-em19a01-5.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-em19a01' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-sky-em19a01-1.webp', '/img/products/skywood/skywood-sky-em19a01-2.webp', '/img/products/skywood/skywood-sky-em19a01-3.webp', '/img/products/skywood/skywood-sky-em19a01-4.webp', '/img/products/skywood/skywood-sky-em19a01-5.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-skm-e9a-1.webp', '/img/products/skywood/skywood-skm-e9a-2.webp', '/img/products/skywood/skywood-skm-e9a-3.webp', '/img/products/skywood/skywood-skm-e9a-4.webp', '/img/products/skywood/skywood-skm-e9a-5.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-skm-e9a' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-skm-e9a-1.webp', '/img/products/skywood/skywood-skm-e9a-2.webp', '/img/products/skywood/skywood-skm-e9a-3.webp', '/img/products/skywood/skywood-skm-e9a-4.webp', '/img/products/skywood/skywood-skm-e9a-5.webp']::text[];
-- R10: no official photo yet; remove dead www.skywood.co.tz links so the store shows its placeholder.
UPDATE "Product" SET images = '{}'::text[], "updatedAt" = now()
 WHERE id = 'skywood-r10' AND "brandKey" = 'skywood' AND cardinality(images) > 0 AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE u !~* '^https?://(www\.)?skywood\.co\.tz/');
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-sk-g05-1.webp', '/img/products/skywood/skywood-sk-g05-2.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sk-g05' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-sk-g05-1.webp', '/img/products/skywood/skywood-sk-g05-2.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-multi-purpose-blender-p5a-1.webp', '/img/products/skywood/skywood-multi-purpose-blender-p5a-2.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-multi-purpose-blender-p5a' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-multi-purpose-blender-p5a-1.webp', '/img/products/skywood/skywood-multi-purpose-blender-p5a-2.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-sk-20s03-1.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sk-20s03' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-sk-20s03-1.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-lc38-black-1.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-lc38-black' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-lc38-black-1.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-tf4201trl-1.webp', '/img/products/skywood/skywood-tf4201trl-2.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-tf4201trl' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-tf4201trl-1.webp', '/img/products/skywood/skywood-tf4201trl-2.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-ctf4203-black-1.webp', '/img/products/skywood/skywood-ctf4203-black-2.webp', '/img/products/skywood/skywood-ctf4203-black-3.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-ctf4203-black' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-ctf4203-black-1.webp', '/img/products/skywood/skywood-ctf4203-black-2.webp', '/img/products/skywood/skywood-ctf4203-black-3.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-af4204-1.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-af4204' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-af4204-1.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-ac2401-1.webp', '/img/products/skywood/skywood-ac2401-2.webp', '/img/products/skywood/skywood-ac2401-3.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-ac2401' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-ac2401-1.webp', '/img/products/skywood/skywood-ac2401-2.webp', '/img/products/skywood/skywood-ac2401-3.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-csdc-12k-1.webp', '/img/products/skywood/skywood-csdc-12k-2.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-csdc-12k' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-csdc-12k-1.webp', '/img/products/skywood/skywood-csdc-12k-2.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-csdc-18k-1.webp', '/img/products/skywood/skywood-csdc-18k-2.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-csdc-18k' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-csdc-18k-1.webp', '/img/products/skywood/skywood-csdc-18k-2.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-csc-09k-1.webp', '/img/products/skywood/skywood-csc-09k-2.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-csc-09k' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-csc-09k-1.webp', '/img/products/skywood/skywood-csc-09k-2.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-csc-12k-1.webp', '/img/products/skywood/skywood-csc-12k-2.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-csc-12k' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-csc-12k-1.webp', '/img/products/skywood/skywood-csc-12k-2.webp']::text[];
UPDATE "Product" SET images = ARRAY['/img/products/skywood/skywood-xqb100-1729az-1.webp']::text[], "updatedAt" = now()
 WHERE id = 'skywood-xqb100-1729az' AND "brandKey" = 'skywood' AND NOT EXISTS (SELECT 1 FROM unnest(images) u WHERE NOT (btrim(u) = '' OR u ~* '^https?://(www\.)?skywood\.co\.tz/' OR u = '/img/products/skywood-sk6031ges-cooker.webp')) AND images IS DISTINCT FROM ARRAY['/img/products/skywood/skywood-xqb100-1729az-1.webp']::text[];

-- 2. Features from the client spec sheets (only where still the original text) --
UPDATE "Product" SET features = ARRAY['320L total no-frost', 'Electronic temperature control', 'External LED display', 'Super freeze and child lock']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-32-0bi' AND "brandKey" = 'skywood' AND features = ARRAY['Total no-frost', 'Electronic control', 'External LED display']::text[];
UPDATE "Product" SET features = ARRAY['423L total no-frost', 'Kitchen fit, perfect slot-in', 'Triple inverter system', 'Fresh/frozen convertible zone']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-50-5bi' AND "brandKey" = 'skywood' AND features = ARRAY['Total no-frost', 'Kitchen fit', 'Slot-in design']::text[];
UPDATE "Product" SET features = ARRAY['247L total no-frost', 'Water dispenser', 'Electronic temperature control', 'Reversible door']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-24-6bi' AND "brandKey" = 'skywood' AND features = ARRAY['Total no-frost', 'Water dispenser', 'Electronic control']::text[];
UPDATE "Product" SET features = ARRAY['151L (131L fridge, 20L chiller)', 'Semi-automatic defrost', 'Tempered glass shelves', 'Large crisper drawer']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-17-3bg' AND "brandKey" = 'skywood' AND features = ARRAY['Semi-auto defrost', 'Interior LED', 'Tempered glass shelves']::text[];
UPDATE "Product" SET features = ARRAY['138L (93L fridge, 45L freezer)', 'Mechanical temperature control', 'Crystal crisper drawer', 'Reversible door']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-13-8' AND "brandKey" = 'skywood' AND features = ARRAY['Mechanical control', 'Interior LED', 'Glass shelves']::text[];
UPDATE "Product" SET features = ARRAY['246L net capacity', 'Electronic control, LED display', 'Front water drain', 'Super freezing function']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-25-0cf' AND "brandKey" = 'skywood' AND features = ARRAY['LED display control', 'Front water drain', 'Super freezing']::text[];
UPDATE "Product" SET features = ARRAY['70L capacity', '9 functions, digital control', 'Rotisserie and convection fan', 'Double glass door']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sky-em19a01' AND "brandKey" = 'skywood' AND features = ARRAY['70L capacity', '11 functions', 'Air fry and defrost']::text[];
UPDATE "Product" SET features = ARRAY['30L digital with grill', '950W microwave output', '5 power levels, 60 min timer', 'Black housing']::text[], "updatedAt" = now()
 WHERE id = 'skywood-skm-e9a' AND "brandKey" = 'skywood' AND features = ARRAY['30L digital', 'Grill function', '950W output']::text[];
UPDATE "Product" SET features = ARRAY['90cm 8mm tempered glass top', 'Copper and alu burners', 'Cast-iron pan supports', 'AC ignition, safety device']::text[], "updatedAt" = now()
 WHERE id = 'skywood-sk-g05' AND "brandKey" = 'skywood' AND features = ARRAY['AC ignition', 'Copper and alu burners', 'Safety knobs']::text[];
UPDATE "Product" SET features = ARRAY['Hot 420W, 0.8L hot tank', 'Compressor cooling 100W', 'Tabletop loading', 'Hot, cold and room water']::text[], "updatedAt" = now()
 WHERE id = 'skywood-lc38-black' AND "brandKey" = 'skywood' AND features = ARRAY['Hot 420W', 'Compressor cooling', 'Tabletop loading']::text[];

-- 3. New Skywood products ------------------------------------------------------
-- New models are added as hidden drafts (price 0) by docs/sql/skywood-drafts.sql and by the deploy-time sync.

-- 4. Category tiles ------------------------------------------------------------
UPDATE "Category" SET img = '/img/products/skywood/skywood-b-09-1.webp' WHERE id = 'skywood-music' AND (btrim(img) = '' OR img ~* '^https?://(www\.)?skywood\.co\.tz/' OR img = '/img/products/skywood-sk6031ges-cooker.webp') AND img IS DISTINCT FROM '/img/products/skywood/skywood-b-09-1.webp';
UPDATE "Category" SET img = '/img/products/skywood/skywood-sky-24-6bi-1.webp' WHERE id = 'skywood-fridges' AND (btrim(img) = '' OR img ~* '^https?://(www\.)?skywood\.co\.tz/' OR img = '/img/products/skywood-sk6031ges-cooker.webp') AND img IS DISTINCT FROM '/img/products/skywood/skywood-sky-24-6bi-1.webp';
UPDATE "Category" SET img = '/img/products/skywood/skywood-sk6031ges-1.webp' WHERE id = 'skywood-kitchen' AND (btrim(img) = '' OR img ~* '^https?://(www\.)?skywood\.co\.tz/' OR img = '/img/products/skywood-sk6031ges-cooker.webp') AND img IS DISTINCT FROM '/img/products/skywood/skywood-sk6031ges-1.webp';
UPDATE "Category" SET img = '/img/products/skywood/skywood-tf4201trl-1.webp' WHERE id = 'skywood-fans' AND (btrim(img) = '' OR img ~* '^https?://(www\.)?skywood\.co\.tz/' OR img = '/img/products/skywood-sk6031ges-cooker.webp') AND img IS DISTINCT FROM '/img/products/skywood/skywood-tf4201trl-1.webp';
UPDATE "Category" SET img = '/img/products/skywood/skywood-csdc-12k-1.webp' WHERE id = 'skywood-ac' AND (btrim(img) = '' OR img ~* '^https?://(www\.)?skywood\.co\.tz/' OR img = '/img/products/skywood-sk6031ges-cooker.webp') AND img IS DISTINCT FROM '/img/products/skywood/skywood-csdc-12k-1.webp';
UPDATE "Category" SET img = '/img/products/skywood/skywood-xqb100-1729az-1.webp' WHERE id = 'skywood-washing' AND (btrim(img) = '' OR img ~* '^https?://(www\.)?skywood\.co\.tz/' OR img = '/img/products/skywood-sk6031ges-cooker.webp') AND img IS DISTINCT FROM '/img/products/skywood/skywood-xqb100-1729az-1.webp';

-- 5. Brand hero image ----------------------------------------------------------
UPDATE "Brand" SET "heroImg" = '/img/products/skywood/skywood-sky-50-5bi-2.webp' WHERE key = 'skywood' AND (btrim("heroImg") = '' OR "heroImg" ~* '^https?://(www\.)?skywood\.co\.tz/' OR "heroImg" = '/img/products/skywood-sk6031ges-cooker.webp') AND "heroImg" IS DISTINCT FROM '/img/products/skywood/skywood-sky-50-5bi-2.webp';

COMMIT;
