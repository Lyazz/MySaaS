ALTER TABLE "SalesInvoice"
  DROP CONSTRAINT "SalesInvoice_tenantId_createdByUserId_fkey";

ALTER TABLE "SalesInvoice"
  ADD CONSTRAINT "SalesInvoice_tenantId_createdByUserId_fkey"
  FOREIGN KEY ("tenantId", "createdByUserId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
