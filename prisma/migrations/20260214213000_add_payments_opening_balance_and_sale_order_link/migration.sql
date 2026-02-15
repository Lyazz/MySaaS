-- Add opening balances
ALTER TABLE "Customer" ADD COLUMN "openingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Supplier" ADD COLUMN "openingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Link delivered Orders to Sales (Order -> Sale conversion)
ALTER TABLE "Sale" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'POS';
ALTER TABLE "Sale" ADD COLUMN "orderId" TEXT;

CREATE UNIQUE INDEX "Sale_tenantId_orderId_key" ON "Sale"("tenantId", "orderId");

ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_tenantId_orderId_fkey"
FOREIGN KEY ("tenantId", "orderId") REFERENCES "Order"("tenantId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Customer payments (versements clients)
CREATE TABLE "CustomerPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleId" TEXT,
    "cashTransactionId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerPayment_tenantId_id_key" ON "CustomerPayment"("tenantId", "id");
CREATE UNIQUE INDEX "CustomerPayment_tenantId_cashTransactionId_key" ON "CustomerPayment"("tenantId", "cashTransactionId");

CREATE INDEX "CustomerPayment_tenantId_idx" ON "CustomerPayment"("tenantId");
CREATE INDEX "CustomerPayment_tenantId_customerId_idx" ON "CustomerPayment"("tenantId", "customerId");
CREATE INDEX "CustomerPayment_tenantId_saleId_idx" ON "CustomerPayment"("tenantId", "saleId");

ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_tenantId_customerId_fkey"
FOREIGN KEY ("tenantId", "customerId") REFERENCES "Customer"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_tenantId_saleId_fkey"
FOREIGN KEY ("tenantId", "saleId") REFERENCES "Sale"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_tenantId_cashTransactionId_fkey"
FOREIGN KEY ("tenantId", "cashTransactionId") REFERENCES "CashTransaction"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_tenantId_createdByUserId_fkey"
FOREIGN KEY ("tenantId", "createdByUserId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Supplier payments (versements fournisseurs)
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "cashTransactionId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierPayment_tenantId_id_key" ON "SupplierPayment"("tenantId", "id");
CREATE UNIQUE INDEX "SupplierPayment_tenantId_cashTransactionId_key" ON "SupplierPayment"("tenantId", "cashTransactionId");

CREATE INDEX "SupplierPayment_tenantId_idx" ON "SupplierPayment"("tenantId");
CREATE INDEX "SupplierPayment_tenantId_supplierId_idx" ON "SupplierPayment"("tenantId", "supplierId");
CREATE INDEX "SupplierPayment_tenantId_purchaseOrderId_idx" ON "SupplierPayment"("tenantId", "purchaseOrderId");

ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_tenantId_supplierId_fkey"
FOREIGN KEY ("tenantId", "supplierId") REFERENCES "Supplier"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_tenantId_purchaseOrderId_fkey"
FOREIGN KEY ("tenantId", "purchaseOrderId") REFERENCES "PurchaseOrder"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_tenantId_cashTransactionId_fkey"
FOREIGN KEY ("tenantId", "cashTransactionId") REFERENCES "CashTransaction"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_tenantId_createdByUserId_fkey"
FOREIGN KEY ("tenantId", "createdByUserId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

