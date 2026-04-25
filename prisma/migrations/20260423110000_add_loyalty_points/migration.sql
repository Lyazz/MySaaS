DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerPointsDirection') THEN
        CREATE TYPE "CustomerPointsDirection" AS ENUM ('EARN', 'REDEEM', 'ADJUST');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerPointsStatus') THEN
        CREATE TYPE "CustomerPointsStatus" AS ENUM ('PENDING', 'AVAILABLE', 'CANCELLED', 'CONSUMED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomerPointsSourceType') THEN
        CREATE TYPE "CustomerPointsSourceType" AS ENUM ('SALE', 'ORDER', 'MANUAL');
    END IF;
END $$;

CREATE OR REPLACE FUNCTION normalize_dz_phone(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    digits TEXT;
BEGIN
    digits := regexp_replace(COALESCE(input_text, ''), '\D', '', 'g');

    IF digits ~ '^0(5|6|7)[0-9]{8}$' THEN
        RETURN '213' || substr(digits, 2);
    END IF;
    IF digits ~ '^(5|6|7)[0-9]{8}$' THEN
        RETURN '213' || digits;
    END IF;
    IF digits ~ '^213(5|6|7)[0-9]{8}$' THEN
        RETURN digits;
    END IF;
    IF digits ~ '^00213(5|6|7)[0-9]{8}$' THEN
        RETURN substr(digits, 3);
    END IF;

    RETURN NULLIF(digits, '');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE "StoreSettings"
    ADD COLUMN "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "loyaltyMinRedeemPoints" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "loyaltyRedeemRateDzdPerPoint" DECIMAL(12,4) NOT NULL DEFAULT 1,
    ADD COLUMN "loyaltyBasePoints" DECIMAL(12,4) NOT NULL DEFAULT 0,
    ADD COLUMN "loyaltyMarginFactor" DECIMAL(12,4) NOT NULL DEFAULT 0,
    ADD COLUMN "loyaltyPublicFormulaMode" TEXT NOT NULL DEFAULT 'SUMMARY';

ALTER TABLE "Customer"
    ADD COLUMN "phoneNormalized" TEXT,
    ADD COLUMN "phoneRaw" TEXT;

UPDATE "Customer"
SET
    "phoneRaw" = COALESCE("phoneRaw", "phone"),
    "phoneNormalized" = COALESCE(normalize_dz_phone("phone"), regexp_replace(COALESCE("phone", ''), '\D', '', 'g'))
WHERE "phoneNormalized" IS NULL;

ALTER TABLE "Customer"
    ALTER COLUMN "phoneNormalized" SET NOT NULL;

DROP INDEX IF EXISTS "Customer_tenantId_phone_key";
CREATE UNIQUE INDEX "Customer_tenantId_phoneNormalized_key" ON "Customer"("tenantId", "phoneNormalized");
CREATE INDEX "Customer_tenantId_phone_idx" ON "Customer"("tenantId", "phone");
CREATE INDEX "Customer_tenantId_phoneNormalized_idx" ON "Customer"("tenantId", "phoneNormalized");

ALTER TABLE "Sale"
    ADD COLUMN "earnedPointsTotal" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "redeemedPointsTotal" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "redeemedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "Order"
    ADD COLUMN "earnedPointsTotal" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "redeemedPointsTotal" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "redeemedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE "CustomerPointsLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "direction" "CustomerPointsDirection" NOT NULL,
    "status" "CustomerPointsStatus" NOT NULL,
    "sourceType" "CustomerPointsSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "saleId" TEXT,
    "orderId" TEXT,
    "formulaSnapshot" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPointsLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerPointsLedger_tenantId_sourceType_sourceId_direction_key"
    ON "CustomerPointsLedger"("tenantId", "sourceType", "sourceId", "direction");
CREATE UNIQUE INDEX "CustomerPointsLedger_tenantId_id_key"
    ON "CustomerPointsLedger"("tenantId", "id");
CREATE INDEX "CustomerPointsLedger_tenantId_idx"
    ON "CustomerPointsLedger"("tenantId");
CREATE INDEX "CustomerPointsLedger_tenantId_customerId_createdAt_idx"
    ON "CustomerPointsLedger"("tenantId", "customerId", "createdAt");
CREATE INDEX "CustomerPointsLedger_tenantId_customerId_status_idx"
    ON "CustomerPointsLedger"("tenantId", "customerId", "status");
CREATE INDEX "CustomerPointsLedger_tenantId_saleId_idx"
    ON "CustomerPointsLedger"("tenantId", "saleId");
CREATE INDEX "CustomerPointsLedger_tenantId_orderId_idx"
    ON "CustomerPointsLedger"("tenantId", "orderId");

ALTER TABLE "CustomerPointsLedger"
    ADD CONSTRAINT "CustomerPointsLedger_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "CustomerPointsLedger_tenantId_customerId_fkey"
        FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "CustomerPointsLedger_tenantId_saleId_fkey"
        FOREIGN KEY ("tenantId", "saleId") REFERENCES "Sale"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "CustomerPointsLedger_tenantId_orderId_fkey"
        FOREIGN KEY ("tenantId", "orderId") REFERENCES "Order"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "CustomerPointsLedger_tenantId_createdByUserId_fkey"
        FOREIGN KEY ("tenantId", "createdByUserId") REFERENCES "User"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
