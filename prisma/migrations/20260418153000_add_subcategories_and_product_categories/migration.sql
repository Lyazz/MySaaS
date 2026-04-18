-- Add hierarchical categories (parent/child)
ALTER TABLE "Category"
  ADD COLUMN IF NOT EXISTS "parentId" TEXT;

CREATE INDEX IF NOT EXISTS "Category_tenantId_parentId_idx" ON "Category"("tenantId", "parentId");

ALTER TABLE "Category"
  DROP CONSTRAINT IF EXISTS "Category_tenantId_parentId_fkey";

ALTER TABLE "Category"
  ADD CONSTRAINT "Category_tenantId_parentId_fkey"
  FOREIGN KEY ("tenantId", "parentId")
  REFERENCES "Category"("tenantId", "id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add many-to-many tenant-scoped product/category links
CREATE TABLE IF NOT EXISTS "ProductCategory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductCategory_tenantId_idx" ON "ProductCategory"("tenantId");
CREATE INDEX IF NOT EXISTS "ProductCategory_tenantId_productId_idx" ON "ProductCategory"("tenantId", "productId");
CREATE INDEX IF NOT EXISTS "ProductCategory_tenantId_categoryId_idx" ON "ProductCategory"("tenantId", "categoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductCategory_tenantId_productId_categoryId_key" ON "ProductCategory"("tenantId", "productId", "categoryId");

ALTER TABLE "ProductCategory"
  DROP CONSTRAINT IF EXISTS "ProductCategory_tenantId_fkey";
ALTER TABLE "ProductCategory"
  DROP CONSTRAINT IF EXISTS "ProductCategory_tenantId_productId_fkey";
ALTER TABLE "ProductCategory"
  DROP CONSTRAINT IF EXISTS "ProductCategory_tenantId_categoryId_fkey";

ALTER TABLE "ProductCategory"
  ADD CONSTRAINT "ProductCategory_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductCategory"
  ADD CONSTRAINT "ProductCategory_tenantId_productId_fkey"
  FOREIGN KEY ("tenantId", "productId") REFERENCES "Product"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductCategory"
  ADD CONSTRAINT "ProductCategory_tenantId_categoryId_fkey"
  FOREIGN KEY ("tenantId", "categoryId") REFERENCES "Category"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill links from legacy Product.categoryId
INSERT INTO "ProductCategory" ("id", "tenantId", "productId", "categoryId")
SELECT
  md5(random()::text || clock_timestamp()::text || p."id" || p."categoryId") AS "id",
  p."tenantId",
  p."id" AS "productId",
  p."categoryId"
FROM "Product" p
WHERE p."categoryId" IS NOT NULL
ON CONFLICT ("tenantId", "productId", "categoryId") DO NOTHING;
