-- Backfill columns that exist in schema.prisma but were never actually added by a migration.
-- Discovered while validating the order-blacklist feature end-to-end against a freshly
-- migrated database (schema.prisma and the applied migration history had drifted apart).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
