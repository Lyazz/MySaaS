-- Add tenant-scoped staff roles + permissions (CRUD per resource).

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "staffRoleId" TEXT;

CREATE TABLE IF NOT EXISTS "TenantStaffRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantStaffRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantStaffRole_tenantId_name_key"
ON "TenantStaffRole"("tenantId", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "TenantStaffRole_tenantId_id_key"
ON "TenantStaffRole"("tenantId", "id");

CREATE INDEX IF NOT EXISTS "TenantStaffRole_tenantId_idx"
ON "TenantStaffRole"("tenantId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TenantStaffRole_tenantId_fkey'
    ) THEN
        ALTER TABLE "TenantStaffRole"
        ADD CONSTRAINT "TenantStaffRole_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TenantStaffRolePermission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantStaffRolePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantStaffRolePermission_tenantId_roleId_resource_action_key"
ON "TenantStaffRolePermission"("tenantId", "roleId", "resource", "action");

CREATE INDEX IF NOT EXISTS "TenantStaffRolePermission_tenantId_idx"
ON "TenantStaffRolePermission"("tenantId");

CREATE INDEX IF NOT EXISTS "TenantStaffRolePermission_tenantId_roleId_idx"
ON "TenantStaffRolePermission"("tenantId", "roleId");

CREATE INDEX IF NOT EXISTS "TenantStaffRolePermission_tenantId_resource_idx"
ON "TenantStaffRolePermission"("tenantId", "resource");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TenantStaffRolePermission_tenantId_fkey'
    ) THEN
        ALTER TABLE "TenantStaffRolePermission"
        ADD CONSTRAINT "TenantStaffRolePermission_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TenantStaffRolePermission_tenantId_roleId_fkey'
    ) THEN
        ALTER TABLE "TenantStaffRolePermission"
        ADD CONSTRAINT "TenantStaffRolePermission_tenantId_roleId_fkey"
        FOREIGN KEY ("tenantId", "roleId") REFERENCES "TenantStaffRole"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'User_tenantId_staffRoleId_fkey'
    ) THEN
        ALTER TABLE "User"
        ADD CONSTRAINT "User_tenantId_staffRoleId_fkey"
        FOREIGN KEY ("tenantId", "staffRoleId") REFERENCES "TenantStaffRole"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_tenantId_staffRoleId_idx"
ON "User"("tenantId", "staffRoleId");
