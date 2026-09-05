-- Super-admin-driven import of an offline tenant's local database.
--
-- Hand-written: `prisma migrate diff` also sweeps in pre-existing drift in
-- ProductVariant, StoreSettings, CustomerPointsLedger and a NotificationDelivery
-- index rename, none of which belongs to this change.

-- CreateEnum
CREATE TYPE "TenantMigrationStatus" AS ENUM ('DRAFT', 'UPLOADING', 'VALIDATED', 'APPLIED', 'FAILED');

-- CreateTable
CREATE TABLE "TenantMigrationJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT,
    "status" "TenantMigrationStatus" NOT NULL DEFAULT 'DRAFT',
    "declaredCounts" JSONB,
    "appliedCounts" JSONB,
    "errors" JSONB,
    "startedByUserId" TEXT,
    "appliedByUserId" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantMigrationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantMigrationJob_tenantId_status_idx" ON "TenantMigrationJob"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "TenantMigrationJob" ADD CONSTRAINT "TenantMigrationJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
