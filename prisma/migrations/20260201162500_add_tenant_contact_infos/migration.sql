-- CreateTable
CREATE TABLE "TenantContactInfo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantContactInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantContactInfo_tenantId_idx" ON "TenantContactInfo"("tenantId");

-- CreateIndex
CREATE INDEX "TenantContactInfo_tenantId_kind_idx" ON "TenantContactInfo"("tenantId", "kind");

-- CreateIndex
CREATE INDEX "TenantContactInfo_tenantId_position_idx" ON "TenantContactInfo"("tenantId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TenantContactInfo_tenantId_id_key" ON "TenantContactInfo"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "TenantContactInfo" ADD CONSTRAINT "TenantContactInfo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
