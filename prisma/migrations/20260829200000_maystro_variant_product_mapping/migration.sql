-- Maystro renders an order's product name from the catalog's logistical_description
-- and discards the description carried on the order line, so a variant only shows up
-- by name when it owns its own remote product. Attribute-free products keep the
-- product-level row they already have, which the "" default preserves.
ALTER TABLE "MaystroProductMapping" ADD COLUMN "localVariantId" TEXT NOT NULL DEFAULT '';

DROP INDEX "MaystroProductMapping_tenantId_localProductId_key";

CREATE UNIQUE INDEX "MaystroProductMapping_tenantId_localProductId_localVariantId_key" ON "MaystroProductMapping"("tenantId", "localProductId", "localVariantId");
