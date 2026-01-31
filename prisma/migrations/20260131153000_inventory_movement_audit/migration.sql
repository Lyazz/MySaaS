-- Inventory movement audit improvements
-- - Add enum type and richer movement metadata/snapshots
-- - Add tenant-scoped foreign keys for order + createdBy user
-- - Fix Product->Category composite FK (SET NULL is invalid with composite tenantId)

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "InventoryMovementType" AS ENUM (
    'MANUAL_ADJUSTMENT',
    'MANUAL_SET',
    'ORDER_DECREMENT',
    'RESERVED_ADJUSTMENT',
    'SAFETY_STOCK_CHANGE',
    'TRACKING_CHANGE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Fix composite FK action (tenantId cannot be SET NULL)
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_tenantId_categoryId_fkey";
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_tenantId_categoryId_fkey"
  FOREIGN KEY ("tenantId", "categoryId")
  REFERENCES "Category"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "InventoryMovement"
  ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "reservedAfter" INTEGER,
  ADD COLUMN IF NOT EXISTS "reservedDelta" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "safetyStockAfter" INTEGER,
  ADD COLUMN IF NOT EXISTS "safetyStockDelta" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "stockAfter" INTEGER,
  ADD COLUMN IF NOT EXISTS "type" "InventoryMovementType" NOT NULL DEFAULT 'MANUAL_ADJUSTMENT';

-- Indexes
CREATE INDEX IF NOT EXISTS "InventoryMovement_tenantId_variantId_createdAt_idx"
  ON "InventoryMovement"("tenantId", "variantId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryMovement_tenantId_orderId_idx"
  ON "InventoryMovement"("tenantId", "orderId");

-- Needed for composite FK to User(tenantId, id)
CREATE UNIQUE INDEX IF NOT EXISTS "User_tenantId_id_key" ON "User"("tenantId", "id");

-- Foreign keys
ALTER TABLE "InventoryMovement" DROP CONSTRAINT IF EXISTS "InventoryMovement_tenantId_orderId_fkey";
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_tenantId_orderId_fkey"
  FOREIGN KEY ("tenantId", "orderId")
  REFERENCES "Order"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryMovement" DROP CONSTRAINT IF EXISTS "InventoryMovement_tenantId_createdByUserId_fkey";
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_tenantId_createdByUserId_fkey"
  FOREIGN KEY ("tenantId", "createdByUserId")
  REFERENCES "User"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

