DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BlacklistType') THEN
        CREATE TYPE "BlacklistType" AS ENUM ('PHONE', 'CUSTOMER', 'IP');
    END IF;
END $$;

-- "customerIp" was declared on the Order model previously but never actually migrated; add it now
-- since fraud checks need it to record the checkout IP for later IP-based blacklisting.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerIp" TEXT;

CREATE TABLE "BlacklistEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "BlacklistType" NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "customerId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlacklistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlacklistEntry_tenantId_type_value_key"
    ON "BlacklistEntry"("tenantId", "type", "value");
CREATE INDEX "BlacklistEntry_tenantId_type_idx"
    ON "BlacklistEntry"("tenantId", "type");
CREATE INDEX "BlacklistEntry_tenantId_customerId_idx"
    ON "BlacklistEntry"("tenantId", "customerId");

ALTER TABLE "BlacklistEntry"
    ADD CONSTRAINT "BlacklistEntry_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "BlacklistEntry_tenantId_customerId_fkey"
        FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "BlacklistEntry_tenantId_createdByUserId_fkey"
        FOREIGN KEY ("tenantId", "createdByUserId") REFERENCES "User"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
