-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('LISTED', 'UNLISTED');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'LISTED';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'LISTED';

-- CreateIndex
CREATE INDEX "Category_tenantId_visibility_idx" ON "Category"("tenantId", "visibility");

-- CreateIndex
CREATE INDEX "Product_tenantId_visibility_idx" ON "Product"("tenantId", "visibility");
