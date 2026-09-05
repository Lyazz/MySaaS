-- WhatsApp Cloud API order confirmation.
--
-- Hand-written: `prisma migrate diff` also sweeps in pre-existing drift from
-- earlier hand-written migrations, none of which belongs to this change.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "whatsappConfirmSentAt" TIMESTAMP(3),
ADD COLUMN     "whatsappLastMessageAt" TIMESTAMP(3),
ADD COLUMN     "whatsappRemindersSent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "toPhone" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "wamid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLock" (
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobLock_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_wamid_key" ON "WhatsAppMessage"("wamid");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_orderId_idx" ON "WhatsAppMessage"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_status_idx" ON "WhatsAppMessage"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_tenantId_orderId_kind_attempt_key" ON "WhatsAppMessage"("tenantId", "orderId", "kind", "attempt");

-- CreateIndex
CREATE INDEX "Order_tenantId_status_whatsappLastMessageAt_idx" ON "Order"("tenantId", "status", "whatsappLastMessageAt");

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
