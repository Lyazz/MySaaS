-- Backfill "default" variants for products with no options and no variants.
-- This supports consistent inventory/audit logic via ProductVariant for "simple" products.

-- gen_random_uuid() requires pgcrypto.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "ProductVariant" (
  "id",
  "tenantId",
  "productId",
  "sku",
  "price",
  "compareAtPrice",
  "isActive",
  "trackInventory",
  "stock",
  "reserved",
  "safetyStock",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  p."tenantId",
  p."id",
  NULL,
  p."price",
  NULL,
  true,
  true,
  p."stock",
  0,
  0,
  NOW(),
  NOW()
FROM "Product" p
LEFT JOIN "ProductOption" o
  ON o."tenantId" = p."tenantId" AND o."productId" = p."id"
LEFT JOIN "ProductVariant" v
  ON v."tenantId" = p."tenantId" AND v."productId" = p."id"
WHERE o."id" IS NULL AND v."id" IS NULL;

