-- CreateTable
CREATE TABLE "TenantDeliveryAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "ShipmentProvider" NOT NULL,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDeliveryAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantDeliveryAccount_tenantId_idx" ON "TenantDeliveryAccount"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantDeliveryAccount_tenantId_provider_key" ON "TenantDeliveryAccount"("tenantId", "provider");

-- AddForeignKey
ALTER TABLE "TenantDeliveryAccount" ADD CONSTRAINT "TenantDeliveryAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

