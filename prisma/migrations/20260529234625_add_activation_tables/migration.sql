CREATE TABLE IF NOT EXISTS "License" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "maxDevices" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Device" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "deviceName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "License_licenseKey_key"
    ON "License"("licenseKey");

CREATE INDEX IF NOT EXISTS "License_tenantId_idx"
    ON "License"("tenantId");

CREATE UNIQUE INDEX IF NOT EXISTS "Device_licenseId_hardwareId_key"
    ON "Device"("licenseId", "hardwareId");

CREATE INDEX IF NOT EXISTS "Device_tenantId_idx"
    ON "Device"("tenantId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'License_tenantId_fkey'
    ) THEN
        ALTER TABLE "License"
            ADD CONSTRAINT "License_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Device_tenantId_fkey'
    ) THEN
        ALTER TABLE "Device"
            ADD CONSTRAINT "Device_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Device_licenseId_fkey'
    ) THEN
        ALTER TABLE "Device"
            ADD CONSTRAINT "Device_licenseId_fkey"
            FOREIGN KEY ("licenseId") REFERENCES "License"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END
$$;
