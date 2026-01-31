-- Ensure order-linked inventory movements don't block cleanup/deletions
ALTER TABLE "InventoryMovement" DROP CONSTRAINT IF EXISTS "InventoryMovement_tenantId_orderId_fkey";
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_tenantId_orderId_fkey"
  FOREIGN KEY ("tenantId", "orderId")
  REFERENCES "Order"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

