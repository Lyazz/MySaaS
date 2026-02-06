-- CreateTable
CREATE TABLE "TenantMetaPixel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT,
    "pixelId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantMetaPixel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMetaPixel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "metaPixelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMetaPixel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantMetaPixel_tenantId_idx" ON "TenantMetaPixel"("tenantId");

-- CreateIndex
CREATE INDEX "TenantMetaPixel_tenantId_isGlobal_idx" ON "TenantMetaPixel"("tenantId", "isGlobal");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMetaPixel_tenantId_pixelId_key" ON "TenantMetaPixel"("tenantId", "pixelId");

-- CreateIndex
CREATE INDEX "ProductMetaPixel_tenantId_idx" ON "ProductMetaPixel"("tenantId");

-- CreateIndex
CREATE INDEX "ProductMetaPixel_tenantId_productId_idx" ON "ProductMetaPixel"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "ProductMetaPixel_tenantId_metaPixelId_idx" ON "ProductMetaPixel"("tenantId", "metaPixelId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMetaPixel_tenantId_productId_metaPixelId_key" ON "ProductMetaPixel"("tenantId", "productId", "metaPixelId");

-- AddForeignKey
ALTER TABLE "TenantMetaPixel" ADD CONSTRAINT "TenantMetaPixel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMetaPixel" ADD CONSTRAINT "ProductMetaPixel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMetaPixel" ADD CONSTRAINT "ProductMetaPixel_tenantId_productId_fkey" FOREIGN KEY ("tenantId", "productId") REFERENCES "Product"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMetaPixel" ADD CONSTRAINT "ProductMetaPixel_metaPixelId_fkey" FOREIGN KEY ("metaPixelId") REFERENCES "TenantMetaPixel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

