-- Add missing columns that were added via db push but not captured in migrations
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "isOffline" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "faviconUrl" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "callStatus" TEXT NOT NULL DEFAULT 'not_called';
