-- CreateEnum
CREATE TYPE "MaystroSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'ERROR');

-- CreateTable
CREATE TABLE "MaystroProductMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "localProductId" TEXT NOT NULL,
    "maystroProductId" TEXT NOT NULL,
    "maystroUuid" TEXT,
    "syncStatus" "MaystroSyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaystroProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaystroOrderMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "localOrderId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "maystroOrderId" TEXT,
    "tracking" TEXT,
    "deliveryPrice" DECIMAL(65,30),
    "success" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaystroOrderMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaystroInventoryEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "maystroProductId" TEXT,
    "direction" TEXT,
    "quantity" INTEGER,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaystroInventoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaystroProductMapping_tenantId_idx" ON "MaystroProductMapping"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MaystroProductMapping_tenantId_localProductId_key" ON "MaystroProductMapping"("tenantId", "localProductId");

-- CreateIndex
CREATE UNIQUE INDEX "MaystroProductMapping_tenantId_maystroProductId_key" ON "MaystroProductMapping"("tenantId", "maystroProductId");

-- CreateIndex
CREATE INDEX "MaystroOrderMapping_tenantId_idx" ON "MaystroOrderMapping"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MaystroOrderMapping_tenantId_localOrderId_key" ON "MaystroOrderMapping"("tenantId", "localOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "MaystroOrderMapping_tenantId_externalId_key" ON "MaystroOrderMapping"("tenantId", "externalId");

-- CreateIndex
CREATE INDEX "MaystroInventoryEvent_tenantId_idx" ON "MaystroInventoryEvent"("tenantId");

-- CreateIndex
CREATE INDEX "MaystroInventoryEvent_tenantId_createdAt_idx" ON "MaystroInventoryEvent"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "MaystroProductMapping" ADD CONSTRAINT "MaystroProductMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaystroProductMapping" ADD CONSTRAINT "MaystroProductMapping_tenantId_localProductId_fkey" FOREIGN KEY ("tenantId", "localProductId") REFERENCES "Product"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaystroOrderMapping" ADD CONSTRAINT "MaystroOrderMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaystroOrderMapping" ADD CONSTRAINT "MaystroOrderMapping_tenantId_localOrderId_fkey" FOREIGN KEY ("tenantId", "localOrderId") REFERENCES "Order"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaystroInventoryEvent" ADD CONSTRAINT "MaystroInventoryEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

