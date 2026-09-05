# Modern template — UI breakage fixes

Date: 2026-09-05
Scope: `components/storefront/templates/modern/` only.

## Problem

`modern` is the reference template: `components/storefront/templates/TEMPLATE.md`
tells every new theme to clone it file-by-file, and seventeen themes now exist.
A UI review of the template found six defects that are behavioural breakage
rather than taste — surfaces that are unreachable, unreadable, or invisible for
some users — and several of them have already been cloned into other themes.

This spec covers only the breakage. Visual-coherence work (page grounds,
category tile overlays, carousel monotony, missing headings) is deliberately
deferred; see *Out of scope*.

## Fixes

### 1. Search dropdown is parented to the search icon

`StoreShell.vue` — the results panel sits inside the icon wrapper, which is
`absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none`. A `w-64`
panel therefore hangs off a 20px icon instead of spanning the 512px field, and
it carries a `pointer-events-auto` class that exists only to undo the
`pointer-events-none` it inherited from the wrong parent.

Make the panel a sibling of the `<input>` inside the `.relative.group`
container. Width becomes `start-0 end-0` rather than `w-64 end-0`. Remove the
`pointer-events-auto` patch.

No script changes: `searchQuery`, the 500ms debounce, `openSearchDropdown`,
`closeSearchDropdownSoon`, `visibleSearchResults` and `showMoreSearchResults`
are untouched.

### 2. No header search below `lg`

`StoreShell.vue` — the search field is `hidden lg:block`. On phones and tablets
search exists only inside the hamburger drawer, on a storefront whose market is
mobile-first.

Mirror the pattern already proven in `components/storefront/templates/maison/StoreShell.vue`:
a `searchOpen` ref, a search icon button rendered `lg:hidden` in the header
actions row, toggling a full-width search row beneath the header. The row binds
the same `searchQuery` and renders the same dropdown from fix 1, so there is one
search implementation and one fetch path, not two.

Closing the row clears `searchQuery`, matching `maison`.

### 3. Hero overlay gradient does not flip in RTL

`Home.vue` — the hero overlay is `bg-gradient-to-r from-black/70 via-black/40
to-transparent`, a physical direction. The slide copy inside it is positioned
with logical properties, so in Arabic the text moves to the right edge while the
dark end of the gradient stays on the left. White display type lands on the
transparent side of the image.

Add `rtl:bg-gradient-to-l`.

The identical bug exists at the same place in `activewear`, `interior`,
`stationnery` and `minimal`. Fixing those is explicitly deferred to a follow-up
so this diff stays reviewable.

### 4. Stock state is hover-only

`ProductCard.vue` — the in-stock, low-stock and out-of-stock badges are all
`opacity-0 group-hover:opacity-100`. Touch devices have no hover, so a shopper
on a phone cannot tell that a product is out of stock until the product page or
the cart rejects them.

- Out-of-stock badge: always visible, every breakpoint. It blocks a purchase; it
  is information, not decoration.
- In-stock and low-stock badges: visible below `lg`, hover-revealed at `lg` and
  above, preserving the desktop hover polish.

### 5. Category dropdown is hover-only

`StoreShell.vue` — the desktop categories menu opens via `group-hover:visible`
and is positioned `top-[80%]`, leaving a 20% gap the pointer falls through on
the way down. It is unreachable by keyboard entirely.

Convert to a click toggle:

- `<button>` gets `aria-expanded` and `aria-controls`.
- Escape closes; click-outside closes.
- `focus-within` keeps it open while tabbing through the links.
- `top-[80%]` becomes `top-full`, closing the pointer gap.

### 6. Motion ignores `prefers-reduced-motion`

`Home.vue` and `Product.vue`:

- The `fadeInUp` keyframes in `Product.vue`'s scoped style run on SSR'd content
  with an `animation-delay: 0.2s` inline on the description block. Wrap the
  keyframe application in `@media (prefers-reduced-motion: no-preference)`,
  matching the precedent in `cozy` and `embellir`.
- The hero autoplays every 6s. It already pauses on `touchstart` and resumes on
  `touchend`, but has no pointer equivalent. Add `@mouseenter` / `@mouseleave`
  bound to the existing `pauseSlideAutoplay` / `resumeSlideAutoplay`.
- Under `prefers-reduced-motion: reduce`, the hero does not start its interval.
  The arrows and dots keep working, so all slides stay reachable.

## Out of scope

Deferred deliberately — these are visual-coherence work, not breakage:

- `ThemeProvider.vue` sets `bg-slate-50` while `StoreShell.vue` sets
  `bg-[#f8faf9]`; two page grounds fight. (`theme.tokens.ts` already flags that
  hex as a fold-in candidate.)
- The lone `dark:border-slate-800` on the header, in a template with no dark mode.
- Category tiles stacking an index-cycled base colour, a 70%-opacity image, a
  black gradient, a blurred white circle and a frosted label box.
- Three horizontal auto-scrollers in a row on the homepage; "View all products"
  repeated three times.
- `Shop.vue` has no `<h1>`, and ships commented-out pill markup.
- PDP stacking its own sparkle banner under the global announcement and
  clearance banners.
- The RTL hero fix in `activewear`, `interior`, `stationnery`, `minimal`.

## Testing

None of these changes touch tenancy, auth, or checkout, so `CLAUDE.md` requires
no new API tests.

Verification is manual, in the browser preview:

1. Arabic locale, homepage — hero copy sits on the dark end of the gradient.
2. Mobile width, a product with `stock: 0` — the out-of-stock badge is visible
   without interaction.
3. Keyboard only — Tab reaches the categories button, Enter opens it, Tab walks
   the links, Escape closes it.
4. Desktop — the search dropdown spans the search field and its rows are
   clickable.
5. Mobile width — the header search button opens a usable search row.
6. OS reduced-motion on — the hero does not auto-advance and the PDP
   description is visible immediately.

`npm run typecheck` and `npm run lint` must pass. (`lint:design` does not apply:
storefront templates are exempt from the admin design-kit rules.)
