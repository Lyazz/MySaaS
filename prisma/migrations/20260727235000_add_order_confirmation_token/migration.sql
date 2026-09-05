-- AlterTable
ALTER TABLE "Order" ADD COLUMN "confirmationToken" TEXT;
ALTER TABLE "Order" ADD COLUMN "confirmationTokenUsed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Order_confirmationToken_key" ON "Order"("confirmationToken");
