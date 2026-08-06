-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "clearanceBreakdown" JSONB,
ADD COLUMN     "clearanceDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isClearance" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "clearanceBannerEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clearanceBannerText" TEXT,
ADD COLUMN     "clearanceDivisor" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "clearanceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clearanceMultiple" INTEGER NOT NULL DEFAULT 6;

