-- Add delivery/shipping metadata columns to orders
ALTER TABLE "Order"
ADD COLUMN     "deliveryMode" TEXT NOT NULL DEFAULT 'home',
ADD COLUMN     "shippingProvider" "ShipmentProvider",
ADD COLUMN     "shippingServiceLevel" TEXT,
ADD COLUMN     "shippingAmount" DOUBLE PRECISION,
ADD COLUMN     "shippingCurrency" TEXT NOT NULL DEFAULT 'DZD',
ADD COLUMN     "shippingWilayaCode" TEXT,
ADD COLUMN     "shippingCommuneCode" TEXT,
ADD COLUMN     "shippingAddressLine1" TEXT,
ADD COLUMN     "shippingAddressLine2" TEXT,
ADD COLUMN     "shippingNotes" TEXT,
ADD COLUMN     "shippingEtaMinDays" INTEGER,
ADD COLUMN     "shippingEtaMaxDays" INTEGER;
