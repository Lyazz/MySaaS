-- CreateTable
CREATE TABLE "DeliveryCarrierRateCache" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "ShipmentProvider" NOT NULL,
    "deliveryMode" TEXT NOT NULL,
    "serviceLevel" TEXT,
    "rates" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryCarrierRateCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryCarrierRateCache_tenantId_idx" ON "DeliveryCarrierRateCache"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryCarrierRateCache_tenantId_provider_deliveryMode_key" ON "DeliveryCarrierRateCache"("tenantId", "provider", "deliveryMode");

-- AddForeignKey
ALTER TABLE "DeliveryCarrierRateCache" ADD CONSTRAINT "DeliveryCarrierRateCache_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
