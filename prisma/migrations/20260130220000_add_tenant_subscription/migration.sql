-- Ensure enum values exist (some environments were created via db push without migrations)
ALTER TYPE "ShipmentProvider" ADD VALUE IF NOT EXISTS 'ECOTRACK';
ALTER TYPE "ShipmentProvider" ADD VALUE IF NOT EXISTS 'ZR_EXPRESS';

-- Ensure StoreSettings columns exist (backfill for drifted environments)
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "allowedDeliveryProviders" TEXT[] NOT NULL DEFAULT ARRAY['SELF']::TEXT[];
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TenantSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'month',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TenantSubscription_tenantId_key" ON "TenantSubscription"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TenantSubscription_planCode_idx" ON "TenantSubscription"("planCode");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TenantSubscription_tenantId_fkey'
    ) THEN
        ALTER TABLE "TenantSubscription"
            ADD CONSTRAINT "TenantSubscription_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

