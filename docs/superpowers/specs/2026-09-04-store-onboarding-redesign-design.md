# Store Onboarding Redesign + Draft Storefront Gate

Date: 2026-09-04
Status: Approved

## Problem

1. **The storefront opens the instant a merchant registers.** `auth.service.registerTenant`
   creates the tenant with `isOffline: false`, and nothing else gates the public
   storefront. A brand-new tenant with no products, no logo and default settings is
   already reachable at `{slug}.swekly.com`.
2. **The publish gate is a no-op.** `publishStore()` sets `isOffline = false`, which is
   already false, and the getting-started checklist reads `isPublished` from that same
   flag — so "Publish your store" shows as done on day one and clicking it changes
   nothing. `isOffline` is the offline-only *tier* flag; it was never a publish flag.
3. **The onboarding wizard is plain and incomplete.** Four steps in a bordered card with
   a progress bar. It never makes the store sellable (no product, no delivery), the
   `description` field it collects is silently discarded by `save()`, and
   `StepFirstProduct.vue` is dead code that the page never renders and whose expected
   `form.product` key does not exist on the page's reactive form.
4. **The merchant is trapped.** `admin-onboarding.global.ts` hard-redirects every
   `/admin/*` route back to the wizard until `isCompleted` flips, with no way to step out
   and come back.

## Decisions

| Question | Decision |
|---|---|
| Who confirms the store? | The merchant. New tenants are DRAFT; the merchant publishes. |
| What do visitors see while DRAFT? | `404 Not Found`. |
| Wizard scope | 6 steps, ending in a store that can take an order. |
| Visual direction | Full-screen split view with a live storefront preview. |
| Publish requirements | ≥1 product **and** ≥1 delivery method (`SELF` counts). Hard block. |
| Escapability | "Finish later" exits and resumes; no permanent trap. |
| Draft preview | Authenticated owner/staff bypass the 404 and see the real storefront. |
| Preview panel | The real storefront in an iframe, fed draft state over `postMessage`. |
| Public API while DRAFT | Also 404, so a draft store cannot be read or ordered from by API. |

## Data model

```prisma
model Tenant {
  publishedAt DateTime?   // null = DRAFT. Public storefront 404s.
}

model StoreSettings {
  description       String?    // store tagline, collected in step 0, previously dropped
  onboardingStep    Int       @default(0)  // resume point
  onboardingExitedAt DateTime?             // set by "Finish later"
}
```

Migration backfills `publishedAt = createdAt` for **every existing tenant** so no live
store goes dark. `isOffline` reverts to meaning only "offline-only tier" and is no longer
touched by publish.

## The DRAFT gate

Two enforcement points, because they protect different surfaces.

**`server/middleware/tenant.ts`** (browser/SSR), between the `isSuspended` and
`maintenanceMode` checks:

```
publishedAt == null
  ├─ /admin, /login, /register, /forgot-password   → allow
  ├─ auth_token cookie verifies AND its tenantId
  │  matches this tenant                           → allow, set context.storefrontDraft
  └─ otherwise                                     → 404
```

**`backend/src/middleware/subscription.middleware.ts`** (Express API): the same rule for
non-`/api/admin` paths. Without this, `/api/store/settings`, `/api/products` and
`POST /api/orders` still answer for a draft tenant — the store would be orderable by API
while 404ing in a browser.

Membership is checked two ways there, because the two clients authenticate differently.
`expressAuthMiddleware` runs first and resolves `req.user`, but it reads the
**Authorization header only**; a browser walking the owner's own draft storefront sends
its session as the `auth_token` **cookie**. Checking `req.user` alone would render the
draft page and then 404 every API call inside it. Both gates therefore share one module,
`backend/src/lib/draft-storefront.ts`, so the SSR and API rules cannot drift apart. That
module is deliberately limited to this one read-only decision — teaching
`expressAuthMiddleware` to accept cookies generally would hand every state-changing
endpoint a CSRF surface it does not have today.

When `storefrontDraft` is set, `layouts/store.vue` renders a sticky
"DRAFT — only you can see this · Publish" bar.

## Wizard

`/admin/onboarding` becomes `layout: false`. Three columns: step rail, focused question,
device frame (phone/desktop) holding the preview iframe.

| # | Step | Writes |
|---|---|---|
| 0 | Identity — name, logo, tagline | `Tenant.name`, `logoUrl`, `description` |
| 1 | Template — 17 themes, search + audience filter | `templateKey` |
| 2 | Brand colour | `primaryColor` |
| 3 | First product — name, price, image | creates a real `Product` |
| 4 | Delivery — SELF / Maystro / Yalidine | `allowedDeliveryProviders` |
| 5 | Publish — summary, real URL, reveal | `Tenant.publishedAt` |

Language folds into step 0 as a three-chip row rather than keeping a step of its own: it
does not earn a full screen ahead of "can this store sell", but dropping it outright would
strand Arabic-first merchants with a French default.

Publish is hard-blocked until the product and delivery requirements hold, with the
missing item named inline and a link back to that step — not a dead greyed button.

"Finish later" stamps `onboardingExitedAt`. The global middleware then redirects only
when `isCompleted === false && onboardingExitedAt === null`, so a merchant is pulled in
once and never trapped. `/admin` carries a DRAFT banner plus the checklist.

## Preview contract

`pages/admin/preview-iframe.vue` accepts `postMessage({ type: 'swekly:onboarding-draft',
payload: { templateKey, primaryColor, name, logoUrl, product } })`, same-origin only,
debounced, and overrides its local state from it so the panel reflects unsaved edits.
Its hardcoded `templatesMeta` — currently 11 of 17 entries, missing interior, minimal,
playful, activewear, nour and embellir — is replaced by the registry's `TEMPLATE_KEYS`.

## Testing

Rule 5 of CLAUDE.md applies (tenancy + checkout):

- `tests/api/storefront-draft-gate.test.ts` — public API 404s for a draft tenant, owner
  passes by Bearer token *and* by session cookie, another tenant's session and a forged
  cookie are refused, `/api/admin/*` unaffected, published tenant unaffected.
- `tests/unit/draft-storefront.test.ts` — the gate rule itself, with no database: cookie
  parsing (including the `other_auth_token` near-miss), token/tenant matching, and which
  paths stay reachable while a store is a draft.
- `tests/api/store-settings-publish.test.ts` — publish rejected without a product,
  rejected without delivery, accepted with both, sets `publishedAt`, leaves `isOffline`
  alone, and is tenant-scoped.
- Existing `tests/unit/AdminGettingStartedChecklist.test.ts` updated for the new
  `isPublished` source and `canPublish`.
