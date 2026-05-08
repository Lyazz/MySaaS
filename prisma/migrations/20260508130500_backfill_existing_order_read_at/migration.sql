UPDATE "Order"
SET "readAt" = COALESCE("readAt", "createdAt")
WHERE "readAt" IS NULL;
