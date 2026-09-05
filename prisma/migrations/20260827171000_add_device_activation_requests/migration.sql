-- Device activation requests: a device asking for a seat it cannot claim itself.
--
-- Schema only. The endpoints that read and write this table land in phase 3; it
-- ships early so the approve/deny flow can be built without a second migration.

-- CreateEnum
CREATE TYPE "DeviceActivationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DeviceActivationRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "deviceName" TEXT,
    "devicePlatform" TEXT,
    "replacesDeviceId" TEXT,
    "requestedByUserId" TEXT,
    "reason" TEXT,
    "status" "DeviceActivationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "decisionNote" TEXT,
    "claimCode" TEXT,
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceActivationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceActivationRequest_claimCode_key" ON "DeviceActivationRequest"("claimCode");

-- CreateIndex
CREATE INDEX "DeviceActivationRequest_tenantId_status_idx" ON "DeviceActivationRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DeviceActivationRequest_tenantId_createdAt_idx" ON "DeviceActivationRequest"("tenantId", "createdAt");

-- CreateIndex: one pending request per device, enforced by the database.
--
-- Prisma cannot express a partial unique index, so this is raw SQL and has no
-- counterpart in schema.prisma. It is what stops a device that keeps retrying
-- from filling the super admin's approval queue with duplicates, and it makes
-- the "create a request" endpoint naturally idempotent.
CREATE UNIQUE INDEX "DeviceActivationRequest_tenant_hardware_pending_key"
    ON "DeviceActivationRequest"("tenantId", "hardwareId")
 WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "DeviceActivationRequest" ADD CONSTRAINT "DeviceActivationRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceActivationRequest" ADD CONSTRAINT "DeviceActivationRequest_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;
