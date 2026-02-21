-- Add tenant default cashbox pointer, per-user cashbox assignment,
-- and cash session closing breakdown fields.

ALTER TABLE "StoreSettings" ADD COLUMN "defaultCashboxId" TEXT;

ALTER TABLE "User" ADD COLUMN "cashboxId" TEXT;
CREATE INDEX "User_tenantId_cashboxId_idx" ON "User"("tenantId", "cashboxId");

ALTER TABLE "CashSession"
    ADD COLUMN "closingCash" DECIMAL(65,30),
    ADD COLUMN "closingCard" DECIMAL(65,30),
    ADD COLUMN "closingTransfer" DECIMAL(65,30),
    ADD COLUMN "closingOther" DECIMAL(65,30),
    ADD COLUMN "expectedCash" DECIMAL(65,30),
    ADD COLUMN "expectedCard" DECIMAL(65,30),
    ADD COLUMN "expectedTransfer" DECIMAL(65,30),
    ADD COLUMN "expectedOther" DECIMAL(65,30);

ALTER TABLE "StoreSettings"
    ADD CONSTRAINT "StoreSettings_tenantId_defaultCashboxId_fkey"
    FOREIGN KEY ("tenantId", "defaultCashboxId")
    REFERENCES "Cashbox"("tenantId", "id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "User"
    ADD CONSTRAINT "User_tenantId_cashboxId_fkey"
    FOREIGN KEY ("tenantId", "cashboxId")
    REFERENCES "Cashbox"("tenantId", "id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

