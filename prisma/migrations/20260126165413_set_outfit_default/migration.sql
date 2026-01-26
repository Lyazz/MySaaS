-- AlterTable
ALTER TABLE "StoreSettings" ALTER COLUMN "fontFamily" SET DEFAULT 'Outfit';

-- Align existing records to the new default
UPDATE "StoreSettings"
SET "fontFamily" = 'Outfit'
WHERE "fontFamily" = 'Space Grotesk';
