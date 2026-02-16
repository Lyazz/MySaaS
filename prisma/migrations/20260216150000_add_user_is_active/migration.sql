-- Add user activation flag for tenant user management.

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "User_tenantId_isActive_idx"
ON "User"("tenantId", "isActive");

