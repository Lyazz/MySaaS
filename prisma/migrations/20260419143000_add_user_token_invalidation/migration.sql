-- Add per-user token invalidation checkpoint for logout-all-session revocation.
ALTER TABLE "User"
ADD COLUMN "tokenInvalidBefore" TIMESTAMP(3);
