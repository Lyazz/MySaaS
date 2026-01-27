# Storefront template layout

- Templates live in per-key folders (e.g. `classic/`, `modern/`) so you can copy a folder to start a new variant.
- Add new views inside that folder (`Home.vue`, `Product.vue`, `Category.vue`, `StoreShell.vue`, plus optional `Shop.vue`, `Checkout.vue`, `ProductCard.vue`).
- Register the components in `registry.ts` so pages can resolve the right version via `templateKey` without editing each page.
- Keep tenant scoping helpers (`useTenantApiUrl`, `useTenantApiHeaders`) inside the components to avoid cross-tenant leakage.
