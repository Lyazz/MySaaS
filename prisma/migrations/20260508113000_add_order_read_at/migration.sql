ALTER TABLE "Order"
  ADD COLUMN "readAt" TIMESTAMP(3);

CREATE INDEX "Order_tenantId_readAt_idx" ON "Order"("tenantId", "readAt");
