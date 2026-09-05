-- Self-serve trials: a new tenant is born online, on a trial, not offline-only.
--
-- `isOffline` defaulted to true, so every tenant ever created started on the
-- offline-only tier regardless of what it had paid for. Offline-only is a real
-- purchasable tier and should be a deliberate super-admin choice.
--
-- Existing tenants keep whatever value they have: this changes the default for
-- future rows only, never the tier of a tenant already running.
ALTER TABLE "Tenant" ALTER COLUMN "isOffline" SET DEFAULT false;
