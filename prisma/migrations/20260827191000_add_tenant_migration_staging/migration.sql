-- Rows uploaded by a migrating device, held until the super admin applies them.
--
-- Staged rather than written straight into the live tables so that `apply` is a
-- single transaction: a dropped upload leaves a discardable staging set, never a
-- half-migrated tenant.
CREATE TABLE "TenantMigrationStagingRow" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMigrationStagingRow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenantMigrationStagingRow_jobId_idx" ON "TenantMigrationStagingRow"("jobId");
CREATE INDEX "TenantMigrationStagingRow_jobId_domain_idx" ON "TenantMigrationStagingRow"("jobId", "domain");

ALTER TABLE "TenantMigrationStagingRow" ADD CONSTRAINT "TenantMigrationStagingRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TenantMigrationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
