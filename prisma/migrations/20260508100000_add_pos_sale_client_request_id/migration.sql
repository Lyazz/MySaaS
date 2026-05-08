-- Make offline POS sync retries idempotent per tenant.
ALTER TABLE "Sale" ADD COLUMN "clientRequestId" TEXT;

CREATE UNIQUE INDEX "Sale_tenantId_clientRequestId_key"
  ON "Sale"("tenantId", "clientRequestId");
