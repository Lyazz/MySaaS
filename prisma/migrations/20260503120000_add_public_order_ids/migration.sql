ALTER TABLE "StoreSettings"
  ADD COLUMN "orderIdPrefix" TEXT NOT NULL DEFAULT 'ORDR';

ALTER TABLE "Order"
  ADD COLUMN "publicId" TEXT;

UPDATE "Order"
SET "publicId" = CONCAT('ORDR-', UPPER(SUBSTRING(MD5(id || random()::text || clock_timestamp()::text) FROM 1 FOR 6)))
WHERE "publicId" IS NULL;

CREATE UNIQUE INDEX "Order_tenantId_publicId_key" ON "Order"("tenantId", "publicId");
