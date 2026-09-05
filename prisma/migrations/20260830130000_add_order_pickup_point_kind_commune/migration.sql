-- A collection point is now remembered by what it is, not by a single id.
-- A Maystro stop desk has no pickup_point of its own, so "shippingPickupPoint" alone
-- could not tell a desk from a relay and a commune id was being stored in its place.
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingPickupPointCommune" TEXT,
ADD COLUMN     "shippingPickupPointKind" TEXT,
ADD COLUMN     "shippingPickupPointName" TEXT;
