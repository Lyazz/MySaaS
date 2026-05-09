# Feature Mechanism Animations — Design

**Date:** 2026-05-09
**Scope:** Landing page (`pages/index.vue` → `components/SaasLanding.vue`) + Features page (`pages/features.vue`)

## Goal

Replace the static feature visuals (single icon in a glow box, plain icon-only `FeatureCard3D`) with **mechanism animations** — small looping scenes that show *how* each feature works, in the existing cinematic dark + lime-neon aesthetic.

## Where the animations live

### `pages/features.vue` — 4 large scenes (full size)

Each of the 4 feature groups currently renders a static visual block (lines 116–127 of `pages/features.vue`): a single icon inside a glowing rounded square. We replace that block with a full-size mechanism scene per group:

| Group eyebrow      | Mechanism                  |
| ------------------ | -------------------------- |
| 01 · Storefront    | `MechanismBuilder` (full)  |
| 02 · Commerce      | `MechanismPayment` (full)  |
| 03 · Logistics     | `MechanismLogistics` (full)|
| 04 · Intelligence  | `MechanismAnalytics` (full)|

The wrapper container, aspect ratio (5/4), card chrome, and `v-motion-slide-visible-once-bottom` directive stay unchanged.

### `components/SaasLanding.vue` — micro versions in the feature grid

The features grid renders 6 `FeatureCard3D` cards (icons only). We extend `FeatureCard3D` with an optional `mechanism` slot/prop so each card can render a compact mechanism above its title:

| Feature key   | Mechanism (compact)         |
| ------------- | --------------------------- |
| tenancy       | `MechanismTenancy` (compact)|
| localization  | `MechanismLocalization` (compact)|
| logistics     | `MechanismLogistics` (compact)|
| analytics     | `MechanismAnalytics` (compact)|
| payments      | `MechanismPayment` (compact)|
| mobile        | reuse `MechanismBuilder` (compact) — phone-frame variant of the builder reads as "mobile-ready"

The 4 `stepCards` of "How it works" keep their current `FeatureCard3D` look — out of scope.

## Mechanism specs

Every mechanism is a self-contained Vue SFC with **only** SVG + scoped CSS. No props for data, no i18n inside. They take a single prop:

```ts
defineProps<{ size?: 'full' | 'compact' }>()
```

- `full` → fills its parent (aspect 5/4 expected), used in `features.vue`.
- `compact` → square ~120 × 120 px, used inside grid cards on landing.

All mechanisms share:

- Background: transparent (parent provides the cinematic gradient + grid).
- Accent color: `var(--lime-neon)` / `text-lime-neon`.
- Neutral strokes: `white/10`, `white/20`.
- Loop runs continuously via CSS `@keyframes` once mounted.
- Respects `@media (prefers-reduced-motion: reduce)` — animations paused, final visible state retained.
- No JS timers; pure CSS animation-delay staggering.

### 1. `MechanismBuilder.vue` — Storefront builder

**Concept:** wireframe of a page being assembled. A faint outline of a page frame is always visible. Three rectangular blocks (hero / product grid / footer) drop in from above one by one and snap into their slots. A small cursor SVG follows the block being placed. Loop ~4s.

**Key elements:**
- Page frame: rounded rect, `stroke white/10`.
- Block A (hero): tall rect, fades + translates from `-y 20px` → resting position, delay 0s.
- Block B (grid): grid of 4 small rects, delay 1s.
- Block C (footer): short rect, delay 2s.
- Cursor: small arrow SVG, animates between block positions.
- After 3.5s all blocks "flash" once via box-shadow lime-neon, then loop restarts.

**Compact variant:** same but no cursor, just blocks dropping in.

### 2. `MechanismPayment.vue` — Commerce / payments

**Concept:** a credit-card SVG slides horizontally toward a terminal, the terminal pulses lime-neon (scan), a check icon fades in over the terminal, an amount counter ticks up. Loop ~3.5s.

**Key elements:**
- Card: SVG rounded rect with two stripes (chip + number) — translates from left edge → terminal.
- Terminal: SVG rectangle with screen + slot.
- Pulse: ring expanding from terminal at scan moment.
- Check: lucide check-circle, fades in at 2.2s.
- Amount ticker: monospace text counting `0 → 12 480` (no currency mark), ticks during the scan phase.
- Reset at 3.5s.

**Compact variant:** card + terminal only, no ticker (too small to read).

### 3. `MechanismLogistics.vue` — Logistics (revised, no map)

**Concept:** abstract conveyor with 3 generic nodes. A package box slides along a dotted track between them. Each node lights up (lime-neon dot + ring) as the package arrives. A status label switches in monospace. Loop ~4s.

**No geography. No country reference. No map.**

**Key elements:**
- Track: dashed horizontal line, animated `stroke-dashoffset` (subtle drift).
- 3 nodes: warehouse icon (lucide:warehouse), transit (lucide:truck), home (lucide:home), evenly spaced.
- Package: small box SVG (square + lid line), translates `node1 → node2 → node3`.
- Active node: lime-neon ring + dot scale pulse.
- Status label: monospace pill near the package, content cycles `PICKED → IN TRANSIT → DELIVERED` synced with package position.
- After "DELIVERED", short pause then loop.

**Compact variant:** 3 nodes with a single dot moving between them, no label (too small).

### 4. `MechanismAnalytics.vue` — Intelligence

**Concept:** mini dashboard. 4 vertical bars grow from 0 to staggered heights, a polyline trend draws across them, a KPI counter ticks. Loop ~4s.

**Key elements:**
- 4 bars (rect): grow via `transform: scaleY` from origin bottom, staggered 0.15s delays.
- Trend line: SVG polyline, `stroke-dasharray` reveal.
- KPI big number (monospace): ticks `0 → 248` during the bars-growing phase.
- Sparkle accent: tiny pulse on the line endpoint.
- Hold final state ~1s then reset.

**Compact variant:** bars + trend line, no KPI.

### 5. `MechanismTenancy.vue` — Multi-tenant (landing only, compact)

**Concept:** a 2×2 grid of small "store" cards. Each one independently shows tiny content (header bar + 2 lines). They breathe at different rhythms (subtle scale + opacity offset) to read as "multiple isolated tenants". Each card has its own lime-neon corner accent in a different position to imply uniqueness. Loop ~5s with phase offsets.

### 6. `MechanismLocalization.vue` — Localization (landing only, compact)

**Concept:** centered glyph that cycles through `EN → FR → AR` characters, fade-and-slide between. The frame around it briefly shows arrow direction (`→` for LTR, `←` for RTL when AR is active). Loop ~3s.

## Component file structure

```
components/marketing/cinematic/mechanisms/
├── MechanismBuilder.vue
├── MechanismPayment.vue
├── MechanismLogistics.vue
├── MechanismAnalytics.vue
├── MechanismTenancy.vue
└── MechanismLocalization.vue
```

Auto-imported as `MarketingCinematicMechanismsMechanismBuilder` etc. (Nuxt convention used by other cinematic components).

## Integration changes

### `pages/features.vue`

Replace the visual block (lines 116–127) per group. Map group icon → mechanism:

```vue
<component :is="mechanismForGroup(group.icon)" size="full" />
```

Helper resolves icon name → mechanism component:
- `lucide:layout-template` → Builder
- `lucide:credit-card`     → Payment
- `lucide:truck`           → Logistics
- `lucide:bar-chart-3`     → Analytics

The aspect-5/4 card wrapper, gradient background, and `cinematic-grid-bg` overlay stay; we drop the inner glow-icon block and slot the mechanism inside the same `relative h-full` container.

### `components/marketing/cinematic/FeatureCard3D.vue`

Add an optional `mechanism` prop (component or component name) and an optional default slot. When set, the card renders the mechanism in a fixed-height area above the title (replacing or sitting beside the existing icon chip). Existing usages without `mechanism` keep working unchanged → backward-compatible.

### `components/SaasLanding.vue`

In the `featureGrid` array, add a `mechanism` field per feature:

```ts
{ icon: 'lucide:layers', mechanism: 'MarketingCinematicMechanismsMechanismTenancy', title: ..., description: ... }
```

Pass it through to `FeatureCard3D`. The "How it works" `stepCards` block keeps its current visual.

## Performance

- Pure SVG/CSS; no canvas, no WebGL, no JS animation runtime.
- Loops use `transform` + `opacity` only (GPU-friendly).
- 4 full mechanisms + 6 compact mechanisms ≈ 10 looping CSS scenes per landing render. Each scene has ≤ 8 animated elements. Acceptable for desktop and mid-range mobile.
- Mechanisms render only after `v-motion-slide-visible-once-bottom` triggers, so off-screen scenes don't paint until needed.
- Reduced-motion users see static final frames.

## Accessibility

- All mechanisms are decorative → `aria-hidden="true"` on the root SVG.
- No information conveyed only through animation; titles + descriptions in the parent card carry the meaning.
- `prefers-reduced-motion: reduce` disables loops.

## Out of scope

- Updating the "How it works" 4 step cards (`stepCards`).
- Updating the "Live preview" admin orders mock — already animated/styled.
- New i18n strings (mechanisms have no text or use mock placeholder text only).
- Theme/light variant — landing is dark-only.
- Storybook entries.

## Testing

- Visual smoke check on `pages/features.vue` and `pages/index.vue` (landing) at `npm run dev`.
- Verify each mechanism mounts and loops without console errors.
- Verify reduced-motion: toggle OS setting, confirm scenes hold a static frame.
- Verify RTL: pages already render with `dir="rtl"` in AR — mechanisms are direction-agnostic except `MechanismLocalization` whose arrow flips when AR is the active glyph (purely visual, no layout impact).
- No new unit tests required — mechanisms are presentational, no logic.
