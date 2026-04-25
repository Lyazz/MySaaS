-- Add functional checkout settings:
-- - minimum order threshold (DZD)
-- - optional address visibility flag
ALTER TABLE "StoreSettings"
  ADD COLUMN "minimumOrderAmountDzd" INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN "hideOptionalAddress" BOOLEAN NOT NULL DEFAULT true;
