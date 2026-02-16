-- CreateEnum
CREATE TYPE "InventoryTrackingMode" AS ENUM ('BULK', 'LOT', 'SERIAL');

-- CreateEnum
CREATE TYPE "InventorySerialStatus" AS ENUM ('IN_STOCK', 'RESERVED', 'SOLD', 'VOID');

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "lotId" TEXT,
ADD COLUMN     "serialItemId" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "inventoryTrackingMode" "InventoryTrackingMode" NOT NULL DEFAULT 'BULK';

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "announcementScrolling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "announcementText" TEXT;

-- CreateTable
CREATE TABLE "TenantIntegration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySerialItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "status" "InventorySerialStatus" NOT NULL DEFAULT 'IN_STOCK',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "reservedOrderId" TEXT,
    "soldOrderId" TEXT,
    "soldSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySerialItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemInventoryAllocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "lotId" TEXT,
    "serialItemId" TEXT,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemInventoryAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItemInventoryAllocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "lotId" TEXT,
    "serialItemId" TEXT,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleItemInventoryAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantIntegration_tenantId_idx" ON "TenantIntegration"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantIntegration_tenantId_provider_key" ON "TenantIntegration"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "InventoryLot_tenantId_idx" ON "InventoryLot"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryLot_tenantId_variantId_idx" ON "InventoryLot"("tenantId", "variantId");

-- CreateIndex
CREATE INDEX "InventoryLot_tenantId_variantId_expiresAt_idx" ON "InventoryLot"("tenantId", "variantId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLot_tenantId_variantId_lotNumber_key" ON "InventoryLot"("tenantId", "variantId", "lotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLot_tenantId_id_key" ON "InventoryLot"("tenantId", "id");

-- CreateIndex
CREATE INDEX "InventorySerialItem_tenantId_idx" ON "InventorySerialItem"("tenantId");

-- CreateIndex
CREATE INDEX "InventorySerialItem_tenantId_variantId_idx" ON "InventorySerialItem"("tenantId", "variantId");

-- CreateIndex
CREATE INDEX "InventorySerialItem_tenantId_status_idx" ON "InventorySerialItem"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InventorySerialItem_tenantId_reservedOrderId_idx" ON "InventorySerialItem"("tenantId", "reservedOrderId");

-- CreateIndex
CREATE INDEX "InventorySerialItem_tenantId_soldOrderId_idx" ON "InventorySerialItem"("tenantId", "soldOrderId");

-- CreateIndex
CREATE INDEX "InventorySerialItem_tenantId_soldSaleId_idx" ON "InventorySerialItem"("tenantId", "soldSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySerialItem_tenantId_serialNumber_key" ON "InventorySerialItem"("tenantId", "serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySerialItem_tenantId_id_key" ON "InventorySerialItem"("tenantId", "id");

-- CreateIndex
CREATE INDEX "OrderItemInventoryAllocation_tenantId_idx" ON "OrderItemInventoryAllocation"("tenantId");

-- CreateIndex
CREATE INDEX "OrderItemInventoryAllocation_tenantId_orderId_idx" ON "OrderItemInventoryAllocation"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "OrderItemInventoryAllocation_tenantId_orderItemId_idx" ON "OrderItemInventoryAllocation"("tenantId", "orderItemId");

-- CreateIndex
CREATE INDEX "OrderItemInventoryAllocation_tenantId_variantId_idx" ON "OrderItemInventoryAllocation"("tenantId", "variantId");

-- CreateIndex
CREATE INDEX "OrderItemInventoryAllocation_tenantId_lotId_idx" ON "OrderItemInventoryAllocation"("tenantId", "lotId");

-- CreateIndex
CREATE INDEX "OrderItemInventoryAllocation_tenantId_serialItemId_idx" ON "OrderItemInventoryAllocation"("tenantId", "serialItemId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItemInventoryAllocation_tenantId_id_key" ON "OrderItemInventoryAllocation"("tenantId", "id");

-- CreateIndex
CREATE INDEX "SaleItemInventoryAllocation_tenantId_idx" ON "SaleItemInventoryAllocation"("tenantId");

-- CreateIndex
CREATE INDEX "SaleItemInventoryAllocation_tenantId_saleId_idx" ON "SaleItemInventoryAllocation"("tenantId", "saleId");

-- CreateIndex
CREATE INDEX "SaleItemInventoryAllocation_tenantId_saleItemId_idx" ON "SaleItemInventoryAllocation"("tenantId", "saleItemId");

-- CreateIndex
CREATE INDEX "SaleItemInventoryAllocation_tenantId_variantId_idx" ON "SaleItemInventoryAllocation"("tenantId", "variantId");

-- CreateIndex
CREATE INDEX "SaleItemInventoryAllocation_tenantId_lotId_idx" ON "SaleItemInventoryAllocation"("tenantId", "lotId");

-- CreateIndex
CREATE INDEX "SaleItemInventoryAllocation_tenantId_serialItemId_idx" ON "SaleItemInventoryAllocation"("tenantId", "serialItemId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleItemInventoryAllocation_tenantId_id_key" ON "SaleItemInventoryAllocation"("tenantId", "id");

-- CreateIndex
CREATE INDEX "InventoryMovement_tenantId_lotId_idx" ON "InventoryMovement"("tenantId", "lotId");

-- CreateIndex
CREATE INDEX "InventoryMovement_tenantId_serialItemId_idx" ON "InventoryMovement"("tenantId", "serialItemId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_tenantId_id_key" ON "OrderItem"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "SaleItem_tenantId_id_key" ON "SaleItem"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "TenantIntegration" ADD CONSTRAINT "TenantIntegration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_tenantId_lotId_fkey" FOREIGN KEY ("tenantId", "lotId") REFERENCES "InventoryLot"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_tenantId_serialItemId_fkey" FOREIGN KEY ("tenantId", "serialItemId") REFERENCES "InventorySerialItem"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_tenantId_variantId_fkey" FOREIGN KEY ("tenantId", "variantId") REFERENCES "ProductVariant"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySerialItem" ADD CONSTRAINT "InventorySerialItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySerialItem" ADD CONSTRAINT "InventorySerialItem_tenantId_variantId_fkey" FOREIGN KEY ("tenantId", "variantId") REFERENCES "ProductVariant"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySerialItem" ADD CONSTRAINT "InventorySerialItem_tenantId_reservedOrderId_fkey" FOREIGN KEY ("tenantId", "reservedOrderId") REFERENCES "Order"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySerialItem" ADD CONSTRAINT "InventorySerialItem_tenantId_soldOrderId_fkey" FOREIGN KEY ("tenantId", "soldOrderId") REFERENCES "Order"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySerialItem" ADD CONSTRAINT "InventorySerialItem_tenantId_soldSaleId_fkey" FOREIGN KEY ("tenantId", "soldSaleId") REFERENCES "Sale"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemInventoryAllocation" ADD CONSTRAINT "OrderItemInventoryAllocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemInventoryAllocation" ADD CONSTRAINT "OrderItemInventoryAllocation_tenantId_orderId_fkey" FOREIGN KEY ("tenantId", "orderId") REFERENCES "Order"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemInventoryAllocation" ADD CONSTRAINT "OrderItemInventoryAllocation_tenantId_orderItemId_fkey" FOREIGN KEY ("tenantId", "orderItemId") REFERENCES "OrderItem"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemInventoryAllocation" ADD CONSTRAINT "OrderItemInventoryAllocation_tenantId_variantId_fkey" FOREIGN KEY ("tenantId", "variantId") REFERENCES "ProductVariant"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemInventoryAllocation" ADD CONSTRAINT "OrderItemInventoryAllocation_tenantId_lotId_fkey" FOREIGN KEY ("tenantId", "lotId") REFERENCES "InventoryLot"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemInventoryAllocation" ADD CONSTRAINT "OrderItemInventoryAllocation_tenantId_serialItemId_fkey" FOREIGN KEY ("tenantId", "serialItemId") REFERENCES "InventorySerialItem"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItemInventoryAllocation" ADD CONSTRAINT "SaleItemInventoryAllocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItemInventoryAllocation" ADD CONSTRAINT "SaleItemInventoryAllocation_tenantId_saleId_fkey" FOREIGN KEY ("tenantId", "saleId") REFERENCES "Sale"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItemInventoryAllocation" ADD CONSTRAINT "SaleItemInventoryAllocation_tenantId_saleItemId_fkey" FOREIGN KEY ("tenantId", "saleItemId") REFERENCES "SaleItem"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItemInventoryAllocation" ADD CONSTRAINT "SaleItemInventoryAllocation_tenantId_variantId_fkey" FOREIGN KEY ("tenantId", "variantId") REFERENCES "ProductVariant"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItemInventoryAllocation" ADD CONSTRAINT "SaleItemInventoryAllocation_tenantId_lotId_fkey" FOREIGN KEY ("tenantId", "lotId") REFERENCES "InventoryLot"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItemInventoryAllocation" ADD CONSTRAINT "SaleItemInventoryAllocation_tenantId_serialItemId_fkey" FOREIGN KEY ("tenantId", "serialItemId") REFERENCES "InventorySerialItem"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
