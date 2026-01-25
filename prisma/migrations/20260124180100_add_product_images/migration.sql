-- Add images array to Product (used by storefront/admin UIs)
ALTER TABLE "Product"
ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

