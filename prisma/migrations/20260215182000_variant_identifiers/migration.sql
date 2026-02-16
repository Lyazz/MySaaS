-- Add SKU/barcode identifiers for field operations.
-- SKU: required, unique per tenant, normalized to [A-Z0-9_-], max 32 chars.
-- barcode: optional, unique per tenant, max 32 chars.

ALTER TABLE "ProductVariant"
ADD COLUMN IF NOT EXISTS "skuLocked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ProductVariant"
ADD COLUMN IF NOT EXISTS "barcode" VARCHAR(32);

-- Normalize existing SKU values where present.
UPDATE "ProductVariant"
SET "sku" = upper(regexp_replace(btrim("sku"), '[^A-Za-z0-9_-]+', '', 'g'))
WHERE "sku" IS NOT NULL;

-- Empty/too-long SKUs are treated as missing and will be regenerated.
UPDATE "ProductVariant"
SET "sku" = NULL
WHERE "sku" IS NOT NULL
  AND (length("sku") = 0 OR length("sku") > 32);

-- Fill missing SKUs with deterministic, tenant-safe values.
UPDATE "ProductVariant" pv
SET "sku" = (
    CASE
        WHEN coalesce(btrim(p."slug"), '') <> '' THEN
            left(upper(regexp_replace(p."slug", '[^A-Za-z0-9_-]+', '', 'g')), 20) || '-' || upper(substring(md5(pv."id"), 1, 8))
        ELSE
            'SKU-' || upper(substring(md5(pv."id"), 1, 8))
    END
)
FROM "Product" p
WHERE pv."tenantId" = p."tenantId"
  AND pv."productId" = p."id"
  AND pv."sku" IS NULL;

-- Deduplicate any remaining SKU collisions (e.g. legacy data) by regenerating for duplicates.
WITH ranked AS (
    SELECT
        pv."id",
        pv."tenantId",
        pv."productId",
        pv."sku",
        row_number() OVER (PARTITION BY pv."tenantId", pv."sku" ORDER BY pv."id") AS rn
    FROM "ProductVariant" pv
)
UPDATE "ProductVariant" pv
SET "sku" = (
    CASE
        WHEN coalesce(btrim(p."slug"), '') <> '' THEN
            left(upper(regexp_replace(p."slug", '[^A-Za-z0-9_-]+', '', 'g')), 20) || '-' || upper(substring(md5(pv."id"), 1, 8))
        ELSE
            'SKU-' || upper(substring(md5(pv."id"), 1, 8))
    END
)
FROM ranked r, "Product" p
WHERE pv."id" = r."id"
  AND r.rn > 1
  AND p."tenantId" = pv."tenantId"
  AND p."id" = pv."productId";

-- Enforce max length + required.
ALTER TABLE "ProductVariant"
ALTER COLUMN "sku" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "sku" SET NOT NULL;

-- Uniqueness (tenant-scoped).
CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_tenantId_sku_key"
ON "ProductVariant"("tenantId", "sku");

CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_tenantId_barcode_key"
ON "ProductVariant"("tenantId", "barcode");
