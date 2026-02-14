-- CreateTable
CREATE TABLE "Cashbox" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cashbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cashboxId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openingFloat" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "closingCount" DECIMAL(65,30),
    "expectedClosing" DECIMAL(65,30),
    "difference" DECIMAL(65,30),
    "note" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openedByUserId" TEXT,
    "closedByUserId" TEXT,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cashboxId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "customerId" TEXT,
    "supplierId" TEXT,
    "saleId" TEXT,
    "orderId" TEXT,
    "purchaseOrderId" TEXT,
    "expenseCategory" TEXT,
    "transferGroupId" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cashbox_tenantId_idx" ON "Cashbox"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Cashbox_tenantId_name_key" ON "Cashbox"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Cashbox_tenantId_id_key" ON "Cashbox"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CashSession_tenantId_idx" ON "CashSession"("tenantId");

-- CreateIndex
CREATE INDEX "CashSession_tenantId_cashboxId_idx" ON "CashSession"("tenantId", "cashboxId");

-- CreateIndex
CREATE INDEX "CashSession_tenantId_cashboxId_status_idx" ON "CashSession"("tenantId", "cashboxId", "status");

-- CreateIndex
CREATE INDEX "CashSession_tenantId_openedAt_idx" ON "CashSession"("tenantId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashSession_tenantId_id_key" ON "CashSession"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CashTransaction_tenantId_idx" ON "CashTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "CashTransaction_tenantId_cashboxId_createdAt_idx" ON "CashTransaction"("tenantId", "cashboxId", "createdAt");

-- CreateIndex
CREATE INDEX "CashTransaction_tenantId_sessionId_createdAt_idx" ON "CashTransaction"("tenantId", "sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "CashTransaction_tenantId_customerId_idx" ON "CashTransaction"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "CashTransaction_tenantId_supplierId_idx" ON "CashTransaction"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "CashTransaction_tenantId_saleId_idx" ON "CashTransaction"("tenantId", "saleId");

-- CreateIndex
CREATE INDEX "CashTransaction_tenantId_orderId_idx" ON "CashTransaction"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "CashTransaction_tenantId_purchaseOrderId_idx" ON "CashTransaction"("tenantId", "purchaseOrderId");

-- CreateIndex
CREATE INDEX "CashTransaction_tenantId_transferGroupId_idx" ON "CashTransaction"("tenantId", "transferGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "CashTransaction_tenantId_id_key" ON "CashTransaction"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "Cashbox" ADD CONSTRAINT "Cashbox_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_tenantId_cashboxId_fkey" FOREIGN KEY ("tenantId", "cashboxId") REFERENCES "Cashbox"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_tenantId_openedByUserId_fkey" FOREIGN KEY ("tenantId", "openedByUserId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_tenantId_closedByUserId_fkey" FOREIGN KEY ("tenantId", "closedByUserId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_tenantId_cashboxId_fkey" FOREIGN KEY ("tenantId", "cashboxId") REFERENCES "Cashbox"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_tenantId_sessionId_fkey" FOREIGN KEY ("tenantId", "sessionId") REFERENCES "CashSession"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_tenantId_supplierId_fkey" FOREIGN KEY ("tenantId", "supplierId") REFERENCES "Supplier"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_tenantId_saleId_fkey" FOREIGN KEY ("tenantId", "saleId") REFERENCES "Sale"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_tenantId_orderId_fkey" FOREIGN KEY ("tenantId", "orderId") REFERENCES "Order"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_tenantId_purchaseOrderId_fkey" FOREIGN KEY ("tenantId", "purchaseOrderId") REFERENCES "PurchaseOrder"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_tenantId_createdByUserId_fkey" FOREIGN KEY ("tenantId", "createdByUserId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

