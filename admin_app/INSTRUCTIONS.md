# INSTRUCTIONS.md - Flutter Admin Product Rules

## Mission
This app is the tenant admin app for the platform. It is an offline-capable admin workspace for store operations, not a public storefront app.

These instructions are written for agents and engineers. They are binding for upcoming Flutter work unless explicitly revised.

## Read Order
Read these files before planning or implementing Flutter tasks related to product behavior:
- `INSTRUCTIONS.md`
- `OFFLINE_ONLINE_REQUIREMENTS.md`
- `FEATURE_TIER_MATRIX.md`
- `CLAUDE.md`

## Authority
This file set is the product-policy layer for `admin_app`.

Use it to decide:
- what the app is allowed to do on an offline-only subscription
- what is available only on online tiers
- how the app should behave when connectivity is lost
- whether a feature should remain usable, sync later, or be disabled

If a future task conflicts with this file set, update these docs first or as part of the task. Do not silently diverge from them.

## Key Distinction
Do not collapse commercial entitlement and runtime state into one concept.

- Subscription tier:
  Determines which feature families the tenant is allowed to use.
- Runtime mode or connectivity state:
  Determines whether the app can currently reach remote services and sync with the tenant server.

An online-tier tenant can still be temporarily offline and keep operating locally. An offline-only subscription is a supported paid product tier, not just a network failure case.

## Definitions
- `offline-only subscription`:
  A paid tier where the app is provisioned for local-only store administration. Core store operations must work without connection. Server-managed storefront and cloud features are not available.
- `online tiers`:
  Paid tiers that include tenant server-side management and public-store/cloud capabilities. The app may still operate offline temporarily and sync later.
- `offline runtime`:
  The app is currently running without network connectivity or without remote reachability. Local work must continue where supported.
- `online runtime`:
  The app currently has network connectivity and can access allowed remote capabilities.
- `hybrid sync behavior`:
  Local-first operation with durable synchronization when connectivity returns. Temporary outages must not stop core store work for online-tier tenants.

## Non-Negotiable Rules
1. Treat subscription tier and runtime connectivity as separate concepts.
2. Treat offline-only as a supported commercial tier, not a degraded online mode.
3. Core store operations must remain usable on offline-only subscriptions.
4. Online-tier tenants must keep operating locally during outages and sync after reconnection.
5. Offline-only provisioning is single-workspace and tenant-bound. No ad hoc tenant switching.
6. Storefront or cloud-only features must not be active on offline-only subscriptions.
7. Default UI treatment for locked features is visible but disabled, with copy stating the feature is available on online tiers.

## Detailed Specs
- Product behavior and mode rules: [OFFLINE_ONLINE_REQUIREMENTS.md](/Users/lyazz/Documents/js projects/MySaaS/admin_app/OFFLINE_ONLINE_REQUIREMENTS.md)
- Capability-by-capability availability matrix: [FEATURE_TIER_MATRIX.md](/Users/lyazz/Documents/js projects/MySaaS/admin_app/FEATURE_TIER_MATRIX.md)
