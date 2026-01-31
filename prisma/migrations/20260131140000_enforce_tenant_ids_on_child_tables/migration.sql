/*
  Stronger multi-tenancy enforcement:
  - Add tenantId to tenant-owned “child” tables
  - Backfill tenantId from parent relations
  - Enforce composite foreign keys (tenantId, parentId) to prevent cross-tenant links
*/

-- 1) Drop old foreign keys that did not include tenantId (or had weaker scoping)
ALTER TABLE IF EXISTS "InventoryMovement" DROP CONSTRAINT IF EXISTS "InventoryMovement_variantId_fkey";

ALTER TABLE IF EXISTS "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_orderId_fkey";
ALTER TABLE IF EXISTS "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";
ALTER TABLE IF EXISTS "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_variantId_fkey";

ALTER TABLE IF EXISTS "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";

ALTER TABLE IF EXISTS "ProductImage" DROP CONSTRAINT IF EXISTS "ProductImage_productId_fkey";
ALTER TABLE IF EXISTS "ProductOption" DROP CONSTRAINT IF EXISTS "ProductOption_productId_fkey";
ALTER TABLE IF EXISTS "ProductOptionValue" DROP CONSTRAINT IF EXISTS "ProductOptionValue_optionId_fkey";
ALTER TABLE IF EXISTS "ProductVariant" DROP CONSTRAINT IF EXISTS "ProductVariant_productId_fkey";

ALTER TABLE IF EXISTS "ProductVariantImage" DROP CONSTRAINT IF EXISTS "ProductVariantImage_imageId_fkey";
ALTER TABLE IF EXISTS "ProductVariantImage" DROP CONSTRAINT IF EXISTS "ProductVariantImage_variantId_fkey";

ALTER TABLE IF EXISTS "ProductVariantOptionValue" DROP CONSTRAINT IF EXISTS "ProductVariantOptionValue_optionValueId_fkey";
ALTER TABLE IF EXISTS "ProductVariantOptionValue" DROP CONSTRAINT IF EXISTS "ProductVariantOptionValue_variantId_fkey";

ALTER TABLE IF EXISTS "Shipment" DROP CONSTRAINT IF EXISTS "Shipment_orderId_fkey";
ALTER TABLE IF EXISTS "ShipmentEvent" DROP CONSTRAINT IF EXISTS "ShipmentEvent_shipmentId_fkey";

-- 2) Drop old indexes replaced by tenant-scoped ones
DROP INDEX IF EXISTS "ProductImage_productId_idx";
DROP INDEX IF EXISTS "ProductOption_productId_idx";
DROP INDEX IF EXISTS "ProductOptionValue_optionId_idx";
DROP INDEX IF EXISTS "ProductVariant_productId_idx";

-- 3) Add tenantId columns as NULLable first (so we can backfill existing rows)
ALTER TABLE IF EXISTS "ProductImage" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE IF EXISTS "ProductOption" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE IF EXISTS "ProductOptionValue" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE IF EXISTS "ProductVariant" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE IF EXISTS "ProductVariantOptionValue" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE IF EXISTS "ProductVariantImage" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE IF EXISTS "InventoryMovement" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE IF EXISTS "OrderItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- 4) Backfill tenantId from parent relations
UPDATE "ProductImage" AS pi
SET "tenantId" = p."tenantId"
FROM "Product" AS p
WHERE pi."tenantId" IS NULL AND pi."productId" = p."id";

UPDATE "ProductVariant" AS v
SET "tenantId" = p."tenantId"
FROM "Product" AS p
WHERE v."tenantId" IS NULL AND v."productId" = p."id";

UPDATE "ProductOption" AS o
SET "tenantId" = p."tenantId"
FROM "Product" AS p
WHERE o."tenantId" IS NULL AND o."productId" = p."id";

UPDATE "ProductOptionValue" AS ov
SET "tenantId" = o."tenantId"
FROM "ProductOption" AS o
WHERE ov."tenantId" IS NULL AND ov."optionId" = o."id";

UPDATE "ProductVariantOptionValue" AS vv
SET "tenantId" = v."tenantId"
FROM "ProductVariant" AS v
WHERE vv."tenantId" IS NULL AND vv."variantId" = v."id";

UPDATE "ProductVariantImage" AS vi
SET "tenantId" = v."tenantId"
FROM "ProductVariant" AS v
WHERE vi."tenantId" IS NULL AND vi."variantId" = v."id";

UPDATE "InventoryMovement" AS im
SET "tenantId" = v."tenantId"
FROM "ProductVariant" AS v
WHERE im."tenantId" IS NULL AND im."variantId" = v."id";

UPDATE "OrderItem" AS oi
SET "tenantId" = o."tenantId"
FROM "Order" AS o
WHERE oi."tenantId" IS NULL AND oi."orderId" = o."id";

-- Align any existing shipment events with their shipment tenant (defensive)
UPDATE "ShipmentEvent" AS se
SET "tenantId" = s."tenantId"
FROM "Shipment" AS s
WHERE se."shipmentId" = s."id" AND se."tenantId" <> s."tenantId";

-- 5) Enforce NOT NULL now that data is backfilled
ALTER TABLE IF EXISTS "ProductImage" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE IF EXISTS "ProductOption" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE IF EXISTS "ProductOptionValue" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE IF EXISTS "ProductVariant" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE IF EXISTS "ProductVariantOptionValue" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE IF EXISTS "ProductVariantImage" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE IF EXISTS "InventoryMovement" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE IF EXISTS "OrderItem" ALTER COLUMN "tenantId" SET NOT NULL;

-- 6) Update join-table primary keys to include tenantId
ALTER TABLE IF EXISTS "ProductVariantOptionValue"
  DROP CONSTRAINT IF EXISTS "ProductVariantOptionValue_pkey";
ALTER TABLE IF EXISTS "ProductVariantOptionValue"
  ADD CONSTRAINT "ProductVariantOptionValue_pkey" PRIMARY KEY ("tenantId", "variantId", "optionValueId");

ALTER TABLE IF EXISTS "ProductVariantImage"
  DROP CONSTRAINT IF EXISTS "ProductVariantImage_pkey";
ALTER TABLE IF EXISTS "ProductVariantImage"
  ADD CONSTRAINT "ProductVariantImage_pkey" PRIMARY KEY ("tenantId", "variantId", "imageId");

-- 7) Add tenant-scoped unique constraints and indexes used for composite foreign keys
CREATE UNIQUE INDEX IF NOT EXISTS "Category_tenantId_id_key" ON "Category"("tenantId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_tenantId_id_key" ON "Order"("tenantId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_tenantId_id_key" ON "Product"("tenantId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "Shipment_tenantId_id_key" ON "Shipment"("tenantId", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "ProductImage_tenantId_id_key" ON "ProductImage"("tenantId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductOption_tenantId_id_key" ON "ProductOption"("tenantId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductOptionValue_tenantId_id_key" ON "ProductOptionValue"("tenantId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_tenantId_id_key" ON "ProductVariant"("tenantId", "id");

CREATE INDEX IF NOT EXISTS "ProductImage_tenantId_idx" ON "ProductImage"("tenantId");
CREATE INDEX IF NOT EXISTS "ProductImage_tenantId_productId_idx" ON "ProductImage"("tenantId", "productId");

CREATE INDEX IF NOT EXISTS "ProductOption_tenantId_idx" ON "ProductOption"("tenantId");
CREATE INDEX IF NOT EXISTS "ProductOption_tenantId_productId_idx" ON "ProductOption"("tenantId", "productId");

CREATE INDEX IF NOT EXISTS "ProductOptionValue_tenantId_idx" ON "ProductOptionValue"("tenantId");
CREATE INDEX IF NOT EXISTS "ProductOptionValue_tenantId_optionId_idx" ON "ProductOptionValue"("tenantId", "optionId");

CREATE INDEX IF NOT EXISTS "ProductVariant_tenantId_idx" ON "ProductVariant"("tenantId");
CREATE INDEX IF NOT EXISTS "ProductVariant_tenantId_productId_idx" ON "ProductVariant"("tenantId", "productId");

CREATE INDEX IF NOT EXISTS "ProductVariantImage_tenantId_idx" ON "ProductVariantImage"("tenantId");
CREATE INDEX IF NOT EXISTS "ProductVariantOptionValue_tenantId_idx" ON "ProductVariantOptionValue"("tenantId");

CREATE INDEX IF NOT EXISTS "InventoryMovement_tenantId_idx" ON "InventoryMovement"("tenantId");

CREATE INDEX IF NOT EXISTS "OrderItem_tenantId_idx" ON "OrderItem"("tenantId");
CREATE INDEX IF NOT EXISTS "OrderItem_tenantId_orderId_idx" ON "OrderItem"("tenantId", "orderId");

-- 8) Re-add foreign keys with composite tenant scoping
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_tenantId_categoryId_fkey"
  FOREIGN KEY ("tenantId", "categoryId")
  REFERENCES "Category"("tenantId", "id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductImage"
  ADD CONSTRAINT "ProductImage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductImage"
  ADD CONSTRAINT "ProductImage_tenantId_productId_fkey"
  FOREIGN KEY ("tenantId", "productId") REFERENCES "Product"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductOption"
  ADD CONSTRAINT "ProductOption_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductOption"
  ADD CONSTRAINT "ProductOption_tenantId_productId_fkey"
  FOREIGN KEY ("tenantId", "productId") REFERENCES "Product"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductOptionValue"
  ADD CONSTRAINT "ProductOptionValue_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductOptionValue"
  ADD CONSTRAINT "ProductOptionValue_tenantId_optionId_fkey"
  FOREIGN KEY ("tenantId", "optionId") REFERENCES "ProductOption"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_tenantId_productId_fkey"
  FOREIGN KEY ("tenantId", "productId") REFERENCES "Product"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantOptionValue"
  ADD CONSTRAINT "ProductVariantOptionValue_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantOptionValue"
  ADD CONSTRAINT "ProductVariantOptionValue_tenantId_variantId_fkey"
  FOREIGN KEY ("tenantId", "variantId") REFERENCES "ProductVariant"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantOptionValue"
  ADD CONSTRAINT "ProductVariantOptionValue_tenantId_optionValueId_fkey"
  FOREIGN KEY ("tenantId", "optionValueId") REFERENCES "ProductOptionValue"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantImage"
  ADD CONSTRAINT "ProductVariantImage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantImage"
  ADD CONSTRAINT "ProductVariantImage_tenantId_variantId_fkey"
  FOREIGN KEY ("tenantId", "variantId") REFERENCES "ProductVariant"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantImage"
  ADD CONSTRAINT "ProductVariantImage_tenantId_imageId_fkey"
  FOREIGN KEY ("tenantId", "imageId") REFERENCES "ProductImage"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_tenantId_variantId_fkey"
  FOREIGN KEY ("tenantId", "variantId") REFERENCES "ProductVariant"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Shipment"
  ADD CONSTRAINT "Shipment_tenantId_orderId_fkey"
  FOREIGN KEY ("tenantId", "orderId") REFERENCES "Order"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShipmentEvent"
  ADD CONSTRAINT "ShipmentEvent_tenantId_shipmentId_fkey"
  FOREIGN KEY ("tenantId", "shipmentId") REFERENCES "Shipment"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_tenantId_orderId_fkey"
  FOREIGN KEY ("tenantId", "orderId") REFERENCES "Order"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_tenantId_productId_fkey"
  FOREIGN KEY ("tenantId", "productId") REFERENCES "Product"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_tenantId_variantId_fkey"
  FOREIGN KEY ("tenantId", "variantId") REFERENCES "ProductVariant"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

