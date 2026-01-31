-- CreateTable
CREATE TABLE IF NOT EXISTS "BillingPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'month',
    "amountDzd" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DA',
    "method" TEXT NOT NULL DEFAULT 'SIMULATED',
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "proofUrl" TEXT,
    "notes" TEXT,
    "externalReference" TEXT,
    "createdByUserId" TEXT,
    "reviewedByUserId" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BillingPayment_tenantId_idx" ON "BillingPayment"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BillingPayment_tenantId_createdAt_idx" ON "BillingPayment"("tenantId", "createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BillingPayment_tenantId_fkey'
    ) THEN
        ALTER TABLE "BillingPayment"
            ADD CONSTRAINT "BillingPayment_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

