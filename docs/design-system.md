# Admin Design System

One kit for `pages/admin`, `pages/super-admin`, `components/admin`,
`components/super-admin` and the two admin layouts. Everything below lives in
`assets/css/main.css` and `components/ui/`.

**Storefront templates are out of scope.** The ten themes (`.kw-*` playful,
`.ed-*` cozy, `wl-*` wellness, …) each own their palette and type scale on
purpose — that is the product, not drift. Nothing here applies to
`components/storefront/`.

## The rule

> A static colour, size or radius in an admin template comes from a token or a
> `.ui-*` component. `:style` is for values computed at runtime — chart bars,
> progress widths, a tenant's picked brand colour.

Two guards enforce it, both run by `npm run lint`:

- `.eslintrc.cjs` — `vue/no-restricted-class` bans the raw Tailwind palette
  (`text-slate-500`, `bg-white`, `text-white`, …) on admin paths.
- `scripts/check-design-kit.mjs` — catches one-off font sizes, off-scale radii,
  and static inline styles a utility already covers.

## Tokens

Defined on `:root` and redefined under `[data-theme="light"]`. The admin theme
toggle (`AdminThemeToggle` → `useUiStore().toggleTheme()`) flips between them,
so **every** colour must resolve through a token or it will be wrong in one of
the two themes.

| Group | Tokens |
|---|---|
| Brand | `--brand`, `--brand-rgb`, `--brand-contrast` |
| Surfaces | `--surface-1` (cards), `--surface-2` (raised: inputs, buttons), `--surface-3` (deepest) |
| Text | `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-muted` |
| Lines | `--surface-border`, `--surface-border-hover` |
| Shell | `--admin-content-bg`, `--admin-sidebar-bg`, `--admin-topbar-bg` (+ their `-border` pairs) |
| Status | `--status-{pending,confirmed,shipped,delivered,cancelled,returned}-{bg,text}` |
| Elevation | `--card-shadow`, `--shadow-overlay` (modals), `--shadow-popover` |
| Misc | `--focus-ring`, `--scrollbar-thumb`, `--skeleton-bg`, `--admin-color-scheme` |

### Utilities

`text-primary` · `text-secondary` · `text-tertiary` · `text-muted` ·
`text-brand` · `text-brand-contrast` · `text-danger` · `text-success` ·
`text-warning`

`surface-1` · `surface-2` · `surface-3` · `bg-admin` · `bg-sidebar` ·
`bg-topbar` · `bg-hover` · `bg-line`

`border-line` · `border-line-strong` · `border-sidebar` · `border-topbar` ·
`divide-line`

`shadow-card` · `shadow-overlay` · `shadow-popover` · `ui-skeleton` ·
`placeholder-tertiary`

Hover variants exist for the ones that need them: `hover:text-primary`,
`hover:bg-hover`, `hover:border-line-strong`, `group-hover:text-primary`.

## Type scale

Nine steps. Tailwind's own scale plus the two smaller steps a dense dashboard
needs. No `text-[13px]` — the admin had grown sixteen such one-offs.

| Utility | Size | Use |
|---|---|---|
| `text-micro` | 10px | uppercase eyebrows, table headers, badges |
| `text-mini` | 11px | hints, subtitles, secondary meta |
| `text-xs` | 12px | dense labels |
| `text-sm` | 14px | **body** — the admin default |
| `text-base` | 16px | emphasised body |
| `text-lg` | 18px | card titles |
| `text-xl` | 20px | page titles |
| `text-2xl` | 24px | stat figures |
| `text-3xl` | 30px | rare display |

Numbers use `.stat-number` or `.font-mono-nums` (Geist Mono, tabular figures)
so columns line up.

## Radius scale

Four steps, plus their logical directional variants (`rounded-s-lg`,
`rounded-e-lg`, `rounded-t-xl` …). Never `rounded-l-*` / `rounded-r-*`: the
admin ships in Arabic and physical directions mirror wrongly under RTL.

| Utility | Size | Use |
|---|---|---|
| `rounded-lg` | 8px | buttons, inputs, table actions, small tiles |
| `rounded-xl` | 12px | icon tiles, toggle rows, inner panels |
| `rounded-2xl` | 16px | cards, modals, top-level panels |
| `rounded-full` | — | pills, badges, avatars, switches |

## Spacing

Card padding `p-5` (what `.ui-card-body` uses), compact `p-4`. Gaps stay on
`gap-1.5 / 2 / 3 / 4 / 6`.

## Components

Auto-imported from `components/ui/` — no import statement needed (see the
`components` block in `nuxt.config.ts`).

| Component | Notes |
|---|---|
| `<UiButton>` | `variant` primary/secondary/danger/success/ghost, `size` sm/md/lg, `icon`, `trailingIcon`, `loading`, `block`. Renders `<NuxtLink>` when `to` is set, `<a>` when `href` is. |
| `<UiCard>` | `title`/`subtitle` props, `header`/`actions`/`footer` slots, `padded` off for edge-to-edge tables. |
| `<UiField>` | Label + hint/error + `for`/`id`/`aria-describedby` wiring. Slot exposes `fieldId`, `describedBy`, `invalid`. |
| `<UiInput>` | Text input. `money` formats via `shared/pricing/money-format` and normalises on blur. |
| `<UiSelect>` / `<UiTextarea>` | Same field wrapper. |
| `<UiToggle>` | Switch; mirrors its thumb under RTL. |
| `<UiBadge>` | `tone` slate/emerald/indigo/lime/amber/red. |
| `<UiPageHeader>` | Section kicker, title, subtitle, action slot, stat pills. Opens every screen. |
| `<UiEmptyState>` | Icon + title + copy + actions. |
| `<UiModal>` | Headless UI `Dialog` — focus trap, Escape, restore focus. `size` sm/md/lg/xl. |

### Deprecated pass-throughs

`BaseInput`, `BaseSelect`, `BaseToggle`, `AdminPageHeader` and `FormField`
forward to their kit equivalent so existing call sites keep working. Use the
`Ui*` name in new code; delete each shim once nothing imports it.

### CSS-only primitives

Tables stay classes — column markup is too bespoke per screen to componentise:
`.ui-table`, `.ui-thead`, `.ui-tbody`, `.ui-th`, `.ui-td`, `.ui-tr`,
`.ui-tr--clickable`, `.ui-table-action`.

Also `.ui-label`, `.ui-eyebrow`, `.ui-hint`, `.ui-error`, `.ui-icon-tile--*`,
`.ui-toggle-row*`, `.ui-wash`, `.ui-dropzone`, `.section-rule`,
`.custom-scrollbar`.

## Free behaviour

Inside `.admin-shell` these come from the kit — do not re-implement per screen:

- **Focus** — one 2px `--focus-ring` outline on every link, button, switch and
  summary. Inputs opt out; they answer focus with a border and glow.
- **Touch** — under `@media (pointer: coarse)` controls grow to 44px and input
  text to 16px, which is what stops iOS Safari zooming the viewport on focus.
- **Reduced motion** — `prefers-reduced-motion` neutralises animation and
  transition durations shell-wide.
- **Native widgets** — `color-scheme` follows the theme, so date pickers and
  scrollbars match the shell.

## Settings screens

`assets/css/admin-settings.css` is now layout only: save-bar clearance,
`.field-grid`, `.field-input-group`. The old `.field-input` / `.settings-btn` /
`.toggle-row` spellings are listed as extra selectors beside their `.ui-*`
equivalents in `main.css` so the markup can migrate gradually. When a settings
form moves to `<UiField>` / `<UiButton>`, drop its legacy selector from those
lists in `main.css`.
