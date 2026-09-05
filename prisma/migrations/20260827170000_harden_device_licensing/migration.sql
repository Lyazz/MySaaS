-- Device-bound licensing: rolling offline window, revocation, and audit indexes.
--
-- Hand-written rather than generated, because `prisma migrate diff` also picks up
-- pre-existing drift in ProductVariant, StoreSettings, CustomerPointsLedger and a
-- NotificationDelivery index rename. None of that belongs in this change.

-- AlterTable: the rolling offline window, per license so a super admin can widen
-- it for a tenant who genuinely has no connectivity.
ALTER TABLE "License"
    ADD COLUMN "offlineValidityDays" INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN "graceDays" INTEGER NOT NULL DEFAULT 7;

-- AlterTable: what the device believes, mirrored server-side, plus revocation.
ALTER TABLE "Device"
    ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "licenseExpiresAt" TIMESTAMP(3),
    ADD COLUMN "graceUntil" TIMESTAMP(3),
    ADD COLUMN "lastSeenAt" TIMESTAMP(3),
    ADD COLUMN "appVersion" TEXT,
    ADD COLUMN "revokedAt" TIMESTAMP(3),
    ADD COLUMN "revokedByUserId" TEXT,
    ADD COLUMN "revokedReason" TEXT,
    ADD COLUMN "drainUntil" TIMESTAMP(3);

-- Backfill 1: give every device already in the field a full window starting now.
-- Without this, enabling enforcement would lock every existing device instantly,
-- because a NULL window reads as "expired". Derived from the per-license columns
-- rather than hardcoded, so it stays correct if the defaults ever change.
UPDATE "Device" d
   SET "licenseExpiresAt" = NOW() + ((l."offlineValidityDays")::text || ' days')::interval,
       "graceUntil"       = NOW() + ((l."offlineValidityDays" + l."graceDays")::text || ' days')::interval
  FROM "License" l
 WHERE l."id" = d."licenseId"
   AND d."status" = 'ACTIVE';

-- Backfill 2: the anti-brick step.
--
-- Seat enforcement has been broken (login swallowed the seat-check failure, and
-- /api/provisioning/activate bypassed it entirely), so some licenses already have
-- more ACTIVE devices than maxDevices allows. Turning enforcement on without this
-- would revoke all but one of them, at random. A license keeps everyone it has;
-- reducing a seat count is a deliberate super-admin action, never a migration.
UPDATE "License" l
   SET "maxDevices" = GREATEST(l."maxDevices", c.active_count)
  FROM (
        SELECT "licenseId", COUNT(*) AS active_count
          FROM "Device"
         WHERE "status" = 'ACTIVE'
      GROUP BY "licenseId"
       ) c
 WHERE c."licenseId" = l."id";

-- CreateIndex: the super-admin device panel filters on these.
CREATE INDEX "Device_tenantId_status_idx" ON "Device"("tenantId", "status");
CREATE INDEX "Device_hardwareId_idx" ON "Device"("hardwareId");

-- CreateIndex: AuditLog had no indexes at all, which makes the device audit
-- trail added in phase 3 unusable at any real row count.
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_targetId_idx" ON "AuditLog"("targetId");
