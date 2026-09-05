-- AI document import: scan a supplier invoice, delivery note or product catalog
-- and turn it into a DRAFT purchase order / products after human review.

-- StoreSettings: the default markup used to propose a sale price from a cost.
ALTER TABLE "StoreSettings" ADD COLUMN "defaultMarginPercent" DECIMAL(65,30) NOT NULL DEFAULT 30;

-- One scanned document, from upload through extraction to confirmation.
CREATE TABLE "AiDocumentJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "documentRef" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "errorMessage" TEXT,
    "extraction" JSONB,
    "draft" JSONB,
    "supplierId" TEXT,
    "purchaseOrderId" TEXT,
    "createdByUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiDocumentJob_pkey" PRIMARY KEY ("id")
);

-- Every field the merchant corrected, for accuracy reporting per confidence band.
CREATE TABLE "AiDocumentCorrection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "lineIndex" INTEGER,
    "field" TEXT NOT NULL,
    "aiValue" TEXT,
    "userValue" TEXT,
    "confidence" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDocumentCorrection_pkey" PRIMARY KEY ("id")
);

-- Supplier line label -> our variant, so the next invoice from the same supplier
-- matches without the merchant repeating the work.
CREATE TABLE "SupplierProductAlias" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT,
    "rawLabel" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierProductAlias_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiDocumentJob_tenantId_idx" ON "AiDocumentJob"("tenantId");
CREATE INDEX "AiDocumentJob_tenantId_status_idx" ON "AiDocumentJob"("tenantId", "status");
CREATE INDEX "AiDocumentJob_tenantId_createdAt_idx" ON "AiDocumentJob"("tenantId", "createdAt");
CREATE UNIQUE INDEX "AiDocumentJob_tenantId_id_key" ON "AiDocumentJob"("tenantId", "id");

CREATE INDEX "AiDocumentCorrection_tenantId_idx" ON "AiDocumentCorrection"("tenantId");
CREATE INDEX "AiDocumentCorrection_tenantId_jobId_idx" ON "AiDocumentCorrection"("tenantId", "jobId");
CREATE INDEX "AiDocumentCorrection_tenantId_field_idx" ON "AiDocumentCorrection"("tenantId", "field");
CREATE UNIQUE INDEX "AiDocumentCorrection_tenantId_id_key" ON "AiDocumentCorrection"("tenantId", "id");

CREATE INDEX "SupplierProductAlias_tenantId_idx" ON "SupplierProductAlias"("tenantId");
CREATE INDEX "SupplierProductAlias_tenantId_variantId_idx" ON "SupplierProductAlias"("tenantId", "variantId");
CREATE UNIQUE INDEX "SupplierProductAlias_tenantId_supplierId_rawLabel_key" ON "SupplierProductAlias"("tenantId", "supplierId", "rawLabel");
CREATE UNIQUE INDEX "SupplierProductAlias_tenantId_id_key" ON "SupplierProductAlias"("tenantId", "id");

ALTER TABLE "AiDocumentJob" ADD CONSTRAINT "AiDocumentJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiDocumentJob" ADD CONSTRAINT "AiDocumentJob_tenantId_supplierId_fkey" FOREIGN KEY ("tenantId", "supplierId") REFERENCES "Supplier"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiDocumentJob" ADD CONSTRAINT "AiDocumentJob_tenantId_purchaseOrderId_fkey" FOREIGN KEY ("tenantId", "purchaseOrderId") REFERENCES "PurchaseOrder"("tenantId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiDocumentCorrection" ADD CONSTRAINT "AiDocumentCorrection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiDocumentCorrection" ADD CONSTRAINT "AiDocumentCorrection_tenantId_jobId_fkey" FOREIGN KEY ("tenantId", "jobId") REFERENCES "AiDocumentJob"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupplierProductAlias" ADD CONSTRAINT "SupplierProductAlias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierProductAlias" ADD CONSTRAINT "SupplierProductAlias_tenantId_supplierId_fkey" FOREIGN KEY ("tenantId", "supplierId") REFERENCES "Supplier"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierProductAlias" ADD CONSTRAINT "SupplierProductAlias_tenantId_variantId_fkey" FOREIGN KEY ("tenantId", "variantId") REFERENCES "ProductVariant"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Postgres treats NULLs as distinct in a unique index, so the composite key
-- above does not stop duplicate store-wide (supplierId IS NULL) aliases.
-- This partial index closes that hole; the service branches on it too.
CREATE UNIQUE INDEX "SupplierProductAlias_tenantId_rawLabel_global_key"
    ON "SupplierProductAlias"("tenantId", "rawLabel")
    WHERE "supplierId" IS NULL;
