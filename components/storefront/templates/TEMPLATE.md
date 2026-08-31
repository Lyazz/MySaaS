# New Storefront Template Prompt

Use this prompt when creating a new storefront template in this repository.

```md
You are creating a new storefront template for this Nuxt 3 multi-tenant SaaS codebase.

Template key: `<template-key>`
Reference template: `modern`
Visual brief: `<provided separately outside this file>`

Your job is to create a new template folder at:
`components/storefront/templates/<template-key>/`

The new template MUST be fully registerable and production-ready.

## Core Rule
- Treat `components/storefront/templates/modern/` as the source of truth.
- Preserve the same component contract, data flow, tenant-safe behavior, and feature coverage as `modern`.
- Only change layout, styling, visual hierarchy, spacing, typography, decorative structure, and presentation details.
- Do not change business logic, API behavior, composable usage patterns, tenant scoping behavior, or checkout behavior unless a compatibility fix is strictly required.

## Non-Negotiable Constraints
- The template must remain compatible with the existing registry-based template system.
- The template must be safe for this multi-tenant app.
- Do not introduce any cross-tenant risk.
- Do not hardcode tenant-specific data.
- Do not remove existing storefront capabilities that exist in `modern`.
- Do not ship TODOs in the template code.
- Keep the implementation SSR-safe for Nuxt storefront pages.

## Required File Set
Create all of the following files:

- `components/storefront/templates/<template-key>/ThemeProvider.vue`
- `components/storefront/templates/<template-key>/StoreShell.vue`
- `components/storefront/templates/<template-key>/Home.vue`
- `components/storefront/templates/<template-key>/Shop.vue`
- `components/storefront/templates/<template-key>/Category.vue`
- `components/storefront/templates/<template-key>/Product.vue`
- `components/storefront/templates/<template-key>/ProductCard.vue`
- `components/storefront/templates/<template-key>/Cart.vue`
- `components/storefront/templates/<template-key>/Checkout.vue`
- `components/storefront/templates/<template-key>/AboutPage.vue`
- `components/storefront/templates/<template-key>/ContactPage.vue`
- `components/storefront/templates/<template-key>/ProductLandingPage.vue`
- `components/storefront/templates/<template-key>/Wishlist.vue`
- `components/storefront/templates/<template-key>/variant-ux.ts`
- `components/storefront/templates/<template-key>/partials/ProductDetails.vue`
- `components/storefront/templates/<template-key>/partials/ProductGallery.vue`
- `components/storefront/templates/<template-key>/partials/ProductOrderForm.vue`
- `components/storefront/templates/<template-key>/partials/RelatedProducts.vue`

`Wishlist.vue` is the one file with no `modern` counterpart: `modern` — and most
other templates — fall back to `components/storefront/shared/WishlistDefault.vue`.
Treat that shared file as the behavioural reference (same `products` and `card`
props, same `useFavorites()` usage, product cards still rendered through the
injected `card` component) and give it this template's own presentation. Leaving
the new key mapped to `WishlistDefault` is not acceptable: the fallback is silent,
so the page renders generic chrome inside the new shell and nobody notices until a
customer taps the heart.

## Registration Requirement
Update `components/storefront/templates/registry.ts` so the new template is fully wired into:

- `TemplateKey`
- `resolveTemplateKey`
- all relevant imports
- `homeTemplates`
- `productTemplates`
- `productCardTemplates`
- `categoryTemplates`
- `storeShellTemplates`
- `shopTemplates`
- `checkoutTemplates`
- `cartTemplates`
- `aboutPageTemplates`
- `contactPageTemplates`
- `themeProviderTemplates`
- `wishlistTemplates`

If another page/component registry in the repo depends on the template catalog, update it too, but do not change existing behavior for other templates.

## Implementation Rules
- Start from `modern` and keep file-by-file parity.
- Mirror the same props in each corresponding component.
- Mirror the same composables and state usage unless a presentational refactor requires equivalent restructuring.
- Preserve tenant-safe API calls and headers exactly where they exist.
- Preserve existing routing expectations and Nuxt component usage.
- Preserve cart, pricing, variant, search, category, and checkout behavior.
- Preserve SEO-relevant structure where the template participates in storefront rendering.
- Keep TypeScript types explicit where already present.
- Keep modules small and composable.

## Tenant-Safety Rules
- Any fetch in template components must continue using the existing tenant-safe helpers already used by `modern`, including patterns like `useTenantApiUrl(...)` and `useTenantApiHeaders()`.
- Do not introduce direct API paths that bypass tenant-aware helpers.
- Do not add any client-controlled tenant identifier.

## Styling Rules
- The visual direction will be provided separately and should influence only presentation.
- You may change:
  - layout composition
  - spacing
  - typography
  - color usage
  - card shapes
  - visual sections
  - decorative elements
  - motion and transitions
- You may not change:
  - required business features
  - data requirements
  - expected props contract
  - tenant-aware fetch patterns
  - core product, cart, and checkout logic

## Quality Bar
- The result should feel intentionally designed, not like a superficial recolor of `modern`.
- Even though internals stay compatible, the UI should look custom and coherent.
- Mobile behavior must remain solid.
- Do not break accessibility basics such as button semantics, input usability, or readable contrast.

## Before Finishing
Verify all of the following:

1. The new folder has the full required file set.
2. Each file has a corresponding `modern` source file and remains behaviorally
   compatible — except `Wishlist.vue`, whose reference is `WishlistDefault.vue`.
3. The new template is registered in `components/storefront/templates/registry.ts`.
4. No tenant-safe helper usage was removed or bypassed.
5. No business logic was invented that differs from `modern`.
6. No required storefront surface is missing — including `/wishlist`, which is
   reachable only from the header heart and is therefore the easiest to overlook.
7. The code is clean, consistent, and ready for review.

## Output Format
Return:

1. Summary of changes
2. Files changed
3. How to run / test locally
4. Tests added/updated
5. Assumptions and decisions
```
