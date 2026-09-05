# OFFLINE_ONLINE_REQUIREMENTS.md

## Purpose
This document defines the normative product behavior for offline-only subscriptions, online tiers, temporary connectivity loss, and future migration between them.

This document defines product rules only. It does not define backend activation protocols, provisioning APIs, or migration wire contracts.

## Product Model
- `offline-only` is a real purchasable tier.
- A tenant on `offline-only` may later upgrade to an online tier.
- The supported path is one-way upgrade from `offline-only` to an online tier.
- Do not promise downgrade back to `offline-only` after upgrade.
- Online tiers include tenant server-side management and public-store or cloud capabilities.

## Offline-Only Operating Rules
- The app is provisioned to a single tenant workspace on a trusted local install.
- The expected operating model is single operator or single provisioned workspace, not tenant switching.
- Normal tenant login is not required for day-to-day use.
- The local encrypted database is the source of truth.
- All core store operations must work with no connection.
- The app must remain useful even if the device never connects to a tenant server.
- Server-managed storefront and cloud-only capabilities must not be enabled.
- Future upgrade support must preserve tenant binding and prevent unsafe cross-tenant migration.

## Online-Tier Operating Rules
- The app may be online, offline temporarily, or in a hybrid sync state.
- Store operations remain local-first during outages.
- Local writes made during an outage must be retained and synced once connectivity returns.
- The tenant server is the long-term system of record for online tiers.
- Temporary lack of connection must not block core store operations that already exist in the Flutter app unless a feature is inherently remote-only.

## Runtime Mode vs Subscription Tier
- Subscription tier controls entitlement.
- Runtime connectivity controls current remote reachability.
- Do not infer tier from connectivity.
- Do not infer connectivity behavior from tier alone.
- An online-tier tenant may temporarily operate offline and continue local work.
- An offline-only tenant may have network available on the device, but that does not unlock cloud or storefront capabilities.

## Upgrade and Migration Rules
- Migration from `offline-only` to an online tier is a supported product path.
- The docs and UI may describe this as an upgrade or migration to online tiers.
- Do not promise a self-serve implementation unless the product explicitly adds one later.
- Future implementation must preserve:
  - tenant binding
  - safe data migration
  - no cross-tenant mixing
  - no silent loss of local operational data
- These docs intentionally stop at product constraints. They do not define activation tokens, bootstrap files, or sync bootstrapping protocols.

## Sync Expectations
- For online tiers, all tenant-admin data handled by the Flutter app is considered intended sync scope unless a later spec explicitly excludes a domain.
- Local writes during outages must sync after reconnection.
- Sync behavior must not cause silent data loss.
- Sync behavior must not silently discard local work because connectivity was missing at write time.
- Remote-only features may remain unavailable while offline, but local operational work must continue.

## Feature Gating Rules
- `offline-only` must deactivate options related to online store and online subscription capabilities.
- Locked capabilities must be identified as available on online tiers.
- The default UI treatment for locked capabilities is:
  - show the option
  - keep it disabled
  - explain that it requires an online tier
- If a screen is entirely meaningless without server-side or storefront capability, it may be omitted from normal navigation, but any remaining surfaced entry point should still explain that the feature belongs to online tiers.

## Locked Feature Families on Offline-Only
Treat these as unavailable on `offline-only` unless a future spec explicitly changes them:
- custom domains
- online storefront settings
- online billing or subscription controls
- cloud integrations
- public-store growth tools

## Required Answers for Future Tasks
After reading this document, a future task must be able to answer all of the following without guesswork:
- Is this feature allowed on `offline-only`?
- Is this feature allowed only on online tiers?
- If the tenant is on an online tier but has no connection, should the app keep operating locally?
- Should the UI keep the feature available, disable it, or explain upgrade requirements?
- Is migration from `offline-only` to an online tier supported by the product?
