-- Configurable fraud prevention: enable/disable blacklist enforcement and duplicate-order throttling per tenant.
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "blacklistEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "duplicateOrderLimitEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "duplicateOrderLimit" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "duplicateOrderWindowHours" INTEGER NOT NULL DEFAULT 24;
