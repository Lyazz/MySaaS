ALTER TABLE "Product"
ADD COLUMN "promotionalPrice" DECIMAL,
ADD COLUMN "isPromotionActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promotionStartDate" TIMESTAMP(3),
ADD COLUMN "promotionEndDate" TIMESTAMP(3),
ADD COLUMN "showCountdown" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ProductVariant"
ADD COLUMN "promotionalPrice" DECIMAL,
ADD COLUMN "isPromotionActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promotionStartDate" TIMESTAMP(3),
ADD COLUMN "promotionEndDate" TIMESTAMP(3),
ADD COLUMN "showCountdown" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Product"
SET
    "promotionalPrice" = NULL,
    "isPromotionActive" = false,
    "promotionStartDate" = NULL,
    "promotionEndDate" = NULL,
    "showCountdown" = false
WHERE EXISTS (
    SELECT 1
    FROM "ProductOption" po
    WHERE po."tenantId" = "Product"."tenantId"
      AND po."productId" = "Product"."id"
);
