-- Skywood draft products: 60 models from the client's photo and spec pack (2026-11).
-- Generated from handoff/design/brand-data.js. Same rules as the deploy-time sync (seed.ts --tokens):
--   * every draft is created HIDDEN with price 0 and stock 0, so it never shows in the store;
--   * existing products are never changed (ON CONFLICT DO NOTHING), a draft is skipped when Skywood already
--     has a product with the same model, and a draft created once before (audit log) is not created again;
--   * sub-categories are only added, never removed or renamed.
-- Safe to run more than once, in one transaction. Run it AFTER the new site is deployed (the photos ship with
-- the site in apps/web/public/img/products/skywood/), or skip it: every deploy runs the same sync.
-- Staff then set the price and stock in Admin > Products > "Drafts — needs price" and press Publish.

BEGIN;

-- 1. Sub-categories used by the drafts -----------------------------------------
UPDATE "Category" SET subs = array_append(subs, 'Subwoofers') WHERE id = 'skywood-music' AND NOT ('Subwoofers' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Soundbars') WHERE id = 'skywood-music' AND NOT ('Soundbars' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Rechargeable speakers') WHERE id = 'skywood-music' AND NOT ('Rechargeable speakers' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Party speakers') WHERE id = 'skywood-music' AND NOT ('Party speakers' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Boombox') WHERE id = 'skywood-music' AND NOT ('Boombox' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Top mount') WHERE id = 'skywood-fridges' AND NOT ('Top mount' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Single door') WHERE id = 'skywood-fridges' AND NOT ('Single door' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Multi-door') WHERE id = 'skywood-fridges' AND NOT ('Multi-door' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'French style') WHERE id = 'skywood-fridges' AND NOT ('French style' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Combi') WHERE id = 'skywood-fridges' AND NOT ('Combi' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Side by side') WHERE id = 'skywood-fridges' AND NOT ('Side by side' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Chest freezers') WHERE id = 'skywood-fridges' AND NOT ('Chest freezers' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Standing cookers') WHERE id = 'skywood-kitchen' AND NOT ('Standing cookers' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Built-in ovens') WHERE id = 'skywood-kitchen' AND NOT ('Built-in ovens' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Microwaves') WHERE id = 'skywood-kitchen' AND NOT ('Microwaves' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Range hoods') WHERE id = 'skywood-kitchen' AND NOT ('Range hoods' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Built-in hobs') WHERE id = 'skywood-kitchen' AND NOT ('Built-in hobs' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Blenders') WHERE id = 'skywood-kitchen' AND NOT ('Blenders' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Electric kettles') WHERE id = 'skywood-kitchen' AND NOT ('Electric kettles' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Water dispensers') WHERE id = 'skywood-kitchen' AND NOT ('Water dispensers' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Tower fans') WHERE id = 'skywood-fans' AND NOT ('Tower fans' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Cooling tower fans') WHERE id = 'skywood-fans' AND NOT ('Cooling tower fans' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Air purifier fans') WHERE id = 'skywood-fans' AND NOT ('Air purifier fans' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Air coolers') WHERE id = 'skywood-fans' AND NOT ('Air coolers' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Inverter') WHERE id = 'skywood-ac' AND NOT ('Inverter' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'On/off') WHERE id = 'skywood-ac' AND NOT ('On/off' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Top load') WHERE id = 'skywood-washing' AND NOT ('Top load' = ANY(subs));
UPDATE "Category" SET subs = array_append(subs, 'Front load') WHERE id = 'skywood-washing' AND NOT ('Front load' = ANY(subs));

-- 2. Draft products (hidden, price 0, stock 0) with their AI index text and an audit entry ----
-- SKY-10-8: Combi Refrigerator 108L (3 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sky-10-8', 'skywood', 'skywood-fridges', 'Combi', 'SKY-10-8', 'Combi Refrigerator 108L', 0, 0, ARRAY['108L (72L fridge, 36L freezer)', 'Mechanical temperature control', 'Tempered glass shelves', 'Reversible door']::text[], 'Combi refrigerator with a 72 L fridge and a 36 L freezer. Mechanical temperature control, tempered glass shelves, crystal crisper and freezer drawers, reversible door. Inox (SKY-10-8I) and silver (SKY-10-8S).', '[{"label":"Total net capacity","value":"108 L"},{"label":"Net fridge capacity","value":"72 L"},{"label":"Net freezer capacity","value":"36 L"},{"label":"Energy class","value":"F, E"},{"label":"Dimensions (W × D × H)","value":"48 × 49 × 113 cm"},{"label":"Control","value":"Mechanical"},{"label":"Interior light","value":"LED (optional)"},{"label":"Colours","value":"Inox (SKY-10-8I), silver (SKY-10-8S)"}]'::jsonb, ARRAY['/img/products/skywood/skywood-sky-10-8-1.webp', '/img/products/skywood/skywood-sky-10-8-2.webp', '/img/products/skywood/skywood-sky-10-8-3.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-fridges')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SKY-10-8'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sky-10-8')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SKY-10-8 | Combi Refrigerator 108L | Combi | Refrigerators and Freezers | 108L (72L fridge, 36L freezer) | Mechanical temperature control | Tempered glass shelves | Reversible door | Combi refrigerator with a 72 L fridge and a 36 L freezer. Mechanical temperature control, tempered glass shelves, crystal crisper and freezer drawers, reversible door. Inox (SKY-10-8I) and silver (SKY-10-8S). | Total net capacity: 108 L | Net fridge capacity: 72 L | Net freezer capacity: 36 L | Energy class: F, E | Dimensions (W × D × H): 48 × 49 × 113 cm | Control: Mechanical | Interior light: LED (optional) | Colours: Inox (SKY-10-8I), silver (SKY-10-8S)', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SKY-10-8","hidden":true,"price":0,"photos":3}'::jsonb, now() FROM ins;
-- SKY-12-5: Top Mount Refrigerator 125L (4 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sky-12-5', 'skywood', 'skywood-fridges', 'Top mount', 'SKY-12-5', 'Top Mount Refrigerator 125L', 0, 0, ARRAY['125L (92L fridge, 33L freezer)', 'Mechanical temperature control', 'Crystal crisper drawer', 'Reversible door']::text[], 'Top mount refrigerator with a 92 L fridge and a 33 L freezer. Mechanical temperature control, crystal crisper drawer and door balconies, reversible door. Inox (SKY-12-5I), silver (SKY-12-5S) and white (SKY-12-5W).', '[{"label":"Total net capacity","value":"125 L"},{"label":"Net fridge capacity","value":"92 L"},{"label":"Net freezer capacity","value":"33 L"},{"label":"Energy class","value":"F"},{"label":"Dimensions (W × D × H)","value":"48 × 51 × 112 cm"},{"label":"Control","value":"Mechanical"},{"label":"Shelves","value":"Glass and wire (optional)"},{"label":"Colours","value":"Inox (SKY-12-5I), silver (SKY-12-5S), white (SKY-12-5W)"}]'::jsonb, ARRAY['/img/products/skywood/skywood-sky-12-5-1.webp', '/img/products/skywood/skywood-sky-12-5-2.webp', '/img/products/skywood/skywood-sky-12-5-3.webp', '/img/products/skywood/skywood-sky-12-5-4.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-fridges')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SKY-12-5'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sky-12-5')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SKY-12-5 | Top Mount Refrigerator 125L | Top mount | Refrigerators and Freezers | 125L (92L fridge, 33L freezer) | Mechanical temperature control | Crystal crisper drawer | Reversible door | Top mount refrigerator with a 92 L fridge and a 33 L freezer. Mechanical temperature control, crystal crisper drawer and door balconies, reversible door. Inox (SKY-12-5I), silver (SKY-12-5S) and white (SKY-12-5W). | Total net capacity: 125 L | Net fridge capacity: 92 L | Net freezer capacity: 33 L | Energy class: F | Dimensions (W × D × H): 48 × 51 × 112 cm | Control: Mechanical | Shelves: Glass and wire (optional) | Colours: Inox (SKY-12-5I), silver (SKY-12-5S), white (SKY-12-5W)', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SKY-12-5","hidden":true,"price":0,"photos":4}'::jsonb, now() FROM ins;
-- SKY-14-2: Combi Refrigerator (3 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sky-14-2', 'skywood', 'skywood-fridges', 'Combi', 'SKY-14-2', 'Combi Refrigerator', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-sky-14-2-1.webp', '/img/products/skywood/skywood-sky-14-2-2.webp', '/img/products/skywood/skywood-sky-14-2-3.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-fridges')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SKY-14-2'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sky-14-2')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SKY-14-2 | Combi Refrigerator | Combi | Refrigerators and Freezers', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SKY-14-2","hidden":true,"price":0,"photos":3}'::jsonb, now() FROM ins;
-- SKY-177-BIWD: Single Door Refrigerator with Water Dispenser (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sky-177-biwd', 'skywood', 'skywood-fridges', 'Single door', 'SKY-177-BIWD', 'Single Door Refrigerator with Water Dispenser', 0, 0, ARRAY['170L (150L fridge, 20L chiller)', 'Water dispenser', 'Semi-automatic defrost', 'Tempered glass shelves']::text[], 'Single door refrigerator with a 150 L fridge, a 20 L chiller and a water dispenser. Semi-automatic defrost, tempered glass shelves and a large crisper drawer.', '[{"label":"Total net capacity","value":"170 L"},{"label":"Net fridge capacity","value":"150 L"},{"label":"Net chiller capacity","value":"20 L"},{"label":"Dimensions (W × D × H)","value":"50 × 50 × 127 cm"},{"label":"Water dispenser","value":"Yes"},{"label":"Defrost","value":"Semi-automatic"},{"label":"Handle","value":"Recessed or external (optional)"}]'::jsonb, ARRAY['/img/products/skywood/skywood-sky-177-biwd-1.webp', '/img/products/skywood/skywood-sky-177-biwd-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-fridges')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SKY-177-BIWD'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sky-177-biwd')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SKY-177-BIWD | Single Door Refrigerator with Water Dispenser | Single door | Refrigerators and Freezers | 170L (150L fridge, 20L chiller) | Water dispenser | Semi-automatic defrost | Tempered glass shelves | Single door refrigerator with a 150 L fridge, a 20 L chiller and a water dispenser. Semi-automatic defrost, tempered glass shelves and a large crisper drawer. | Total net capacity: 170 L | Net fridge capacity: 150 L | Net chiller capacity: 20 L | Dimensions (W × D × H): 50 × 50 × 127 cm | Water dispenser: Yes | Defrost: Semi-automatic | Handle: Recessed or external (optional)', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SKY-177-BIWD","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- SKY-24-6WD: Combi Refrigerator with Water Dispenser (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sky-24-6wd', 'skywood', 'skywood-fridges', 'Combi', 'SKY-24-6WD', 'Combi Refrigerator with Water Dispenser', 0, 0, ARRAY['248L (138L fridge, 110L freezer)', 'Water dispenser', 'Electronic temperature control', 'Reversible door']::text[], 'Combi refrigerator (defrost) with a 138 L fridge, a 110 L freezer and a water dispenser. Electronic temperature control, interior LED light, tempered glass shelves, crystal crisper and freezer drawers, reversible door.', '[{"label":"Total net capacity","value":"248 L"},{"label":"Net fridge capacity","value":"138 L"},{"label":"Net freezer capacity","value":"110 L"},{"label":"Energy class","value":"F, E"},{"label":"Dimensions (W × D × H)","value":"55 × 57 × 172 cm"},{"label":"Water dispenser","value":"Yes"},{"label":"Control","value":"Electronic"},{"label":"Colour","value":"Black inox"}]'::jsonb, ARRAY['/img/products/skywood/skywood-sky-24-6wd-1.webp', '/img/products/skywood/skywood-sky-24-6wd-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-fridges')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SKY-24-6WD'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sky-24-6wd')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SKY-24-6WD | Combi Refrigerator with Water Dispenser | Combi | Refrigerators and Freezers | 248L (138L fridge, 110L freezer) | Water dispenser | Electronic temperature control | Reversible door | Combi refrigerator (defrost) with a 138 L fridge, a 110 L freezer and a water dispenser. Electronic temperature control, interior LED light, tempered glass shelves, crystal crisper and freezer drawers, reversible door. | Total net capacity: 248 L | Net fridge capacity: 138 L | Net freezer capacity: 110 L | Energy class: F, E | Dimensions (W × D × H): 55 × 57 × 172 cm | Water dispenser: Yes | Control: Electronic | Colour: Black inox', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SKY-24-6WD","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- SKY-43-9WD: Side by Side Refrigerator (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sky-43-9wd', 'skywood', 'skywood-fridges', 'Side by side', 'SKY-43-9WD', 'Side by Side Refrigerator', 0, 0, ARRAY['439L total no-frost', 'Soft touch digital display', 'Super freeze and holiday functions', 'Child lock, door open alarm']::text[], 'Total no-frost side by side refrigerator: 288 L fridge and 148 + 3 L freezer. External soft touch digital display, interior LED lights, super freeze, holiday and child lock functions, door open alarm and DC centrifugal fan.', '[{"label":"Total net capacity","value":"439 L"},{"label":"Net fridge capacity","value":"288 L"},{"label":"Net freezer capacity","value":"148 + 3 L"},{"label":"Energy class","value":"F, E, D"},{"label":"Dimensions (W × D × H)","value":"91 × 59 (without handle) × 177 cm"},{"label":"Cooling","value":"Total no-frost"},{"label":"Display","value":"External soft touch digital"},{"label":"Colour","value":"Black inox"}]'::jsonb, ARRAY['/img/products/skywood/skywood-sky-43-9wd-1.webp', '/img/products/skywood/skywood-sky-43-9wd-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-fridges')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SKY-43-9WD'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sky-43-9wd')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SKY-43-9WD | Side by Side Refrigerator | Side by side | Refrigerators and Freezers | 439L total no-frost | Soft touch digital display | Super freeze and holiday functions | Child lock, door open alarm | Total no-frost side by side refrigerator: 288 L fridge and 148 + 3 L freezer. External soft touch digital display, interior LED lights, super freeze, holiday and child lock functions, door open alarm and DC centrifugal fan. | Total net capacity: 439 L | Net fridge capacity: 288 L | Net freezer capacity: 148 + 3 L | Energy class: F, E, D | Dimensions (W × D × H): 91 × 59 (without handle) × 177 cm | Cooling: Total no-frost | Display: External soft touch digital | Colour: Black inox', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SKY-43-9WD","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- SKY-10-0CF: Chest Freezer 98L (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sky-10-0cf', 'skywood', 'skywood-fridges', 'Chest freezers', 'SKY-10-0CF', 'Chest Freezer 98L', 0, 0, ARRAY['98L net capacity', 'Electronic control, LED display', 'Front water drain', 'Super freezing function']::text[], 'Chest freezer with 98 L net capacity, electronic temperature control with LED display, front water drain, super freezing and compressor switch-off functions.', '[{"label":"Net freezer capacity","value":"98 L"},{"label":"Energy class","value":"F, E"},{"label":"Dimensions (W × D × H)","value":"55 × 48 × 85 cm"},{"label":"Control","value":"Electronic temperature control with LED display"},{"label":"Functions","value":"Super freezing, compressor switch-off"},{"label":"Drain","value":"Front water disposal device"}]'::jsonb, ARRAY['/img/products/skywood/skywood-sky-10-0cf-1.webp', '/img/products/skywood/skywood-sky-10-0cf-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-fridges')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SKY-10-0CF'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sky-10-0cf')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SKY-10-0CF | Chest Freezer 98L | Chest freezers | Refrigerators and Freezers | 98L net capacity | Electronic control, LED display | Front water drain | Super freezing function | Chest freezer with 98 L net capacity, electronic temperature control with LED display, front water drain, super freezing and compressor switch-off functions. | Net freezer capacity: 98 L | Energy class: F, E | Dimensions (W × D × H): 55 × 48 × 85 cm | Control: Electronic temperature control with LED display | Functions: Super freezing, compressor switch-off | Drain: Front water disposal device', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SKY-10-0CF","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- SKY-15-0CF: Chest Freezer 142L (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sky-15-0cf', 'skywood', 'skywood-fridges', 'Chest freezers', 'SKY-15-0CF', 'Chest Freezer 142L', 0, 0, ARRAY['142L net capacity', 'Electronic control, LED display', 'Front water drain', 'Super freezing function']::text[], 'Chest freezer with 142 L net capacity, electronic temperature control with LED display, front water drain, super freezing and compressor switch-off functions.', '[{"label":"Net freezer capacity","value":"142 L"},{"label":"Energy class","value":"F, E, D"},{"label":"Dimensions (W × D × H)","value":"71 × 55 × 85 cm"},{"label":"Control","value":"Electronic temperature control with LED display"},{"label":"Functions","value":"Super freezing, compressor switch-off"},{"label":"Drain","value":"Front water disposal device"}]'::jsonb, ARRAY['/img/products/skywood/skywood-sky-15-0cf-1.webp', '/img/products/skywood/skywood-sky-15-0cf-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-fridges')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SKY-15-0CF'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sky-15-0cf')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SKY-15-0CF | Chest Freezer 142L | Chest freezers | Refrigerators and Freezers | 142L net capacity | Electronic control, LED display | Front water drain | Super freezing function | Chest freezer with 142 L net capacity, electronic temperature control with LED display, front water drain, super freezing and compressor switch-off functions. | Net freezer capacity: 142 L | Energy class: F, E, D | Dimensions (W × D × H): 71 × 55 × 85 cm | Control: Electronic temperature control with LED display | Functions: Super freezing, compressor switch-off | Drain: Front water disposal device', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SKY-15-0CF","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- SKY-20-0CF: Chest Freezer 198L (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sky-20-0cf', 'skywood', 'skywood-fridges', 'Chest freezers', 'SKY-20-0CF', 'Chest Freezer 198L', 0, 0, ARRAY['198L net capacity', 'Electronic control, LED display', 'Front water drain', 'Super freezing function']::text[], 'Chest freezer with 198 L net capacity, electronic temperature control with LED display, front water drain, super freezing and compressor switch-off functions.', '[{"label":"Net freezer capacity","value":"198 L"},{"label":"Energy class","value":"F, E"},{"label":"Dimensions (W × D × H)","value":"91 × 55 × 85 cm"},{"label":"Control","value":"Electronic temperature control with LED display"},{"label":"Functions","value":"Super freezing, compressor switch-off"},{"label":"Drain","value":"Front water disposal device"}]'::jsonb, ARRAY['/img/products/skywood/skywood-sky-20-0cf-1.webp', '/img/products/skywood/skywood-sky-20-0cf-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-fridges')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SKY-20-0CF'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sky-20-0cf')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SKY-20-0CF | Chest Freezer 198L | Chest freezers | Refrigerators and Freezers | 198L net capacity | Electronic control, LED display | Front water drain | Super freezing function | Chest freezer with 198 L net capacity, electronic temperature control with LED display, front water drain, super freezing and compressor switch-off functions. | Net freezer capacity: 198 L | Energy class: F, E | Dimensions (W × D × H): 91 × 55 × 85 cm | Control: Electronic temperature control with LED display | Functions: Super freezing, compressor switch-off | Drain: Front water disposal device', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SKY-20-0CF","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- ED25A01: 70L Built-in Oven, 10 Functions (5 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-ed25a01', 'skywood', 'skywood-kitchen', 'Built-in ovens', 'ED25A01', '70L Built-in Oven, 10 Functions', 0, 0, ARRAY['70L capacity', '10 functions, digital control', 'Rotisserie and convection fan', 'Double glass door']::text[], '70 L built-in electric oven with 10 functions and digital control. Upper and lower elements with thermostat, rotisserie, convection fan and lamp, one grid and one tray, black tempered glass panel and double glass door.', '[{"label":"Capacity","value":"70 L"},{"label":"Functions","value":"10"},{"label":"Control","value":"Digital"},{"label":"Heating","value":"Upper and lower electric elements, thermostat"},{"label":"Extras","value":"Rotisserie, convection fan, 1 × 25 W lamp"},{"label":"Accessories","value":"One grid, one tray"},{"label":"Door","value":"Double glass, removable inner glass"},{"label":"Panel","value":"Black tempered glass"},{"label":"Handle","value":"Aluminium"},{"label":"Product size","value":"595 × 547 × 595 mm"}]'::jsonb, ARRAY['/img/products/skywood/skywood-ed25a01-1.webp', '/img/products/skywood/skywood-ed25a01-2.webp', '/img/products/skywood/skywood-ed25a01-3.webp', '/img/products/skywood/skywood-ed25a01-4.webp', '/img/products/skywood/skywood-ed25a01-5.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('ED25A01'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-ed25a01')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'ED25A01 | 70L Built-in Oven, 10 Functions | Built-in ovens | Kitchen Appliances | 70L capacity | 10 functions, digital control | Rotisserie and convection fan | Double glass door | 70 L built-in electric oven with 10 functions and digital control. Upper and lower elements with thermostat, rotisserie, convection fan and lamp, one grid and one tray, black tempered glass panel and double glass door. | Capacity: 70 L | Functions: 10 | Control: Digital | Heating: Upper and lower electric elements, thermostat | Extras: Rotisserie, convection fan, 1 × 25 W lamp | Accessories: One grid, one tray | Door: Double glass, removable inner glass | Panel: Black tempered glass | Handle: Aluminium | Product size: 595 × 547 × 595 mm', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"ED25A01","hidden":true,"price":0,"photos":5}'::jsonb, now() FROM ins;
-- EM04A05: 70L Built-in Oven with Basket, 10 Functions (5 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-em04a05', 'skywood', 'skywood-kitchen', 'Built-in ovens', 'EM04A05', '70L Built-in Oven with Basket, 10 Functions', 0, 0, ARRAY['70L capacity', '10 functions, digital control', 'Rotisserie and convection fan', 'Double glass door']::text[], '70 L built-in electric oven with 10 functions and digital control. Upper and lower elements with thermostat, rotisserie, convection fan and lamp, one grid, one tray and a basket, black tempered glass panel and double glass door.', '[{"label":"Capacity","value":"70 L"},{"label":"Functions","value":"10"},{"label":"Control","value":"Digital"},{"label":"Heating","value":"Upper and lower electric elements, thermostat"},{"label":"Extras","value":"Rotisserie, convection fan, 1 × 25 W lamp"},{"label":"Accessories","value":"One grid, one tray, basket"},{"label":"Door","value":"Double glass, removable inner glass"},{"label":"Panel","value":"Black tempered glass"},{"label":"Handle","value":"Aluminium"},{"label":"Product size","value":"595 × 547 × 595 mm"}]'::jsonb, ARRAY['/img/products/skywood/skywood-em04a05-1.webp', '/img/products/skywood/skywood-em04a05-2.webp', '/img/products/skywood/skywood-em04a05-3.webp', '/img/products/skywood/skywood-em04a05-4.webp', '/img/products/skywood/skywood-em04a05-5.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('EM04A05'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-em04a05')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'EM04A05 | 70L Built-in Oven with Basket, 10 Functions | Built-in ovens | Kitchen Appliances | 70L capacity | 10 functions, digital control | Rotisserie and convection fan | Double glass door | 70 L built-in electric oven with 10 functions and digital control. Upper and lower elements with thermostat, rotisserie, convection fan and lamp, one grid, one tray and a basket, black tempered glass panel and double glass door. | Capacity: 70 L | Functions: 10 | Control: Digital | Heating: Upper and lower electric elements, thermostat | Extras: Rotisserie, convection fan, 1 × 25 W lamp | Accessories: One grid, one tray, basket | Door: Double glass, removable inner glass | Panel: Black tempered glass | Handle: Aluminium | Product size: 595 × 547 × 595 mm', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"EM04A05","hidden":true,"price":0,"photos":5}'::jsonb, now() FROM ins;
-- EM10A02: 70L Built-in Oven, Mechanical Control (5 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-em10a02', 'skywood', 'skywood-kitchen', 'Built-in ovens', 'EM10A02', '70L Built-in Oven, Mechanical Control', 0, 0, ARRAY['70L capacity', '9 functions, 120 min timer', 'Rotisserie and convection fan', 'Double glass door']::text[], '70 L built-in electric oven with 9 functions, mechanical control and a 120-minute timer. Black tempered glass panel with mirror design, rotisserie, convection fan and lamp, one grid, one tray and a basket.', '[{"label":"Capacity","value":"70 L"},{"label":"Functions","value":"9"},{"label":"Control","value":"Mechanical, 120 min timer"},{"label":"Heating","value":"Upper and lower electric elements, thermostat"},{"label":"Extras","value":"Rotisserie, convection fan, 1 × 25 W lamp"},{"label":"Accessories","value":"One grid, one tray, basket"},{"label":"Door","value":"Double glass, removable inner glass"},{"label":"Panel","value":"Black tempered glass"},{"label":"Handle","value":"Aluminium"},{"label":"Product size","value":"595 × 547 × 595 mm"}]'::jsonb, ARRAY['/img/products/skywood/skywood-em10a02-1.webp', '/img/products/skywood/skywood-em10a02-2.webp', '/img/products/skywood/skywood-em10a02-3.webp', '/img/products/skywood/skywood-em10a02-4.webp', '/img/products/skywood/skywood-em10a02-5.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('EM10A02'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-em10a02')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'EM10A02 | 70L Built-in Oven, Mechanical Control | Built-in ovens | Kitchen Appliances | 70L capacity | 9 functions, 120 min timer | Rotisserie and convection fan | Double glass door | 70 L built-in electric oven with 9 functions, mechanical control and a 120-minute timer. Black tempered glass panel with mirror design, rotisserie, convection fan and lamp, one grid, one tray and a basket. | Capacity: 70 L | Functions: 9 | Control: Mechanical, 120 min timer | Heating: Upper and lower electric elements, thermostat | Extras: Rotisserie, convection fan, 1 × 25 W lamp | Accessories: One grid, one tray, basket | Door: Double glass, removable inner glass | Panel: Black tempered glass | Handle: Aluminium | Product size: 595 × 547 × 595 mm', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"EM10A02","hidden":true,"price":0,"photos":5}'::jsonb, now() FROM ins;
-- EM10A04: 70L Built-in Oven, Digital Timer (5 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-em10a04', 'skywood', 'skywood-kitchen', 'Built-in ovens', 'EM10A04', '70L Built-in Oven, Digital Timer', 0, 0, ARRAY['70L capacity', '9 functions, 2 knobs and digital timer', 'Rotisserie and convection fan', 'Double glass door']::text[], '70 L built-in electric oven with 9 functions, 2 knobs and a digital timer. Upper and lower elements with thermostat, rotisserie, convection fan and lamp, one grid, one tray and a basket, double glass door.', '[{"label":"Capacity","value":"70 L"},{"label":"Functions","value":"9"},{"label":"Control","value":"2 knobs and digital timer"},{"label":"Heating","value":"Upper and lower electric elements, thermostat"},{"label":"Extras","value":"Rotisserie, convection fan, 1 × 25 W lamp"},{"label":"Accessories","value":"One grid, one tray, basket"},{"label":"Door","value":"Double glass, removable inner glass"},{"label":"Panel","value":"Black tempered glass"},{"label":"Handle","value":"Aluminium"},{"label":"Product size","value":"595 × 547 × 595 mm"}]'::jsonb, ARRAY['/img/products/skywood/skywood-em10a04-1.webp', '/img/products/skywood/skywood-em10a04-2.webp', '/img/products/skywood/skywood-em10a04-3.webp', '/img/products/skywood/skywood-em10a04-4.webp', '/img/products/skywood/skywood-em10a04-5.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('EM10A04'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-em10a04')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'EM10A04 | 70L Built-in Oven, Digital Timer | Built-in ovens | Kitchen Appliances | 70L capacity | 9 functions, 2 knobs and digital timer | Rotisserie and convection fan | Double glass door | 70 L built-in electric oven with 9 functions, 2 knobs and a digital timer. Upper and lower elements with thermostat, rotisserie, convection fan and lamp, one grid, one tray and a basket, double glass door. | Capacity: 70 L | Functions: 9 | Control: 2 knobs and digital timer | Heating: Upper and lower electric elements, thermostat | Extras: Rotisserie, convection fan, 1 × 25 W lamp | Accessories: One grid, one tray, basket | Door: Double glass, removable inner glass | Panel: Black tempered glass | Handle: Aluminium | Product size: 595 × 547 × 595 mm', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"EM10A04","hidden":true,"price":0,"photos":5}'::jsonb, now() FROM ins;
-- SK5031GEB: Standing Cooker with Oven (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk5031geb', 'skywood', 'skywood-kitchen', 'Standing cookers', 'SK5031GEB', 'Standing Cooker with Oven', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-sk5031geb-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK5031GEB'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk5031geb')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK5031GEB | Standing Cooker with Oven | Standing cookers | Kitchen Appliances', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK5031GEB","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- SK5031GES: Standing Cooker with Oven (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk5031ges', 'skywood', 'skywood-kitchen', 'Standing cookers', 'SK5031GES', 'Standing Cooker with Oven', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-sk5031ges-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK5031GES'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk5031ges')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK5031GES | Standing Cooker with Oven | Standing cookers | Kitchen Appliances', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK5031GES","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- SK6031GEB: Standing Cooker with Oven (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk6031geb', 'skywood', 'skywood-kitchen', 'Standing cookers', 'SK6031GEB', 'Standing Cooker with Oven', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-sk6031geb-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK6031GEB'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk6031geb')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK6031GEB | Standing Cooker with Oven | Standing cookers | Kitchen Appliances', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK6031GEB","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- SKM20-E70: 20L Microwave (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-skm20-e70', 'skywood', 'skywood-kitchen', 'Microwaves', 'SKM20-E70', '20L Microwave', 0, 0, ARRAY['20L mechanical control', '700W microwave output', '5 power levels, 35 min timer', 'White housing and cavity']::text[], '20 L microwave with mechanical control: 700 W output, 5 power levels, a 35-minute timer and a 245 mm glass turntable. White housing and white cavity.', '[{"label":"Capacity","value":"20 L"},{"label":"Control","value":"Mechanical"},{"label":"Microwave output","value":"700 W"},{"label":"Microwave input","value":"1100 W"},{"label":"Power levels","value":"5"},{"label":"Timer","value":"35 min"},{"label":"Turntable","value":"245 mm glass"},{"label":"Power supply","value":"230 V, 50 Hz"},{"label":"Plug","value":"BS"},{"label":"Colour","value":"White housing, white cavity"}]'::jsonb, ARRAY['/img/products/skywood/skywood-skm20-e70-1.webp', '/img/products/skywood/skywood-skm20-e70-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SKM20-E70'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-skm20-e70')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SKM20-E70 | 20L Microwave | Microwaves | Kitchen Appliances | 20L mechanical control | 700W microwave output | 5 power levels, 35 min timer | White housing and cavity | 20 L microwave with mechanical control: 700 W output, 5 power levels, a 35-minute timer and a 245 mm glass turntable. White housing and white cavity. | Capacity: 20 L | Control: Mechanical | Microwave output: 700 W | Microwave input: 1100 W | Power levels: 5 | Timer: 35 min | Turntable: 245 mm glass | Power supply: 230 V, 50 Hz | Plug: BS | Colour: White housing, white cavity', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SKM20-E70","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- SKM23-E80: 23L Grill Microwave (3 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-skm23-e80', 'skywood', 'skywood-kitchen', 'Microwaves', 'SKM23-E80', '23L Grill Microwave', 0, 0, ARRAY['23L digital with grill', '800W microwave output', '10 power levels, 99 min 99 s timer', 'Grey housing and cavity']::text[], '23 L digital microwave with grill: 800 W output, 10 power levels, a 99 min 99 s timer and a 285 mm glass turntable. Grey housing and grey cavity.', '[{"label":"Capacity","value":"23 L"},{"label":"Control","value":"Digital"},{"label":"Grill","value":"Yes"},{"label":"Microwave output","value":"800 W"},{"label":"Microwave input","value":"1280 W"},{"label":"Power levels","value":"10"},{"label":"Timer","value":"99 min 99 s"},{"label":"Turntable","value":"285 mm glass"},{"label":"Power supply","value":"230 V, 50 Hz"},{"label":"Plug","value":"BS"},{"label":"Colour","value":"Grey housing, grey cavity"}]'::jsonb, ARRAY['/img/products/skywood/skywood-skm23-e80-1.webp', '/img/products/skywood/skywood-skm23-e80-2.webp', '/img/products/skywood/skywood-skm23-e80-3.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SKM23-E80'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-skm23-e80')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SKM23-E80 | 23L Grill Microwave | Microwaves | Kitchen Appliances | 23L digital with grill | 800W microwave output | 10 power levels, 99 min 99 s timer | Grey housing and cavity | 23 L digital microwave with grill: 800 W output, 10 power levels, a 99 min 99 s timer and a 285 mm glass turntable. Grey housing and grey cavity. | Capacity: 23 L | Control: Digital | Grill: Yes | Microwave output: 800 W | Microwave input: 1280 W | Power levels: 10 | Timer: 99 min 99 s | Turntable: 285 mm glass | Power supply: 230 V, 50 Hz | Plug: BS | Colour: Grey housing, grey cavity', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SKM23-E80","hidden":true,"price":0,"photos":3}'::jsonb, now() FROM ins;
-- BIMWO-SKQ25N-E8I: 25L Built-in Grill Microwave (3 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-bimwo-skq25n-e8i', 'skywood', 'skywood-kitchen', 'Microwaves', 'BIMWO-SKQ25N-E8I', '25L Built-in Grill Microwave', 0, 0, ARRAY['25L built-in, digital', '850W microwave output, grill', '5 power levels, 60 min timer', '285mm glass turntable']::text[], '25 L digital built-in microwave with grill: 850 W output, 5 power levels, a 60-minute timer and a 285 mm glass turntable.', '[{"label":"Capacity","value":"25 L"},{"label":"Type","value":"Built-in"},{"label":"Control","value":"Digital"},{"label":"Grill","value":"Yes"},{"label":"Microwave output","value":"850 W"},{"label":"Microwave input","value":"1320 W"},{"label":"Power levels","value":"5"},{"label":"Timer","value":"60 min"},{"label":"Turntable","value":"285 mm glass"},{"label":"Power supply","value":"230 V, 50 Hz"},{"label":"Plug","value":"BS"}]'::jsonb, ARRAY['/img/products/skywood/skywood-bimwo-skq25n-e8i-1.webp', '/img/products/skywood/skywood-bimwo-skq25n-e8i-2.webp', '/img/products/skywood/skywood-bimwo-skq25n-e8i-3.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('BIMWO-SKQ25N-E8I'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-bimwo-skq25n-e8i')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'BIMWO-SKQ25N-E8I | 25L Built-in Grill Microwave | Microwaves | Kitchen Appliances | 25L built-in, digital | 850W microwave output, grill | 5 power levels, 60 min timer | 285mm glass turntable | 25 L digital built-in microwave with grill: 850 W output, 5 power levels, a 60-minute timer and a 285 mm glass turntable. | Capacity: 25 L | Type: Built-in | Control: Digital | Grill: Yes | Microwave output: 850 W | Microwave input: 1320 W | Power levels: 5 | Timer: 60 min | Turntable: 285 mm glass | Power supply: 230 V, 50 Hz | Plug: BS', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"BIMWO-SKQ25N-E8I","hidden":true,"price":0,"photos":3}'::jsonb, now() FROM ins;
-- BIMWO-SKI25N: 25L Built-in Grill Microwave, Stainless Cavity (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-bimwo-ski25n', 'skywood', 'skywood-kitchen', 'Microwaves', 'BIMWO-SKI25N', '25L Built-in Grill Microwave, Stainless Cavity', 0, 0, ARRAY['25L built-in, digital', '900W microwave output, grill', '5 power levels, 60 min timer', 'Stainless steel cavity']::text[], '25 L digital built-in microwave with grill: 900 W output, 5 power levels, a 60-minute timer and a 285 mm glass turntable. Black housing and stainless steel cavity.', '[{"label":"Capacity","value":"25 L"},{"label":"Type","value":"Built-in"},{"label":"Control","value":"Digital"},{"label":"Grill","value":"Yes"},{"label":"Microwave output","value":"900 W"},{"label":"Power levels","value":"5"},{"label":"Timer","value":"60 min"},{"label":"Turntable","value":"285 mm glass"},{"label":"Power supply","value":"230 V, 50 Hz"},{"label":"Plug","value":"BS"},{"label":"Colour","value":"Black housing, stainless steel cavity"}]'::jsonb, ARRAY['/img/products/skywood/skywood-bimwo-ski25n-1.webp', '/img/products/skywood/skywood-bimwo-ski25n-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('BIMWO-SKI25N'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-bimwo-ski25n')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'BIMWO-SKI25N | 25L Built-in Grill Microwave, Stainless Cavity | Microwaves | Kitchen Appliances | 25L built-in, digital | 900W microwave output, grill | 5 power levels, 60 min timer | Stainless steel cavity | 25 L digital built-in microwave with grill: 900 W output, 5 power levels, a 60-minute timer and a 285 mm glass turntable. Black housing and stainless steel cavity. | Capacity: 25 L | Type: Built-in | Control: Digital | Grill: Yes | Microwave output: 900 W | Power levels: 5 | Timer: 60 min | Turntable: 285 mm glass | Power supply: 230 V, 50 Hz | Plug: BS | Colour: Black housing, stainless steel cavity', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"BIMWO-SKI25N","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- SK-G01: Built-in Gas Hob with Hot Plate (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk-g01', 'skywood', 'skywood-kitchen', 'Built-in hobs', 'SK-G01', 'Built-in Gas Hob with Hot Plate', 0, 0, ARRAY['60cm 8mm tempered glass top', '1200W hot plate', 'Cast-iron pan supports', 'AC ignition, safety device']::text[], 'Built-in gas hob with an 8 mm tempered glass top (bevel edge), a 1200 W hot plate, heavy cast-iron pan supports, metal knobs, AC ignition and a safety device. 600 × 520 mm.', '[{"label":"Cooktop","value":"8 mm tempered glass, bevel edge"},{"label":"Bottom material","value":"0.7 mm"},{"label":"Hot plate","value":"1200 W"},{"label":"Pan supports","value":"Heavy cast iron"},{"label":"Ignition","value":"AC ignition"},{"label":"Knobs","value":"Metal"},{"label":"Safety device","value":"Yes"},{"label":"Size","value":"600 × 520 mm"}]'::jsonb, ARRAY['/img/products/skywood/skywood-sk-g01-1.webp', '/img/products/skywood/skywood-sk-g01-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK-G01'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk-g01')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK-G01 | Built-in Gas Hob with Hot Plate | Built-in hobs | Kitchen Appliances | 60cm 8mm tempered glass top | 1200W hot plate | Cast-iron pan supports | AC ignition, safety device | Built-in gas hob with an 8 mm tempered glass top (bevel edge), a 1200 W hot plate, heavy cast-iron pan supports, metal knobs, AC ignition and a safety device. 600 × 520 mm. | Cooktop: 8 mm tempered glass, bevel edge | Bottom material: 0.7 mm | Hot plate: 1200 W | Pan supports: Heavy cast iron | Ignition: AC ignition | Knobs: Metal | Safety device: Yes | Size: 600 × 520 mm', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK-G01","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- SK-G02: Built-in Gas Hob with Ceramic Burner (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk-g02', 'skywood', 'skywood-kitchen', 'Built-in hobs', 'SK-G02', 'Built-in Gas Hob with Ceramic Burner', 0, 0, ARRAY['60cm 8mm tempered glass top', 'Copper and alu burners, 1200W ceramic burner', 'Cast-iron pan supports', 'AC ignition, safety device']::text[], 'Built-in gas hob with an 8 mm tempered glass top (bevel edge), copper and aluminium burners, a 1200 W ceramic burner, heavy cast-iron pan supports, metal knobs, AC ignition and a safety device. 600 × 520 mm.', '[{"label":"Cooktop","value":"8 mm tempered glass, bevel edge"},{"label":"Bottom material","value":"0.7 mm"},{"label":"Burners","value":"Copper + aluminium; 1200 W ceramic burner"},{"label":"Pan supports","value":"Heavy cast iron"},{"label":"Ignition","value":"AC ignition"},{"label":"Knobs","value":"Metal"},{"label":"Safety device","value":"Yes"},{"label":"Size","value":"600 × 520 mm"}]'::jsonb, ARRAY['/img/products/skywood/skywood-sk-g02-1.webp', '/img/products/skywood/skywood-sk-g02-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK-G02'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk-g02')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK-G02 | Built-in Gas Hob with Ceramic Burner | Built-in hobs | Kitchen Appliances | 60cm 8mm tempered glass top | Copper and alu burners, 1200W ceramic burner | Cast-iron pan supports | AC ignition, safety device | Built-in gas hob with an 8 mm tempered glass top (bevel edge), copper and aluminium burners, a 1200 W ceramic burner, heavy cast-iron pan supports, metal knobs, AC ignition and a safety device. 600 × 520 mm. | Cooktop: 8 mm tempered glass, bevel edge | Bottom material: 0.7 mm | Burners: Copper + aluminium; 1200 W ceramic burner | Pan supports: Heavy cast iron | Ignition: AC ignition | Knobs: Metal | Safety device: Yes | Size: 600 × 520 mm', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK-G02","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- SK-G03: Built-in Gas Hob (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk-g03', 'skywood', 'skywood-kitchen', 'Built-in hobs', 'SK-G03', 'Built-in Gas Hob', 0, 0, ARRAY['60cm 8mm tempered glass top', 'Copper and alu burners', 'Cast-iron pan supports', 'AC ignition, safety device']::text[], 'Built-in gas hob with an 8 mm tempered glass top (bevel edge), copper and aluminium burners, heavy cast-iron pan supports, metal knobs, AC ignition and a safety device. 600 × 520 mm.', '[{"label":"Cooktop","value":"8 mm tempered glass, bevel edge"},{"label":"Bottom material","value":"0.7 mm"},{"label":"Burners","value":"Copper + aluminium"},{"label":"Pan supports","value":"Heavy cast iron"},{"label":"Ignition","value":"AC ignition"},{"label":"Knobs","value":"Metal"},{"label":"Safety device","value":"Yes"},{"label":"Size","value":"600 × 520 mm"}]'::jsonb, ARRAY['/img/products/skywood/skywood-sk-g03-1.webp', '/img/products/skywood/skywood-sk-g03-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK-G03'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk-g03')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK-G03 | Built-in Gas Hob | Built-in hobs | Kitchen Appliances | 60cm 8mm tempered glass top | Copper and alu burners | Cast-iron pan supports | AC ignition, safety device | Built-in gas hob with an 8 mm tempered glass top (bevel edge), copper and aluminium burners, heavy cast-iron pan supports, metal knobs, AC ignition and a safety device. 600 × 520 mm. | Cooktop: 8 mm tempered glass, bevel edge | Bottom material: 0.7 mm | Burners: Copper + aluminium | Pan supports: Heavy cast iron | Ignition: AC ignition | Knobs: Metal | Safety device: Yes | Size: 600 × 520 mm', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK-G03","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- SK-G04: Built-in Gas Hob (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk-g04', 'skywood', 'skywood-kitchen', 'Built-in hobs', 'SK-G04', 'Built-in Gas Hob', 0, 0, ARRAY['8mm tempered glass top', 'Copper and alu burners', 'Cast-iron pan supports', 'AC ignition, safety device']::text[], 'Built-in gas hob with an 8 mm tempered glass top (bevel edge), copper and aluminium burners, heavy cast-iron pan supports, metal knobs, AC ignition and a safety device.', '[{"label":"Cooktop","value":"8 mm tempered glass, bevel edge"},{"label":"Bottom material","value":"0.7 mm"},{"label":"Burners","value":"Copper + aluminium"},{"label":"Pan supports","value":"Heavy cast iron"},{"label":"Ignition","value":"AC ignition"},{"label":"Knobs","value":"Metal"},{"label":"Safety device","value":"Yes"},{"label":"Size","value":"600 × 520 mm"}]'::jsonb, ARRAY['/img/products/skywood/skywood-sk-g04-1.webp', '/img/products/skywood/skywood-sk-g04-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK-G04'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk-g04')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK-G04 | Built-in Gas Hob | Built-in hobs | Kitchen Appliances | 8mm tempered glass top | Copper and alu burners | Cast-iron pan supports | AC ignition, safety device | Built-in gas hob with an 8 mm tempered glass top (bevel edge), copper and aluminium burners, heavy cast-iron pan supports, metal knobs, AC ignition and a safety device. | Cooktop: 8 mm tempered glass, bevel edge | Bottom material: 0.7 mm | Burners: Copper + aluminium | Pan supports: Heavy cast iron | Ignition: AC ignition | Knobs: Metal | Safety device: Yes | Size: 600 × 520 mm', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK-G04","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- R-02: Range Hood (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-r-02', 'skywood', 'skywood-kitchen', 'Range hoods', 'R-02', 'Range Hood', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-r-02-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('R-02'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-r-02')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'R-02 | Range Hood | Range hoods | Kitchen Appliances', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"R-02","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- R-02S: Range Hood (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-r-02s', 'skywood', 'skywood-kitchen', 'Range hoods', 'R-02S', 'Range Hood', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-r-02s-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('R-02S'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-r-02s')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'R-02S | Range Hood | Range hoods | Kitchen Appliances', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"R-02S","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- NK-B148: 2-in-1 Table Blender (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-nk-b148', 'skywood', 'skywood-kitchen', 'Blenders', 'NK-B148', '2-in-1 Table Blender', 0, 0, ARRAY['500W copper motor', '2 speeds with pulse', '1.25L glass jar', 'Grinder jar']::text[], '2-in-1 table blender with a 500 W copper motor, 2 speeds with pulse, a 1.25 L glass jar and a grinder. Plastic body with stainless steel decoration.', '[{"label":"Power","value":"500 W"},{"label":"Motor","value":"Copper"},{"label":"Speeds","value":"2 + pulse"},{"label":"Jars","value":"1.25 L glass jar, PC grinder"},{"label":"Body","value":"Plastic with stainless steel decoration"},{"label":"Power supply","value":"220–240 V, 50 Hz"},{"label":"Plug","value":"BS, 1 m cord"}]'::jsonb, ARRAY['/img/products/skywood/skywood-nk-b148-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('NK-B148'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-nk-b148')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'NK-B148 | 2-in-1 Table Blender | Blenders | Kitchen Appliances | 500W copper motor | 2 speeds with pulse | 1.25L glass jar | Grinder jar | 2-in-1 table blender with a 500 W copper motor, 2 speeds with pulse, a 1.25 L glass jar and a grinder. Plastic body with stainless steel decoration. | Power: 500 W | Motor: Copper | Speeds: 2 + pulse | Jars: 1.25 L glass jar, PC grinder | Body: Plastic with stainless steel decoration | Power supply: 220–240 V, 50 Hz | Plug: BS, 1 m cord', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"NK-B148","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- NK-B141: 3-in-1 Table Blender (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-nk-b141', 'skywood', 'skywood-kitchen', 'Blenders', 'NK-B141', '3-in-1 Table Blender', 0, 0, ARRAY['700W copper motor', '2 speeds with pulse', '2L jar, grinder and chopper', 'Matte black body']::text[], '3-in-1 table blender with a 700 W copper motor, 2 speeds with pulse, a 2 L PC jar, a grinder jar and a chopper bowl. Matte black plastic body.', '[{"label":"Power","value":"700 W"},{"label":"Motor","value":"Copper"},{"label":"Speeds","value":"2 + pulse"},{"label":"Jars","value":"2 L PC jar, PC grinder jar, PC chopper bowl"},{"label":"Body","value":"Plastic, matte black"},{"label":"Power supply","value":"220–240 V, 50/60 Hz"},{"label":"Plug","value":"BS, 1 m cord"}]'::jsonb, ARRAY['/img/products/skywood/skywood-nk-b141-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('NK-B141'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-nk-b141')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'NK-B141 | 3-in-1 Table Blender | Blenders | Kitchen Appliances | 700W copper motor | 2 speeds with pulse | 2L jar, grinder and chopper | Matte black body | 3-in-1 table blender with a 700 W copper motor, 2 speeds with pulse, a 2 L PC jar, a grinder jar and a chopper bowl. Matte black plastic body. | Power: 700 W | Motor: Copper | Speeds: 2 + pulse | Jars: 2 L PC jar, PC grinder jar, PC chopper bowl | Body: Plastic, matte black | Power supply: 220–240 V, 50/60 Hz | Plug: BS, 1 m cord', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"NK-B141","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- NK-J268: 4-in-1 Juice Extractor (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-nk-j268', 'skywood', 'skywood-kitchen', 'Blenders', 'NK-J268', '4-in-1 Juice Extractor', 0, 0, ARRAY['700W copper motor', '800ml juice jar, 65mm feed', 'Glass jar, grinder and chopper', 'Stainless steel body']::text[], '4-in-1 juice extractor with a 700 W copper motor, 2 speeds with pulse, an 800 ml juice jar, a 1500 ml pulp container and a 65 mm feed chute. Comes with a 1 L glass jar, a glass grinder jar and a glass chopper. Stainless steel body and handle.', '[{"label":"Power","value":"700 W"},{"label":"Motor","value":"Copper"},{"label":"Speeds","value":"2 + pulse"},{"label":"Juice jar","value":"800 ml"},{"label":"Pulp container","value":"1500 ml"},{"label":"Feed chute","value":"Φ65 mm"},{"label":"Attachments","value":"1 L glass jar, glass grinder jar, glass chopper"},{"label":"Body","value":"Stainless steel"},{"label":"Power supply","value":"220–240 V, 50/60 Hz"},{"label":"Plug","value":"BS, 1 m cord"}]'::jsonb, ARRAY['/img/products/skywood/skywood-nk-j268-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('NK-J268'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-nk-j268')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'NK-J268 | 4-in-1 Juice Extractor | Blenders | Kitchen Appliances | 700W copper motor | 800ml juice jar, 65mm feed | Glass jar, grinder and chopper | Stainless steel body | 4-in-1 juice extractor with a 700 W copper motor, 2 speeds with pulse, an 800 ml juice jar, a 1500 ml pulp container and a 65 mm feed chute. Comes with a 1 L glass jar, a glass grinder jar and a glass chopper. Stainless steel body and handle. | Power: 700 W | Motor: Copper | Speeds: 2 + pulse | Juice jar: 800 ml | Pulp container: 1500 ml | Feed chute: Φ65 mm | Attachments: 1 L glass jar, glass grinder jar, glass chopper | Body: Stainless steel | Power supply: 220–240 V, 50/60 Hz | Plug: BS, 1 m cord', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"NK-J268","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- NK-J220B: 5-in-1 Juice Extractor (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-nk-j220b', 'skywood', 'skywood-kitchen', 'Blenders', 'NK-J220B', '5-in-1 Juice Extractor', 0, 0, ARRAY['1200W copper motor', '1L juice jar, 83mm feed', 'Glass jar, grinder and food processor', 'Stainless steel body']::text[], '5-in-1 juice extractor with a 1200 W copper motor, 2 speeds with pulse, a 1 L juice jar, a 2.5 L pulp container and an 83 mm feed chute. Comes with a 1.5 L glass jar, a glass grinder jar and a processor bowl with shred and slice blades. Stainless steel body and handle.', '[{"label":"Power","value":"1200 W"},{"label":"Motor","value":"Copper"},{"label":"Speeds","value":"2 + pulse"},{"label":"Juice jar","value":"1 L"},{"label":"Pulp container","value":"2.5 L"},{"label":"Feed chute","value":"Φ83 mm"},{"label":"Attachments","value":"1.5 L glass jar, glass grinder jar, processor bowl with shred and slice blades"},{"label":"Body","value":"Stainless steel"},{"label":"Power supply","value":"220–240 V, 50/60 Hz"},{"label":"Plug","value":"BS, 1 m cord"}]'::jsonb, ARRAY['/img/products/skywood/skywood-nk-j220b-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('NK-J220B'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-nk-j220b')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'NK-J220B | 5-in-1 Juice Extractor | Blenders | Kitchen Appliances | 1200W copper motor | 1L juice jar, 83mm feed | Glass jar, grinder and food processor | Stainless steel body | 5-in-1 juice extractor with a 1200 W copper motor, 2 speeds with pulse, a 1 L juice jar, a 2.5 L pulp container and an 83 mm feed chute. Comes with a 1.5 L glass jar, a glass grinder jar and a processor bowl with shred and slice blades. Stainless steel body and handle. | Power: 1200 W | Motor: Copper | Speeds: 2 + pulse | Juice jar: 1 L | Pulp container: 2.5 L | Feed chute: Φ83 mm | Attachments: 1.5 L glass jar, glass grinder jar, processor bowl with shred and slice blades | Body: Stainless steel | Power supply: 220–240 V, 50/60 Hz | Plug: BS, 1 m cord', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"NK-J220B","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- SK-8823: Electric Kettle (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk-8823', 'skywood', 'skywood-kitchen', 'Electric kettles', 'SK-8823', 'Electric Kettle', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-sk-8823-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK-8823'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk-8823')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK-8823 | Electric Kettle | Electric kettles | Kitchen Appliances', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK-8823","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- SK-8870: Electric Kettle (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk-8870', 'skywood', 'skywood-kitchen', 'Electric kettles', 'SK-8870', 'Electric Kettle', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-sk-8870-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK-8870'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk-8870')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK-8870 | Electric Kettle | Electric kettles | Kitchen Appliances', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK-8870","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- LC38 WHITE: LC38 Water Dispenser, White (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-lc38-white', 'skywood', 'skywood-kitchen', 'Water dispensers', 'LC38 WHITE', 'LC38 Water Dispenser, White', 0, 0, ARRAY['Hot 420W, 0.8L hot tank', 'Compressor cooling 100W', 'Tabletop loading']::text[], 'Tabletop water dispenser: 420 W heating with a 0.8 L hot tank and 100 W compressor cooling.', '[{"label":"Power supply","value":"220 V, 50/60 Hz"},{"label":"Heating","value":"420 W"},{"label":"Cooling","value":"Compressor, 100 W"},{"label":"Loading","value":"Tabletop"},{"label":"Hot tank","value":"0.8 L"},{"label":"Colour","value":"White"}]'::jsonb, ARRAY['/img/products/skywood/skywood-lc38-white-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('LC38 WHITE'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-lc38-white')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'LC38 WHITE | LC38 Water Dispenser, White | Water dispensers | Kitchen Appliances | Hot 420W, 0.8L hot tank | Compressor cooling 100W | Tabletop loading | Tabletop water dispenser: 420 W heating with a 0.8 L hot tank and 100 W compressor cooling. | Power supply: 220 V, 50/60 Hz | Heating: 420 W | Cooling: Compressor, 100 W | Loading: Tabletop | Hot tank: 0.8 L | Colour: White', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"LC38 WHITE","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- LC38 SILVER: LC38 Water Dispenser, Silver (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-lc38-silver', 'skywood', 'skywood-kitchen', 'Water dispensers', 'LC38 SILVER', 'LC38 Water Dispenser, Silver', 0, 0, ARRAY['Hot 420W, 0.8L hot tank', 'Compressor cooling 100W', 'Tabletop loading', 'Hot, cold and room water']::text[], 'Tabletop water dispenser: 420 W heating with a 0.8 L hot tank, 100 W compressor cooling, and hot, cold and room-temperature water with 3 push buttons.', '[{"label":"Power supply","value":"220 V, 50/60 Hz"},{"label":"Heating","value":"420 W"},{"label":"Cooling","value":"Compressor, 100 W"},{"label":"Loading","value":"Tabletop"},{"label":"Hot tank","value":"0.8 L"},{"label":"Water","value":"Hot, cold and room, 3 push buttons"},{"label":"Colour","value":"Silver"}]'::jsonb, ARRAY['/img/products/skywood/skywood-lc38-silver-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('LC38 SILVER'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-lc38-silver')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'LC38 SILVER | LC38 Water Dispenser, Silver | Water dispensers | Kitchen Appliances | Hot 420W, 0.8L hot tank | Compressor cooling 100W | Tabletop loading | Hot, cold and room water | Tabletop water dispenser: 420 W heating with a 0.8 L hot tank, 100 W compressor cooling, and hot, cold and room-temperature water with 3 push buttons. | Power supply: 220 V, 50/60 Hz | Heating: 420 W | Cooling: Compressor, 100 W | Loading: Tabletop | Hot tank: 0.8 L | Water: Hot, cold and room, 3 push buttons | Colour: Silver', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"LC38 SILVER","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- LC38T: LC38T Water Dispenser with Storage Cabinet (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-lc38t', 'skywood', 'skywood-kitchen', 'Water dispensers', 'LC38T', 'LC38T Water Dispenser with Storage Cabinet', 0, 0, ARRAY['Hot 420W, compressor cooling 100W', 'Top loading, storage cabinet', 'Hot, cold and room water', '304 stainless steel hot tank']::text[], 'Top loading water dispenser with a storage cabinet: 420 W heating, 100 W compressor cooling, hot, cold and room-temperature water with 3 piano push buttons and a 304 stainless steel hot water tank.', '[{"label":"Power supply","value":"220 V, 50/60 Hz"},{"label":"Heating","value":"420 W"},{"label":"Cooling","value":"Compressor, 100 W"},{"label":"Loading","value":"Top loading"},{"label":"Storage","value":"Storage cabinet"},{"label":"Water","value":"Hot, cold and room, 3 piano push buttons"},{"label":"Hot water tank","value":"304 stainless steel"}]'::jsonb, ARRAY['/img/products/skywood/skywood-lc38t-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('LC38T'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-lc38t')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'LC38T | LC38T Water Dispenser with Storage Cabinet | Water dispensers | Kitchen Appliances | Hot 420W, compressor cooling 100W | Top loading, storage cabinet | Hot, cold and room water | 304 stainless steel hot tank | Top loading water dispenser with a storage cabinet: 420 W heating, 100 W compressor cooling, hot, cold and room-temperature water with 3 piano push buttons and a 304 stainless steel hot water tank. | Power supply: 220 V, 50/60 Hz | Heating: 420 W | Cooling: Compressor, 100 W | Loading: Top loading | Storage: Storage cabinet | Water: Hot, cold and room, 3 piano push buttons | Hot water tank: 304 stainless steel', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"LC38T","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- LC31T: LC31T Water Dispenser with Refrigerator (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-lc31t', 'skywood', 'skywood-kitchen', 'Water dispensers', 'LC31T', 'LC31T Water Dispenser with Refrigerator', 0, 0, ARRAY['Hot 420W, compressor cooling 100W', 'Top loading, with refrigerator', 'Hot, cold and room water', '304 stainless steel hot tank']::text[], 'Top loading water dispenser with a refrigerator: 420 W heating, 100 W compressor cooling, hot, cold and room-temperature water with 3 piano push buttons and a 304 stainless steel hot water tank.', '[{"label":"Power supply","value":"220 V, 50/60 Hz"},{"label":"Heating","value":"420 W"},{"label":"Cooling","value":"Compressor, 100 W"},{"label":"Loading","value":"Top loading"},{"label":"Storage","value":"Refrigerator"},{"label":"Water","value":"Hot, cold and room, 3 piano push buttons"},{"label":"Hot water tank","value":"304 stainless steel"}]'::jsonb, ARRAY['/img/products/skywood/skywood-lc31t-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('LC31T'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-lc31t')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'LC31T | LC31T Water Dispenser with Refrigerator | Water dispensers | Kitchen Appliances | Hot 420W, compressor cooling 100W | Top loading, with refrigerator | Hot, cold and room water | 304 stainless steel hot tank | Top loading water dispenser with a refrigerator: 420 W heating, 100 W compressor cooling, hot, cold and room-temperature water with 3 piano push buttons and a 304 stainless steel hot water tank. | Power supply: 220 V, 50/60 Hz | Heating: 420 W | Cooling: Compressor, 100 W | Loading: Top loading | Storage: Refrigerator | Water: Hot, cold and room, 3 piano push buttons | Hot water tank: 304 stainless steel', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"LC31T","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- LC32F: LC32F Bottom Loading Water Dispenser (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-lc32f', 'skywood', 'skywood-kitchen', 'Water dispensers', 'LC32F', 'LC32F Bottom Loading Water Dispenser', 0, 0, ARRAY['Hot 420W, compressor cooling 100W', 'Bottom loading', 'Hot, cold and room water', '304 stainless steel hot tank']::text[], 'Bottom loading water dispenser: 420 W heating, 100 W compressor cooling, hot, cold and room-temperature water with 3 piano push buttons and a 304 stainless steel hot water tank.', '[{"label":"Power supply","value":"220 V, 50/60 Hz"},{"label":"Heating","value":"420 W"},{"label":"Cooling","value":"Compressor, 100 W"},{"label":"Loading","value":"Bottom loading"},{"label":"Water","value":"Hot, cold and room, 3 piano push buttons"},{"label":"Hot water tank","value":"304 stainless steel"}]'::jsonb, ARRAY['/img/products/skywood/skywood-lc32f-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('LC32F'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-lc32f')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'LC32F | LC32F Bottom Loading Water Dispenser | Water dispensers | Kitchen Appliances | Hot 420W, compressor cooling 100W | Bottom loading | Hot, cold and room water | 304 stainless steel hot tank | Bottom loading water dispenser: 420 W heating, 100 W compressor cooling, hot, cold and room-temperature water with 3 piano push buttons and a 304 stainless steel hot water tank. | Power supply: 220 V, 50/60 Hz | Heating: 420 W | Cooling: Compressor, 100 W | Loading: Bottom loading | Water: Hot, cold and room, 3 piano push buttons | Hot water tank: 304 stainless steel', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"LC32F","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- LC37F: LC37F Bottom Loading Water Dispenser (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-lc37f', 'skywood', 'skywood-kitchen', 'Water dispensers', 'LC37F', 'LC37F Bottom Loading Water Dispenser', 0, 0, ARRAY['Hot 420W, compressor cooling 100W', 'Bottom loading', 'Hot, cold and room water', '304 stainless steel hot tank']::text[], 'Bottom loading water dispenser: 420 W heating, 100 W compressor cooling, hot, cold and room-temperature water with 3 piano push buttons and a 304 stainless steel hot water tank.', '[{"label":"Power supply","value":"220 V, 50/60 Hz"},{"label":"Heating","value":"420 W"},{"label":"Cooling","value":"Compressor, 100 W"},{"label":"Loading","value":"Bottom loading"},{"label":"Water","value":"Hot, cold and room, 3 piano push buttons"},{"label":"Hot water tank","value":"304 stainless steel"}]'::jsonb, ARRAY['/img/products/skywood/skywood-lc37f-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('LC37F'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-lc37f')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'LC37F | LC37F Bottom Loading Water Dispenser | Water dispensers | Kitchen Appliances | Hot 420W, compressor cooling 100W | Bottom loading | Hot, cold and room water | 304 stainless steel hot tank | Bottom loading water dispenser: 420 W heating, 100 W compressor cooling, hot, cold and room-temperature water with 3 piano push buttons and a 304 stainless steel hot water tank. | Power supply: 220 V, 50/60 Hz | Heating: 420 W | Cooling: Compressor, 100 W | Loading: Bottom loading | Water: Hot, cold and room, 3 piano push buttons | Hot water tank: 304 stainless steel', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"LC37F","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- LCD31F: LCD31F Full Touch Water Dispenser (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-lcd31f', 'skywood', 'skywood-kitchen', 'Water dispensers', 'LCD31F', 'LCD31F Full Touch Water Dispenser', 0, 0, ARRAY['Full touch display', 'Bottom loading, 5-gallon bottles', 'Hot, cold and room water', '304 stainless steel water tank']::text[], 'Bottom loading water dispenser for 5-gallon bottles with a full touch display: 420 W heating, hot, cold and room-temperature water, ABS body (black with grey decoration) and a 304 stainless steel water tank.', '[{"label":"Power supply","value":"220 V, 50/60 Hz"},{"label":"Heating","value":"420 W"},{"label":"Display","value":"Full touch"},{"label":"Loading","value":"Bottom loading, 5-gallon bottles"},{"label":"Water","value":"Hot, cold and room"},{"label":"Body","value":"ABS, black with grey decoration"},{"label":"Water tank","value":"304 stainless steel"}]'::jsonb, ARRAY['/img/products/skywood/skywood-lcd31f-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('LCD31F'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-lcd31f')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'LCD31F | LCD31F Full Touch Water Dispenser | Water dispensers | Kitchen Appliances | Full touch display | Bottom loading, 5-gallon bottles | Hot, cold and room water | 304 stainless steel water tank | Bottom loading water dispenser for 5-gallon bottles with a full touch display: 420 W heating, hot, cold and room-temperature water, ABS body (black with grey decoration) and a 304 stainless steel water tank. | Power supply: 220 V, 50/60 Hz | Heating: 420 W | Display: Full touch | Loading: Bottom loading, 5-gallon bottles | Water: Hot, cold and room | Body: ABS, black with grey decoration | Water tank: 304 stainless steel', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"LCD31F","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- LCE089L: LCE089L Instant Heating Water Dispenser (0 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-lce089l', 'skywood', 'skywood-kitchen', 'Water dispensers', 'LCE089L', 'LCE089L Instant Heating Water Dispenser', 0, 0, ARRAY['Instant heating 420W', 'Bottom loading, storage cabinet', 'Hot and room water', 'No cooling']::text[], 'Bottom loading water dispenser with instant heating (420 W) and a storage cabinet. Hot and room-temperature water; no cooling.', '[{"label":"Power supply","value":"220 V, 50/60 Hz"},{"label":"Heating","value":"420 W"},{"label":"Cooling","value":"None"},{"label":"Heating type","value":"Instant heating"},{"label":"Loading","value":"Bottom loading"},{"label":"Storage","value":"Storage cabinet"},{"label":"Water","value":"Hot and room"}]'::jsonb, '{}'::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('LCE089L'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-lce089l')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'LCE089L | LCE089L Instant Heating Water Dispenser | Water dispensers | Kitchen Appliances | Instant heating 420W | Bottom loading, storage cabinet | Hot and room water | No cooling | Bottom loading water dispenser with instant heating (420 W) and a storage cabinet. Hot and room-temperature water; no cooling. | Power supply: 220 V, 50/60 Hz | Heating: 420 W | Cooling: None | Heating type: Instant heating | Loading: Bottom loading | Storage: Storage cabinet | Water: Hot and room', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"LCE089L","hidden":true,"price":0,"photos":0}'::jsonb, now() FROM ins;
-- TEA BAR: Tea Bar (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-tea-bar', 'skywood', 'skywood-kitchen', 'Water dispensers', 'TEA BAR', 'Tea Bar', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-tea-bar-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-kitchen')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('TEA BAR'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-tea-bar')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'TEA BAR | Tea Bar | Water dispensers | Kitchen Appliances', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"TEA BAR","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- SK2023-B01: Soundbar with Subwoofer (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk2023-b01', 'skywood', 'skywood-music', 'Soundbars', 'SK2023-B01', 'Soundbar with Subwoofer', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-sk2023-b01-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-music')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK2023-B01'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk2023-b01')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK2023-B01 | Soundbar with Subwoofer | Soundbars | Music Systems', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK2023-B01","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- SK2023-B02: Soundbar with Subwoofer (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk2023-b02', 'skywood', 'skywood-music', 'Soundbars', 'SK2023-B02', 'Soundbar with Subwoofer', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-sk2023-b02-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-music')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK2023-B02'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk2023-b02')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK2023-B02 | Soundbar with Subwoofer | Soundbars | Music Systems', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK2023-B02","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- SK2025-B03: Soundbar with Subwoofer (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk2025-b03', 'skywood', 'skywood-music', 'Soundbars', 'SK2025-B03', 'Soundbar with Subwoofer', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-sk2025-b03-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-music')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK2025-B03'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk2025-b03')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK2025-B03 | Soundbar with Subwoofer | Soundbars | Music Systems', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK2025-B03","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- SK2025-B05: Soundbar with Subwoofer (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk2025-b05', 'skywood', 'skywood-music', 'Soundbars', 'SK2025-B05', 'Soundbar with Subwoofer', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-sk2025-b05-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-music')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK2025-B05'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk2025-b05')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK2025-B05 | Soundbar with Subwoofer | Soundbars | Music Systems', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK2025-B05","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- SK2025-B07: Soundbar with Subwoofer (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk2025-b07', 'skywood', 'skywood-music', 'Soundbars', 'SK2025-B07', 'Soundbar with Subwoofer', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-sk2025-b07-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-music')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK2025-B07'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk2025-b07')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK2025-B07 | Soundbar with Subwoofer | Soundbars | Music Systems', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK2025-B07","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- SK2023-S04: Tower Speaker System with Subwoofer (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk2023-s04', 'skywood', 'skywood-music', 'Subwoofers', 'SK2023-S04', 'Tower Speaker System with Subwoofer', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-sk2023-s04-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-music')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK2023-S04'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk2023-s04')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK2023-S04 | Tower Speaker System with Subwoofer | Subwoofers | Music Systems', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK2023-S04","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- SK2023-S05: Tower Speaker System with Subwoofer (1 photo)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-sk2023-s05', 'skywood', 'skywood-music', 'Subwoofers', 'SK2023-S05', 'Tower Speaker System with Subwoofer', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-sk2023-s05-1.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-music')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('SK2023-S05'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-sk2023-s05')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'SK2023-S05 | Tower Speaker System with Subwoofer | Subwoofers | Music Systems', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"SK2023-S05","hidden":true,"price":0,"photos":1}'::jsonb, now() FROM ins;
-- BOOMBOX 2: Boombox 2 (0 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-boombox-2', 'skywood', 'skywood-music', 'Boombox', 'BOOMBOX 2', 'Boombox 2', 0, 0, '{}'::text[], '', '[]'::jsonb, '{}'::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-music')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('BOOMBOX 2'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-boombox-2')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'BOOMBOX 2 | Boombox 2 | Boombox | Music Systems', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"BOOMBOX 2","hidden":true,"price":0,"photos":0}'::jsonb, now() FROM ins;
-- CTF4202TR-L: Cooling Tower Fan (5 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-ctf4202tr-l', 'skywood', 'skywood-fans', 'Cooling tower fans', 'CTF4202TR-L', 'Cooling Tower Fan', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-ctf4202tr-l-1.webp', '/img/products/skywood/skywood-ctf4202tr-l-2.webp', '/img/products/skywood/skywood-ctf4202tr-l-3.webp', '/img/products/skywood/skywood-ctf4202tr-l-4.webp', '/img/products/skywood/skywood-ctf4202tr-l-5.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-fans')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('CTF4202TR-L'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-ctf4202tr-l')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'CTF4202TR-L | Cooling Tower Fan | Cooling tower fans | Tower Fans', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"CTF4202TR-L","hidden":true,"price":0,"photos":5}'::jsonb, now() FROM ins;
-- TF1302: Tower Fan (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-tf1302', 'skywood', 'skywood-fans', 'Tower fans', 'TF1302', 'Tower Fan', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-tf1302-1.webp', '/img/products/skywood/skywood-tf1302-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-fans')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('TF1302'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-tf1302')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'TF1302 | Tower Fan | Tower fans | Tower Fans', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"TF1302","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- TF2902TR-L: Tower Fan (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-tf2902tr-l', 'skywood', 'skywood-fans', 'Tower fans', 'TF2902TR-L', 'Tower Fan', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-tf2902tr-l-1.webp', '/img/products/skywood/skywood-tf2902tr-l-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-fans')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('TF2902TR-L'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-tf2902tr-l')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'TF2902TR-L | Tower Fan | Tower fans | Tower Fans', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"TF2902TR-L","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- TF4001TR-L: Tower Fan (3 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-tf4001tr-l', 'skywood', 'skywood-fans', 'Tower fans', 'TF4001TR-L', 'Tower Fan', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-tf4001tr-l-1.webp', '/img/products/skywood/skywood-tf4001tr-l-2.webp', '/img/products/skywood/skywood-tf4001tr-l-3.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-fans')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('TF4001TR-L'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-tf4001tr-l')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'TF4001TR-L | Tower Fan | Tower fans | Tower Fans', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"TF4001TR-L","hidden":true,"price":0,"photos":3}'::jsonb, now() FROM ins;
-- CSC-18K: 18,000 BTU Air Conditioner (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-csc-18k', 'skywood', 'skywood-ac', 'On/off', 'CSC-18K', '18,000 BTU Air Conditioner', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-csc-18k-1.webp', '/img/products/skywood/skywood-csc-18k-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-ac')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('CSC-18K'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-csc-18k')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'CSC-18K | 18,000 BTU Air Conditioner | On/off | Air Conditioning', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"CSC-18K","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- CSC-24K: 24,000 BTU Air Conditioner (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-csc-24k', 'skywood', 'skywood-ac', 'On/off', 'CSC-24K', '24,000 BTU Air Conditioner', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-csc-24k-1.webp', '/img/products/skywood/skywood-csc-24k-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-ac')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('CSC-24K'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-csc-24k')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'CSC-24K | 24,000 BTU Air Conditioner | On/off | Air Conditioning', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"CSC-24K","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- CSDC-09K: 9,000 BTU Inverter AC (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-csdc-09k', 'skywood', 'skywood-ac', 'Inverter', 'CSDC-09K', '9,000 BTU Inverter AC', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-csdc-09k-1.webp', '/img/products/skywood/skywood-csdc-09k-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-ac')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('CSDC-09K'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-csdc-09k')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'CSDC-09K | 9,000 BTU Inverter AC | Inverter | Air Conditioning', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"CSDC-09K","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- CSDC-24K: 24,000 BTU Inverter AC (2 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-csdc-24k', 'skywood', 'skywood-ac', 'Inverter', 'CSDC-24K', '24,000 BTU Inverter AC', 0, 0, '{}'::text[], '', '[]'::jsonb, ARRAY['/img/products/skywood/skywood-csdc-24k-1.webp', '/img/products/skywood/skywood-csdc-24k-2.webp']::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-ac')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('CSDC-24K'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-csdc-24k')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'CSDC-24K | 24,000 BTU Inverter AC | Inverter | Air Conditioning', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"CSDC-24K","hidden":true,"price":0,"photos":2}'::jsonb, now() FROM ins;
-- XQB120-1729A: Top Load Washing Machine (0 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-xqb120-1729a', 'skywood', 'skywood-washing', 'Top load', 'XQB120-1729A', 'Top Load Washing Machine', 0, 0, '{}'::text[], '', '[]'::jsonb, '{}'::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-washing')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('XQB120-1729A'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-xqb120-1729a')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'XQB120-1729A | Top Load Washing Machine | Top load | Washing Machine', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"XQB120-1729A","hidden":true,"price":0,"photos":0}'::jsonb, now() FROM ins;
-- XQB60-1729A: Top Load Washing Machine (0 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-xqb60-1729a', 'skywood', 'skywood-washing', 'Top load', 'XQB60-1729A', 'Top Load Washing Machine', 0, 0, '{}'::text[], '', '[]'::jsonb, '{}'::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-washing')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('XQB60-1729A'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-xqb60-1729a')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'XQB60-1729A | Top Load Washing Machine | Top load | Washing Machine', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"XQB60-1729A","hidden":true,"price":0,"photos":0}'::jsonb, now() FROM ins;
-- XQG100-1458DPH: Front Load Washing Machine (0 photos)
WITH ins AS (
  INSERT INTO "Product" (id, "brandKey", "categoryId", sub, model, name, price, stock, features, description, specs, images, tag, hidden, reviews, "createdAt", "updatedAt")
  SELECT 'skywood-xqg100-1458dph', 'skywood', 'skywood-washing', 'Front load', 'XQG100-1458DPH', 'Front Load Washing Machine', 0, 0, '{}'::text[], '', '[]'::jsonb, '{}'::text[], '', true, 0, now(), now()
  WHERE EXISTS (SELECT 1 FROM "Category" WHERE id = 'skywood-washing')
    AND NOT EXISTS (SELECT 1 FROM "Product" WHERE "brandKey" = 'skywood' AND lower(model) = lower('XQG100-1458DPH'))
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE action = 'catalogue.draft.create' AND entity = 'Product' AND "entityId" = 'skywood-xqg100-1458dph')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), emb AS (
  INSERT INTO "ProductEmbedding" ("productId", text, "updatedAt") SELECT id, 'XQG100-1458DPH | Front Load Washing Machine | Front load | Washing Machine', now() FROM ins ON CONFLICT ("productId") DO NOTHING
)
INSERT INTO "AuditLog" (id, actor, action, entity, "entityId", diff, at)
SELECT 'sql' || md5(random()::text || clock_timestamp()::text), 'system:sql', 'catalogue.draft.create', 'Product', id, '{"model":"XQG100-1458DPH","hidden":true,"price":0,"photos":0}'::jsonb, now() FROM ins;

COMMIT;
