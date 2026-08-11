-- Merchant-controlled "closed for maintenance" toggle: blocks the public storefront
-- while the admin panel stays reachable so the tenant can turn it back off.
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "maintenanceMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "maintenanceMessage" TEXT;
