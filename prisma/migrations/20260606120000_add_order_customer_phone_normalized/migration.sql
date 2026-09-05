-- Add normalized customer phone to orders for tenant-scoped customer history lookups.
ALTER TABLE "Order"
ADD COLUMN "customerPhoneNormalized" TEXT;

WITH phone_digits AS (
  SELECT
    "id",
    regexp_replace(COALESCE("customerPhone", ''), '\D', '', 'g') AS digits
  FROM "Order"
)
UPDATE "Order" AS o
SET "customerPhoneNormalized" = CASE
  WHEN p.digits ~ '^0[567][0-9]{8}$' THEN '213' || substring(p.digits from 2)
  WHEN p.digits ~ '^[567][0-9]{8}$' THEN '213' || p.digits
  WHEN p.digits ~ '^213[567][0-9]{8}$' THEN p.digits
  WHEN p.digits ~ '^00213[567][0-9]{8}$' THEN substring(p.digits from 3)
  ELSE NULL
END
FROM phone_digits AS p
WHERE o."id" = p."id";

CREATE INDEX "Order_tenantId_customerPhoneNormalized_idx" ON "Order"("tenantId", "customerPhoneNormalized");
