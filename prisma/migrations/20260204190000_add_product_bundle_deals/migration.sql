-- CreateTable
CREATE TABLE "ProductBundleDeal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "bundleQty" INTEGER NOT NULL,
    "bundlePrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBundleDeal_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "lineTotal" DOUBLE PRECISION;
ALTER TABLE "OrderItem" ADD COLUMN     "pricingBreakdown" JSONB;

-- CreateIndex
CREATE INDEX "ProductBundleDeal_tenantId_idx" ON "ProductBundleDeal"("tenantId");
CREATE INDEX "ProductBundleDeal_tenantId_productId_idx" ON "ProductBundleDeal"("tenantId", "productId");
CREATE INDEX "ProductBundleDeal_tenantId_productId_isActive_idx" ON "ProductBundleDeal"("tenantId", "productId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBundleDeal_tenantId_productId_bundleQty_key" ON "ProductBundleDeal"("tenantId", "productId", "bundleQty");
CREATE UNIQUE INDEX "ProductBundleDeal_tenantId_id_key" ON "ProductBundleDeal"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "ProductBundleDeal" ADD CONSTRAINT "ProductBundleDeal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductBundleDeal" ADD CONSTRAINT "ProductBundleDeal_tenantId_productId_fkey" FOREIGN KEY ("tenantId", "productId") REFERENCES "Product"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

