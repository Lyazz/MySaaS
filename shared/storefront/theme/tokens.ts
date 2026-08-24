/**
 * The storefront theme token contract.
 *
 * Every template's visual identity is described here as data instead of being
 * spelled out in Tailwind classes across its ~16 components. `maison` already
 * worked this way through its `--at-*` block; this is that shape, typed, so the
 * template creator can read a theme, fork it, and write a new one back.
 *
 * Two rules hold the system together:
 *
 *   1. A colour role is a job, not a hue. `ink` is whatever the type is set in,
 *      whether the theme is paper-light (`nour`) or near-black (`arena`).
 *      Roles are what the creator's inspector shows; hexes are what it stores.
 *
 *   2. Only `EDITABLE_COLOR_ROLES` may be overridden by a tenant. The rest are
 *      the template author's calls. `wellness` states the reason in its own
 *      palette notes: saffron cautions and henna marks a markdown, so a tenant
 *      who sets their brand to saffron must not silently redefine "caution".
 */

/** Colour roles every template must fill. */
export interface ThemeColorRoles {
  /** Page ground. */
  bg: string
  /** Second ground, one step off `bg`, for banded sections. */
  bgAlt: string
  /** Raised stock: cards, header, drawers. */
  surface: string
  /** Recessed or tinted surface. */
  surfaceAlt: string
  /** Primary type and solid buttons. */
  ink: string
  /** Secondary type. */
  inkSoft: string
  /** Captions, units, disabled type. */
  inkFaint: string
  /** The hairline the layout is built on. */
  border: string
  /** Emphasised divider and input outline. */
  borderStrong: string
  /** The house hue. Links, seals, active states. */
  brand: string
  /** Brand darkened far enough to hold AA on `bg`. */
  brandDeep: string
  /** Brand at wash strength, for fills behind type. */
  brandSoft: string
  /** The second voice: gold, neon, saffron. Used sparingly. */
  accent: string
  accentDeep: string
  accentSoft: string
  /** A price that came down. Nothing else may use it. */
  sale: string
  /** Time running out, low stock. */
  warning: string
  /** A form that failed. The only true red. */
  danger: string
  /** Confirmation. */
  success: string
}

export type ThemeColorRole = keyof ThemeColorRoles

/**
 * Roles a tenant may repaint in the template creator.
 *
 * Deliberately short. A merchant picking three colours cannot produce an
 * unreadable store, and cannot overwrite a role that carries meaning.
 */
export const EDITABLE_COLOR_ROLES = ['brand', 'accent', 'bg', 'ink'] as const
export type EditableColorRole = (typeof EDITABLE_COLOR_ROLES)[number]

/**
 * Roles regenerated from an editable one when a tenant overrides it, and how
 * far to shift the source: negative darkens, positive lightens.
 *
 * The amounts are read off the built-in manifests rather than picked, so a
 * tenant who leaves a colour alone gets the template author's exact value and
 * a tenant who changes it gets the same relationship applied to their hue.
 */
export const DERIVED_COLOR_ROLES: Partial<
  Record<ThemeColorRole, { from: EditableColorRole; shift: number }>
> = {
  brandDeep: { from: 'brand', shift: -0.28 },
  brandSoft: { from: 'brand', shift: 0.86 },
  accentDeep: { from: 'accent', shift: -0.28 },
  accentSoft: { from: 'accent', shift: 0.5 },
  bgAlt: { from: 'bg', shift: -0.06 },
  inkSoft: { from: 'ink', shift: 0.28 },
  inkFaint: { from: 'ink', shift: 0.52 }
}

/** A tenant's overrides, as stored by the template creator. */
export type ThemeColorOverrides = Partial<Record<EditableColorRole, string>>

/**
 * Apply a tenant's overrides to a manifest.
 *
 * An override repaints its role and every role derived from it; roles the
 * tenant did not touch keep the template author's values untouched. Passing no
 * overrides returns the manifest's own colours, which is what keeps the
 * built-in templates pixel-identical.
 */
export const applyColorOverrides = (
  tokens: ThemeTokens,
  overrides?: ThemeColorOverrides | null
): ThemeTokens => {
  // Filtered against EDITABLE_COLOR_ROLES at runtime, not just in the type.
  // These overrides arrive as tenant-supplied JSON, and a payload naming
  // `danger` or `sale` must not be able to redefine what those mean.
  const touched = Object.entries(overrides || {}).filter(
    ([role, hex]) =>
      (EDITABLE_COLOR_ROLES as readonly string[]).includes(role) &&
      typeof hex === 'string' &&
      /^#[0-9a-fA-F]{6}$/.test(hex)
  ) as [EditableColorRole, string][]

  if (!touched.length) return tokens

  const color: ThemeColorRoles = { ...tokens.color }

  for (const [role, hex] of touched) {
    color[role] = hex
  }

  for (const [role, rule] of Object.entries(DERIVED_COLOR_ROLES)) {
    if (!touched.some(([edited]) => edited === rule.from)) continue
    color[role as ThemeColorRole] = shiftHex(color[rule.from], rule.shift)
  }

  return { ...tokens, color }
}

export interface ThemeFont {
  /** Family name as loaded, e.g. `Fraunces`. */
  family: string
  /** Full CSS stack including fallbacks. */
  stack: string
  /** Weights the template actually uses, for the font loader. */
  weights: number[]
}

export interface ThemeTypography {
  /** The characteristic face. Headings, and nothing that runs long. */
  display: ThemeFont
  /** Body copy and UI. */
  body: ThemeFont
  /** Microtype: labels, data, prices. Falls back to `body`. */
  label?: ThemeFont
}

export interface ThemeGeometry {
  /** Corner radius, in px, per component family. */
  radiusButton: number
  radiusCard: number
  radiusInput: number
  radiusPill: number
  /** Section rhythm multiplier. 1 is the reference (`modern`). */
  density: number
}

export interface ThemeMotion {
  /** Base transition duration in ms. */
  duration: number
  /** CSS timing function. */
  easing: string
}

/**
 * A neutral ramp, Tailwind-shaped.
 *
 * The hex-led templates got by with three ink weights and two rules, because
 * that is genuinely all they used. The Tailwind-led ones do not: `modern`
 * alone reaches for ten slate weights and eight gray weights across type,
 * grounds and rules. Forcing those onto `ink` / `inkSoft` / `inkFaint` would
 * collapse distinctions the design is actually making.
 *
 * So those templates carry a ramp as well, and their shared roles point into
 * it. The creator never shows a merchant eleven greys — it offers the ramp's
 * hue and contrast as two controls and regenerates the steps.
 */
export interface ThemeRamp {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
  950?: string
}

export type ThemeRampStep = keyof ThemeRamp

export interface ThemeTokens {
  /** Registry key. Matches the folder under `templates/`. */
  key: string
  /** Merchant-facing name shown in the creator. */
  name: string
  /** Short CSS var / Tailwind namespace, e.g. `at`, `wl`, `emb`. */
  prefix: string
  /** One line on what this template is for. Shown on the picker card. */
  fit: string
  /** `light` or `dark` — drives the creator's contrast checks. */
  scheme: 'light' | 'dark'
  color: ThemeColorRoles
  /**
   * The neutral ramp, for templates that use more grey weights than the role
   * vocabulary holds. Omitted by templates whose neutrals fit the roles.
   */
  ramp?: ThemeRamp
  /**
   * Default-Tailwind neutral families this ramp replaces, e.g.
   * `['slate', 'gray']`. Chromatic families are deliberately absent: `red-700`
   * is `danger`, and `EDITABLE_COLOR_ROLES` already says a tenant may not
   * repaint that, so leaving those classes on the stock palette is the correct
   * outcome rather than an unfinished one.
   */
  rampFamilies?: string[]
  /** Hues specific to this template that no role covers. Not editable. */
  extra?: Record<string, string>
  type: ThemeTypography
  geometry: ThemeGeometry
  motion: ThemeMotion
  /** Ready-made CSS shadow values, keyed `xs` | `sm` | `md` | `lg`. */
  shadow?: Record<string, string>
}

/**
 * Mix a hex toward black (negative) or white (positive) by a 0–1 amount.
 *
 * Used to regenerate the derived roles when a tenant repaints `brand` or
 * `accent`. Done in JS rather than with CSS `color-mix` because the derived
 * value also has to be published in channel form for opacity modifiers, and
 * `color-mix` cannot be unpacked into channels.
 */
export const shiftHex = (hex: string, amount: number): string => {
  const channels = hexToRgbChannels(hex).split(' ').map(Number)
  const target = amount >= 0 ? 255 : 0
  const weight = Math.abs(amount)

  const mixed = channels.map((channel) => {
    const value = Math.round(channel + (target - channel) * weight)
    return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')
  })

  return `#${mixed.join('')}`
}

/** `#A67C52` -> `166 124 82`, the channel form Tailwind opacity modifiers need. */
export const hexToRgbChannels = (hex: string): string => {
  let value = (hex || '').trim().replace('#', '')

  if (value.length === 3) {
    value = value.split('').map((char) => char + char).join('')
  }

  const match = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value)
  if (!match) return '0 0 0'

  return `${parseInt(match[1], 16)} ${parseInt(match[2], 16)} ${parseInt(match[3], 16)}`
}

/**
 * Flatten a manifest into the custom properties the generic ThemeProvider binds.
 *
 * Each colour emits twice: `--{prefix}-{role}` for direct use and
 * `--{prefix}-{role}-rgb` for the `rgb(var(...) / <alpha-value>)` form that
 * makes `bg-nr-brand/40` work. The second is why we can retire the ~418
 * arbitrary-value opacity classes without changing a single rendered pixel.
 */
export const tokensToCssVars = (tokens: ThemeTokens): Record<string, string> => {
  const { prefix } = tokens
  const vars: Record<string, string> = {}

  for (const [role, hex] of Object.entries(tokens.color)) {
    vars[`--${prefix}-${kebab(role)}`] = hex
    vars[`--${prefix}-${kebab(role)}-rgb`] = hexToRgbChannels(hex)
  }

  for (const [step, hex] of Object.entries(tokens.ramp || {})) {
    vars[`--${prefix}-ramp-${step}`] = hex
    vars[`--${prefix}-ramp-${step}-rgb`] = hexToRgbChannels(hex)
  }

  for (const [name, value] of Object.entries(tokens.extra || {})) {
    vars[`--${prefix}-${kebab(name)}`] = value
    if (/^#[0-9a-f]{3,8}$/i.test(value)) {
      vars[`--${prefix}-${kebab(name)}-rgb`] = hexToRgbChannels(value)
    }
  }

  vars[`--${prefix}-font-display`] = tokens.type.display.stack
  vars[`--${prefix}-font-body`] = tokens.type.body.stack
  vars[`--${prefix}-font-label`] = (tokens.type.label || tokens.type.body).stack

  vars[`--${prefix}-radius-button`] = `${tokens.geometry.radiusButton}px`
  vars[`--${prefix}-radius-card`] = `${tokens.geometry.radiusCard}px`
  vars[`--${prefix}-radius-input`] = `${tokens.geometry.radiusInput}px`
  vars[`--${prefix}-radius-pill`] = `${tokens.geometry.radiusPill}px`
  vars[`--${prefix}-density`] = String(tokens.geometry.density)

  vars[`--${prefix}-duration`] = `${tokens.motion.duration}ms`
  vars[`--${prefix}-easing`] = tokens.motion.easing

  for (const [name, value] of Object.entries(tokens.shadow || {})) {
    vars[`--${prefix}-shadow-${kebab(name)}`] = value
  }

  return vars
}

/**
 * The Tailwind `colors` entry for a theme, so `text-nr-ink` and
 * `bg-nr-brand/40` both resolve. Mirrors how `brand.*` is already declared
 * in `tailwind.config.ts`.
 */
export const buildTailwindColorScale = (
  prefix: string,
  roles: readonly string[]
): Record<string, string> => {
  const scale: Record<string, string> = {}

  for (const role of roles) {
    scale[kebab(role)] = `rgb(var(--${prefix}-${kebab(role)}-rgb) / <alpha-value>)`
  }

  return scale
}

export const THEME_COLOR_ROLES: readonly ThemeColorRole[] = [
  'bg', 'bgAlt', 'surface', 'surfaceAlt',
  'ink', 'inkSoft', 'inkFaint',
  'border', 'borderStrong',
  'brand', 'brandDeep', 'brandSoft',
  'accent', 'accentDeep', 'accentSoft',
  'sale', 'warning', 'danger', 'success'
] as const

const kebab = (value: string): string => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
