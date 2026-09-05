-- Tenant: DRAFT/PUBLISHED gate for the public storefront.
ALTER TABLE "Tenant" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Every tenant that exists today is already publicly reachable. Backfill them as
-- published so this migration never takes a live store offline. Only tenants
-- created after this migration start in DRAFT.
UPDATE "Tenant" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;

-- StoreSettings: tagline collected during onboarding (previously discarded),
-- plus the wizard's resume point and deliberate-exit marker.
ALTER TABLE "StoreSettings" ADD COLUMN "description" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StoreSettings" ADD COLUMN "onboardingExitedAt" TIMESTAMP(3);

-- A tenant that already finished the old wizard should not be pulled back into
-- the new one on its first step.
UPDATE "StoreSettings" SET "onboardingStep" = 5 WHERE "isCompleted" = true;
