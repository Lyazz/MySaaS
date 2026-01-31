-- Suppliers + Purchases (tenant-scoped) and variant cost.
-- Also extends InventoryMovementType with PURCHASE_RECEIPT.

-- Add enum value if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'InventoryMovementType'
      AND e.enumlabel = 'PURCHASE_RECEIPT'
  ) THEN
    ALTER TYPE "InventoryMovementType" ADD VALUE 'PURCHASE_RECEIPT';
  END IF;
END $$;

-- ProductVariant: add cost (prix d'achat)
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "cost" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Supplier
CREATE TABLE IF NOT EXISTS "Supplier" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Supplier_tenantId_idx" ON "Supplier"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_tenantId_name_key" ON "Supplier"("tenantId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_tenantId_id_key" ON "Supplier"("tenantId", "id");

ALTER TABLE "Supplier" DROP CONSTRAINT IF EXISTS "Supplier_tenantId_fkey";
ALTER TABLE "Supplier"
  ADD CONSTRAINT "Supplier_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- PurchaseOrder
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "supplierId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "reference" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'DZD',
  "notes" TEXT,
  "createdByUserId" TEXT,
  "orderedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_idx" ON "PurchaseOrder"("tenantId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_supplierId_idx" ON "PurchaseOrder"("tenantId", "supplierId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_status_idx" ON "PurchaseOrder"("tenantId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_id_key" ON "PurchaseOrder"("tenantId", "id");

ALTER TABLE "PurchaseOrder" DROP CONSTRAINT IF EXISTS "PurchaseOrder_tenantId_fkey";
ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrder" DROP CONSTRAINT IF EXISTS "PurchaseOrder_tenantId_supplierId_fkey";
ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_tenantId_supplierId_fkey"
  FOREIGN KEY ("tenantId", "supplierId") REFERENCES "Supplier"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrder" DROP CONSTRAINT IF EXISTS "PurchaseOrder_tenantId_createdByUserId_fkey";
ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_tenantId_createdByUserId_fkey"
  FOREIGN KEY ("tenantId", "createdByUserId") REFERENCES "User"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- PurchaseOrderItem
CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "quantityOrdered" INTEGER NOT NULL,
  "quantityReceived" INTEGER NOT NULL DEFAULT 0,
  "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "salePrice" DECIMAL(65,30),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_tenantId_idx" ON "PurchaseOrderItem"("tenantId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_tenantId_purchaseOrderId_idx" ON "PurchaseOrderItem"("tenantId", "purchaseOrderId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_tenantId_variantId_idx" ON "PurchaseOrderItem"("tenantId", "variantId");
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrderItem_tenantId_id_key" ON "PurchaseOrderItem"("tenantId", "id");

ALTER TABLE "PurchaseOrderItem" DROP CONSTRAINT IF EXISTS "PurchaseOrderItem_tenantId_fkey";
ALTER TABLE "PurchaseOrderItem"
  ADD CONSTRAINT "PurchaseOrderItem_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrderItem" DROP CONSTRAINT IF EXISTS "PurchaseOrderItem_tenantId_purchaseOrderId_fkey";
ALTER TABLE "PurchaseOrderItem"
  ADD CONSTRAINT "PurchaseOrderItem_tenantId_purchaseOrderId_fkey"
  FOREIGN KEY ("tenantId", "purchaseOrderId") REFERENCES "PurchaseOrder"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrderItem" DROP CONSTRAINT IF EXISTS "PurchaseOrderItem_tenantId_variantId_fkey";
ALTER TABLE "PurchaseOrderItem"
  ADD CONSTRAINT "PurchaseOrderItem_tenantId_variantId_fkey"
  FOREIGN KEY ("tenantId", "variantId") REFERENCES "ProductVariant"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

