# Delivery Provider Integration Guide

How to add a new delivery/carrier integration to `backend/src/modules/delivery/`. **Maystro is the reference implementation** — it has the fullest feature set (quote, order push with remote catalog sync, webhooks, admin helper endpoints, bordereau, pickup points) and every new provider should match that functionality unless the carrier's API genuinely doesn't support something.

Each new provider gets its own doc in this folder: drop the carrier's raw API documentation at `docs/delivery-providers/<provider>-api.md` (or link it), then fill in `docs/delivery-providers/<provider>-integration-plan.md` using the template at the bottom of this file before writing code.

## 1. Feature checklist (must match Maystro unless the carrier's API can't support it)

| Capability | Maystro reference | Required? |
|---|---|---|
| Get shipping rate/quote | `providers/maystro.provider.ts` `quote()` | Yes if carrier exposes pricing |
| Create shipment/order | `maystro/maystro-order.service.ts` `createOrderFromLocalOrder()` | Yes |
| Cancel shipment/order | `maystro/maystro-order.service.ts` `cancelMaystroOrder()` | Yes |
| Bulk order push | `maystro/maystro-order.service.ts` `createOrdersFromLocalOrdersBulk()` | Yes |
| Manual re-sync of a stuck order | `maystro/maystro-order.service.ts` `syncOrderFromBackendApi()` | Yes |
| Track shipment | `providers/maystro.provider.ts` `track()` (Maystro relies on webhooks instead) | Yes, via webhook or polling |
| Inbound webhook → update `Shipment`/`Order` status | `maystro/maystro-webhook.service.ts` | Yes |
| Auto-register webhook with carrier on credential save | `delivery-accounts.service.ts:298-379` | Yes if carrier supports it |
| Wilaya/commune (or equivalent geo) resolution + caching | `maystro/maystro-location.service.ts` | Yes if carrier requires geo IDs |
| Pickup point / stop-desk discovery | `maystro/maystro-pickup-point.service.ts` | Only if carrier offers pickup points |
| Remote product/stock catalog sync | `maystro/maystro-product.service.ts` + `MaystroProductMapping` | Only if carrier requires product pre-registration |
| Shipping label / manifest (bordereau) PDF | `maystro/maystro-bordereau.service.ts` | Yes if carrier provides one |
| Per-tenant credential CRUD (admin) | `delivery-accounts.controller.ts` / `.service.ts` (generic, reused) | Yes — reuse as-is |
| Live carrier rates preview (admin) | `GET /admin/delivery/providers/:provider/live-rates` (generic) | Yes — reuse as-is |
| Status code → local `ShipmentStatus`/`Order.status` mapping | `maystro/maystro-status.ts` | Yes |
| Typed error class + retry/backoff HTTP client | `maystro/maystro.client.ts` + `maystro.errors.ts` | Yes |
| Admin UI settings block | `pages/admin/delivery/index.vue` (`v-if="provider === 'MAYSTRO'"` block) | Yes |
| Storefront checkout integration (delivery mode/pricing) | `composables/useDeliveryCommunes.ts`, `useDeliveryPrices.ts` (provider-agnostic, aggregate across all offered providers) | Yes if geo-based pricing |
| List communes for a wilaya (`DeliveryProvider.listCommunes`) | `providers/maystro.provider.ts` / `providers/yalidine.provider.ts` `listCommunes()`, aggregated by `DeliveryService.listCommuneNames()` | Yes if carrier exposes a commune catalog |
| Tests: rates, idempotent creation, webhook, credential CRUD | `tests/api/delivery.test.ts`, `tests/api/maystro-orders-management.test.ts` | Yes |

## 2. Decide: "simple" (Yalidine-style) or "sync-required" (Maystro-style)

Before writing code, determine from the carrier's API doc:

- **Does the carrier require you to register products/stock in their system before creating an order?**
  → Yes: follow the **Maystro pattern** (dedicated `<provider>/` subfolder, `<Provider>ProductMapping` Prisma model, orchestration bypassed in `DeliveryService.createShipment()` — see §4).
  → No: follow the **Yalidine pattern** (single `providers/<provider>.provider.ts` implementing `quote`/`createShipment`/`track` directly, no dedicated subfolder needed, generic `Shipment` model is enough).

- **Does the carrier need geo ID resolution (wilaya/commune, city/zone, etc.) before pricing or order creation?**
  → Add a `<provider>-location.service.ts` mirroring `maystro-location.service.ts` (cache lookups 1h in-process, accept both IDs and names).

- **Does the carrier offer pickup points / stop-desk / relais delivery?**
  → Add a `<provider>-pickup-point.service.ts` mirroring `maystro-pickup-point.service.ts`. **Read §5 first** — a carrier counter and a third-party relay are addressed differently, and one of them may have no id at all.

- **How does the carrier notify status changes?** Webhook push (mirror Maystro/Yalidine) vs. poll-only (implement `track()` fully instead of relying on `handleWebhook`).

## 3. File-by-file build order

Work top-down; each step is testable in isolation before moving to the next.

1. **`backend/src/modules/delivery/catalog.ts`** — add the provider entry: `provider`, `name`, `supports: {quote, createShipment, track, webhooks}`, `credentialFields` (mark secrets with `secret: true`).
2. **`prisma/schema.prisma`** — add the enum value to `ShipmentProvider`. If sync-required (Maystro pattern), add `<Provider>ProductMapping` / `<Provider>OrderMapping` / `<Provider>InventoryEvent` models mirroring `MaystroProductMapping` (schema.prisma:1245), `MaystroOrderMapping` (schema.prisma:1267), `MaystroInventoryEvent` (schema.prisma:1291). Run `npx prisma migrate dev`.
3. **`backend/src/modules/delivery/<provider>/<provider>.client.ts`** — low-level HTTP client, single `request()` entry point (so it's easy to `vi.spyOn(<Provider>Client.prototype, 'request')` in tests — this is why Maystro's client has one method). Implement retry/backoff for network errors and 5xx only (mirror `maystro.client.ts:9-14,75-99`), never retry 4xx.
4. **`backend/src/modules/delivery/<provider>/<provider>.errors.ts`** — `<Provider>IntegrationError extends Error { statusCode, statusMessage, code?, details? }` + a numeric/string error-code → `{statusCode, statusMessage}` map if the carrier returns coded errors (mirror `maystro.errors.ts`).
5. **`backend/src/modules/delivery/<provider>/<provider>.credentials.ts`** — `get<Provider>Credentials(tenantId)` reading `TenantDeliveryAccount` (`provider: '<PROVIDER>'`), throwing the typed error if inactive/missing fields; `redact<Provider>Credentials()` for admin responses.
6. **`backend/src/modules/delivery/<provider>/<provider>-status.ts`** — carrier status → `ShipmentStatus` map, carrier status → local `Order.status` map (`'SHIPPED'|'DELIVERED'|'CANCELLED'|'RETURNED'|null`), carrier status → human label.
7. Optional, only if needed per §2: `<provider>-location.service.ts`, `<provider>-pickup-point.service.ts`, `<provider>-product.service.ts` + Prisma mapping model.
   - **Wilaya/commune identifiers are never a raw provider-specific ID outside that provider's own code.** Checkout stores a canonical wilaya code (`shared/geo/dz.ts`, 01-58) and a commune **name** — there is no canonical commune ID table (~1541 communes, no shared standard across carriers). `resolveWilayaAndCommune()`-style methods must fall back to name matching (via the shared `normalizeLocationName()` in `backend/src/modules/delivery/shared/normalize-location-name.ts`) whenever the given commune value isn't parseable as that provider's own numeric ID — mirror `maystro-location.service.ts`/`yalidine-location.service.ts`. Implement `DeliveryProvider.listCommunes(wilayaCode)` so your provider's commune names are picked up by `DeliveryService.listCommuneNames()`, the aggregator behind the storefront's commune dropdown (`composables/useDeliveryCommunes.ts`). **Read §4 before writing any of this** — carrier commune lists cannot be joined on an id, their names disagree, and the rules there are what keep an unresolvable name from turning into a wrong commune.
8. **`backend/src/modules/delivery/<provider>/<provider>-order.service.ts`** — the real create/cancel/bulk/manual-sync logic (mirror `maystro-order.service.ts`). Must be **idempotent**: check for an existing successful mapping/`Shipment` row before creating. On failure, persist `lastError` rather than throwing silently, so admin diagnostics have visibility.
9. **`backend/src/modules/delivery/<provider>/<provider>-webhook.service.ts`** — decode the inbound payload (handle any base64/nesting quirks the carrier has), verify signature (HMAC preferred, mirror Yalidine's `X-Yalidine-Signature`; shared-secret header acceptable, mirror Maystro's `X-Webhook-Secret` + `timingSafeEqual` — **never** compare secrets with `===`), map status, update `Shipment` + insert `ShipmentEvent`, call `OrdersService.applyCarrierStatus(tenantId, localOrderId, localOrderStatus, {userId: null})`.
10. **`backend/src/modules/delivery/providers/<provider>.provider.ts`** — the `DeliveryProvider` adapter (`types.ts:65-73`). If sync-required, `createShipment()` can be a documented stub that delegates to step 8's service via `DeliveryService` (mirror `providers/maystro.provider.ts:124-132`); otherwise implement fully inline (mirror `providers/yalidine.provider.ts`).
11. **`backend/src/modules/delivery/delivery.service.ts`** — wire into `resolveProvider()` (delivery.service.ts:147-176): add a branch instantiating your provider/service. If sync-required, also special-case `createShipment()` to call your order service directly instead of `impl.createShipment()`, same as the existing Maystro branch.
12. Optional: **`backend/src/modules/delivery/<provider>/<provider>.controller.ts`** + routes in `routes.ts` — only if the carrier needs helper endpoints beyond quote/create/webhook (geo lookups, pickup points, label/manifest generation, hook management). Mount at `/admin/delivery/providers/<PROVIDER>/*` for admin-only helpers, `/delivery/<provider>/*` for public/best-effort ones (mirror `maystro.controller.ts`).
13. **`routes.ts`** — add `POST /webhooks/<provider>` (**no auth middleware** — it's inbound from the carrier; auth is the signature/secret check inside the handler), plus any controller routes from step 12.
14. **Frontend**: `pages/admin/delivery/index.vue` — the generic provider-card UI (credential fields, offered toggle, rate table, live-rates button) works automatically once step 1's catalog entry exists. Add a `v-if="selectedProvider.provider === '<PROVIDER>'"` block only for carrier-specific extras (pickup point tester, resync button, webhook setup instructions — mirror the existing Maystro/Yalidine blocks at `pages/admin/delivery/index.vue:218-249,372-441`).
15. **Storefront**: if the carrier needs geo-based pricing at checkout, add `composables/use<Provider>Communes.ts` / `use<Provider>DeliveryPrices.ts` mirroring the Maystro composables, and wire into the storefront template `Checkout.vue`/`partials/ProductOrderForm.vue` files alongside the existing Maystro/Yalidine calls — do **not** duplicate the whole checkout flow per provider; branch on the selected provider.
16. **Tests** (write alongside each step above, not at the end):
    - `tests/api/<provider>.test.ts` — quote, idempotent shipment creation, webhook signature valid/invalid + status propagation, admin credential CRUD (secrets not leaked, unknown config keys rejected).
    - `tests/api/<provider>-orders-management.test.ts` — only if sync-required: product auto-sync before order push, `total_price` computation, rejection on empty order.
    - `tests/unit/<provider>-status.test.ts` / `<provider>-location.test.ts` — pure-logic helpers, no DB/HTTP.
    - Mock the HTTP layer via `vi.spyOn(<Provider>Client.prototype, 'request').mockImplementation(...)` — this is exactly why step 3's client has a single `request()` entry point.

## 4. Geo identity across carriers (read this before touching communes)

**There is no shared identifier for an Algerian commune, and there will not be one.** The Maystro row below was verified against its live API on 2026-08-30; the Yalidine row is read from `yalidine-location.service.ts` and has not been re-checked against the live account.

| Carrier | Commune payload | Identifier |
|---|---|---|
| Maystro | `{id, wilaya, name}` | its own sequential id (Béjaïa = 178, Adekar = 201). `postcode` is declared in `MaystroCommune` but the API never populates it — 0 of 52 communes for Béjaïa carry one |
| Yalidine | `{id, name, wilaya_id, …}` | its own numeric commune id (`YalidineCommune.id`) — unrelated to Maystro's |
| Static fallback | `shared/geo/dz-communes.ts` | none — names only |

So two carriers cannot be joined on any key. They can only be joined on the **name**, and their names disagree.

### The failure this causes

The storefront's commune dropdown is a **union** of every offered carrier's list plus the static dataset, deduplicated by `normalizeLocationName()` and flattened to names only (`DeliveryService.listCommuneNames()` → `composables/useDeliveryCommunes.ts`). This is deliberate: the shopper must pick a commune *before* any carrier, because the checkout shows every carrier's price side by side and those prices depend on the commune.

The cost is that a name chosen from the union may belong to a carrier that is not the one being asked. Real examples, both live:

- Béjaïa's **"Aït Maouche"** is Maystro's **"Beni Maouch"**. Both appear in the dropdown as separate entries; only the second ever resolved against Maystro.
- **"Tamanrasset"** is Maystro's **"Tamanghasset"**.

`normalizeLocationName()` only strips diacritics, case and dashes. It will never bridge Aït/Beni or Tamanrasset/Tamanghasset, and no normaliser reasonably could.

### Rules for every carrier

1. **Never hand one carrier another carrier's commune string and assume it resolves.** Resolve at your own boundary and treat "not found" as an ordinary outcome, not an exception.
2. **A commune you cannot resolve must never silently become a different commune.** Substituting is only legitimate when the substitute is genuinely correct for the *whole wilaya*, and you must know which of your prices are wilaya-scoped and which are not. Maystro runs exactly one stop desk per wilaya, sited in `center_commune`, and its desk price is identical for every commune of that wilaya (verified 2026-08-30: 450 DZD across Béjaïa) — so falling back to the centre commune is the true answer for desk discovery and desk pricing. Home delivery is priced *per commune*, so there the same fallback would be a lie: `MaystroProvider.quote()` declines instead and returns no quote, and `DeliveryService` then falls through to the tenant's own saved rate. Getting this backwards is what used to show a shopper a home-delivery price computed from an unrelated commune.
3. **Resolve wilaya-scoped facts from the wilaya, not from the commune.** Anything the carrier operates once per wilaya (a stop desk, a hub, a zone rate) must be reachable without a commune at all.
3b. **Never hand your carrier a commune value you did not resolve yourself.** `DeliveryService.matchProviderCommune()` does this centrally: it turns the picked name into *your* id, and answers `not-carried` when you do not publish that commune, or `no-catalogue` when you publish none at all (SELF). Quotes and pickup-point lookups both go through it, so a carrier only ever receives its own identifier.
4. **An empty result is an answer — say so.** Returning `[]` and rendering nothing is what made a served commune look unserved. The storefront now states it explicitly (`storefront.checkout.delivery.noPickupPoints`); keep that path working for your carrier.
5. **Identifiers you put on an order must be the carrier's own.** See §5 on collection points — a synthetic key must never reach the wire.

### How the union is built (implemented 2026-08-30)

The union is no longer flattened to names. `listCommuneNames()` returns, per entry, the id **each** contributing carrier uses for it:

```ts
{ name: 'Beni Maouch', ids: { MAYSTRO: '227', YALIDINE: '<its own id>' } }
```

Each carrier is then addressed with its own id and no name is ever re-resolved against the wrong catalogue. A carrier that contributed no id for the chosen entry does not quote home delivery for it — honest coverage rather than a silent mismatch — while still offering any wilaya-scoped desk it runs, so the shopper is never left with no option at all.

Live for Béjaïa: 37 of 67 entries carry both carriers' ids; 30 carry one, which is exactly the spelling divergence. **What this does not do is merge the duplicate rows** — "Aït Maouche" and "Beni Maouch" still normalize to different keys and appear separately. Joining them needs a curated alias table (measured 2026-08-30: only 77% of Maystro's commune names match the static dataset by normalized name, so roughly a quarter of ~1541 communes would need curating). Until that exists, both rows work, but they are two rows.

## 5. Collection points: stop desks vs relays

A "pickup point" is not one thing, and the difference decides what goes on the wire.

| | Maystro stop desk | Maystro relay | Yalidine agency |
|---|---|---|---|
| `delivery_type` | 2 | 3 | n/a (`is_stopdesk`) |
| Carrier id | **none** (`pickup_point: null`) | real `pickup_point` | real center id = `stopdesk_id` |
| Addressed by | the wilaya's `center_commune` | the relay's **own** commune | `stopdesk_id` |

Consequences, all of them learned the hard way:

- `ProviderPickupPoint.id` is a **UI key only**; `carrierPointId` is what may go on the wire, and it is `null` when the carrier has no id for that point. A Maystro desk's key is `desk:<commune>`. Collapsing the two — keying a desk by its commune id and sending that as `pickup_point` — is what produced `Invalid pickup_point for commune` on every stop-desk order.
- **Derive the carrier's delivery type from the point's `kind`, never from "an id exists".** A desk pushed as a relay is refused.
- **Validate a relay id against the relay's own commune**, not the shopper's. The two differ whenever a relay was offered from a neighbouring commune, which the nearby-walk does routinely.
- Maystro refuses `delivery_type=2` outside the wilaya's centre commune (error 45), so retarget the payload rather than failing the push — the shopper's address still travels in `destination_text`.

Carrier facts verified live are kept in `docs/delivery-providers/` per provider; the order-level rules above are covered by `tests/unit/maystro-stopdesk-repro.test.ts` and `tests/unit/maystro-stopdesk-payload.test.ts`.

## 6. Non-negotiables (apply project-wide rules from the root `CLAUDE.md`)

- Every query in `<provider>-*.service.ts` must be scoped by `tenantId`. Never trust a tenant id from the webhook payload — resolve it from `req.tenant` (host-based middleware) first, and only fall back to payload-based lookup (mirror `delivery.controller.ts:192-219`) when the carrier can't hit the tenant's own subdomain.
- Controllers stay HTTP-only: parse request, call service, send response. All carrier logic lives in `<provider>-*.service.ts`.
- Webhook signature/secret comparison must use `crypto.timingSafeEqual` after an equal-length check, never `===`.
- Never log or return raw credentials — always go through `redact<Provider>Credentials()` in admin responses.
- Any change touching checkout or order status transitions needs tests (root `CLAUDE.md` rule 5).

## 7. Per-provider doc template

Copy this into `docs/delivery-providers/<provider>-integration-plan.md` when starting a new integration:

```markdown
# <Provider> Integration Plan

## Source docs
- Vendor API doc: <link or path to docs/delivery-providers/<provider>-api.md>
- Auth method: <API key / OAuth / etc.>
- Base URL(s): <prod, sandbox>

## Feature support (fill from vendor doc)
- [ ] Quote/rate endpoint
- [ ] Create order/shipment
- [ ] Cancel order
- [ ] Bulk create
- [ ] Track shipment (polling)
- [ ] Webhook push notifications — signature method: <HMAC / shared secret / none>
- [ ] Requires remote product/stock registration before order creation
- [ ] Geo ID resolution required (wilaya/commune/zone/city)
- [ ] Pickup point / stop-desk support
- [ ] Label/manifest (PDF) generation

## Pattern
- [ ] Simple (Yalidine-style, single provider file)
- [ ] Sync-required (Maystro-style, dedicated subfolder + extra Prisma models)

## Credentials (→ catalog.ts credentialFields, TenantDeliveryAccount.config)
| key | label | required | secret |
|---|---|---|---|

## Status code mapping (→ <provider>-status.ts)
| Carrier status | ShipmentStatus | Order.status |
|---|---|---|

## Env vars
- `<PROVIDER>_BASE_URL` (optional override, defaults to <prod URL>)

## Open questions / carrier quirks
-
```
