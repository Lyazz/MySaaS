# FEATURE_TIER_MATRIX.md

## Purpose
Use this matrix as the fast reference for feature availability, outage behavior, and UI treatment.

Definitions used below:
- `Offline-only` means the paid local-only subscription tier.
- `Online + connected` means an online-tier tenant with remote access available.
- `Online + offline` means an online-tier tenant during temporary outage or lost connectivity.

| Feature family | Offline-only subscription | Online-tier with connection | Online-tier without connection | UI treatment | Notes |
| --- | --- | --- | --- | --- | --- |
| Products and variants | Supported | Supported | Supported | Fully enabled | Core operational data. Local work must remain usable offline. |
| Categories | Supported | Supported | Supported | Fully enabled | Core operational data. |
| Customers | Supported | Supported | Supported | Fully enabled | Core operational data. |
| Orders | Supported | Supported | Supported | Fully enabled | Order capture and management must continue locally during outages. |
| POS and sales | Supported | Supported | Supported | Fully enabled | Core store operations. |
| Purchases and suppliers | Supported | Supported | Supported | Fully enabled | Core store operations. |
| Cash operations | Supported | Supported | Supported | Fully enabled | Core operational workflow. |
| Delivery operations that can be local | Supported where local-only | Supported | Supported for local-capable flows | Enabled for local flows; remote-only actions may be unavailable while offline | Local operational delivery handling is allowed. Remote provider calls may depend on connectivity. |
| Local printing and device workflows | Supported | Supported | Supported | Fully enabled | Local peripherals remain available regardless of connectivity when technically supported. |
| Store settings that are local or admin-operational | Supported | Supported | Supported, then sync later | Fully enabled | Limited to operational settings not dependent on public web presence. |
| Custom domains | Not available | Supported | Not usable while offline | Visible but disabled on offline-only | Requires online tier and server-managed storefront. |
| Public storefront settings | Not available | Supported | Read-only or unavailable while offline if server state is required | Visible but disabled on offline-only | Includes tenant server-side public-store controls. |
| Homepage, appearance, and legal content tied to web storefront | Not available | Supported | Local draft behavior may exist later, but not assumed by default | Visible but disabled on offline-only | Treat as storefront-managed capability, not a local-only store operation. |
| Billing and subscription management | Not available | Supported | Not usable while offline | Visible but disabled on offline-only | Includes online subscription controls and tenant billing workflows. |
| Cloud integrations | Not available | Supported | Not usable while offline except local-only cached status | Visible but disabled on offline-only | Includes server-backed or cloud-connected integrations. |
| Public-store growth and marketing tools | Not available | Supported | Usually unavailable while offline | Visible but disabled on offline-only | Includes tools tied to public-store presence or cloud services. |

## Interpretation Rules
- If a feature belongs to core store operations, it should remain usable on `offline-only`.
- If a feature depends on public web presence, tenant server-side state, or cloud services, treat it as online-tier only.
- For online tiers, temporary loss of connectivity should not stop local operational work.
- For online tiers, work completed during outages should sync after reconnection.
- For `offline-only`, locked features should not become active merely because the device has internet access.

## Default UI Rules
- Core operational features:
  Keep enabled when supported by the current tier.
- Locked online-tier features on `offline-only`:
  Show disabled by default and explain that the capability is available on online tiers.
- Online-tier features during temporary outage:
  Keep local-capable workflows available.
  Mark remote-only actions as temporarily unavailable because of connectivity, not because of subscription.

## Escalation Rule
If a future task introduces a feature that is not clearly covered by this matrix, classify it by product family first:
- local operational workflow
- server-managed storefront capability
- online billing or subscription capability
- cloud integration
- public-store growth tool

Then update this matrix before shipping the feature behavior.
