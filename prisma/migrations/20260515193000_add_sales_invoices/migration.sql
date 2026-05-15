ALTER TABLE "StoreSettings"
  ADD COLUMN "salesInvoiceEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "invoiceNumberPrefix" TEXT NOT NULL DEFAULT 'INV',
  ADD COLUMN "invoiceFooterText" TEXT,
  ADD COLUMN "invoiceShowLogo" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "SalesInvoice" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesInvoice_tenantId_sourceType_sourceId_key"
  ON "SalesInvoice"("tenantId", "sourceType", "sourceId");

CREATE UNIQUE INDEX "SalesInvoice_tenantId_invoiceNumber_key"
  ON "SalesInvoice"("tenantId", "invoiceNumber");

CREATE UNIQUE INDEX "SalesInvoice_tenantId_id_key"
  ON "SalesInvoice"("tenantId", "id");

CREATE INDEX "SalesInvoice_tenantId_idx" ON "SalesInvoice"("tenantId");
CREATE INDEX "SalesInvoice_tenantId_issuedAt_idx" ON "SalesInvoice"("tenantId", "issuedAt");

ALTER TABLE "SalesInvoice"
  ADD CONSTRAINT "SalesInvoice_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SalesInvoice"
  ADD CONSTRAINT "SalesInvoice_tenantId_createdByUserId_fkey"
  FOREIGN KEY ("tenantId", "createdByUserId") REFERENCES "User"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
