-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "cartEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "codEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "currencyCode" TEXT NOT NULL DEFAULT 'DZD',
ADD COLUMN     "currencyCountry" TEXT NOT NULL DEFAULT 'DZ';
