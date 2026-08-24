import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  DERIVED_COLOR_ROLES,
  EDITABLE_COLOR_ROLES,
  THEME_COLOR_ROLES,
  applyColorOverrides,
  buildTailwindColorScale,
  hexToRgbChannels,
  shiftHex,
  tokensToCssVars
} from '~/shared/storefront/theme/tokens'
import { nourTokens } from '~/components/storefront/templates/nour/theme.tokens'
import { embellirTokens } from '~/components/storefront/templates/embellir/theme.tokens'
import { chronoTokens } from '~/components/storefront/templates/chrono/theme.tokens'
import { modernTokens } from '~/components/storefront/templates/modern/theme.tokens'
import { TEMPLATE_ORIGINAL_BRAND_COLORS } from '~/shared/storefront/template-brand'

/** Manifests of every template that has been moved onto tokens. */
const TOKENISED = [nourTokens, embellirTokens, chronoTokens, modernTokens]

describe('theme token contract', () => {
  it.each(TOKENISED)('$key fills every shared colour role', (tokens) => {
    for (const role of THEME_COLOR_ROLES) {
      expect(tokens.color[role], `${tokens.key} is missing ${role}`).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it.each(TOKENISED)('$key keeps brand in step with TEMPLATE_ORIGINAL_BRAND_COLORS', (tokens) => {
    // The legacy map still drives `useStorefrontTemplateBrandColor`, so a
    // manifest that disagrees with it would render two different brand colours
    // depending on which one a component happened to read.
    const legacy = TEMPLATE_ORIGINAL_BRAND_COLORS[tokens.key as keyof typeof TEMPLATE_ORIGINAL_BRAND_COLORS]
    expect(tokens.color.brand.toLowerCase()).toBe(legacy.toLowerCase())
  })

  it.each(TOKENISED)('$key emits a channel form for every colour', (tokens) => {
    const vars = tokensToCssVars(tokens)

    for (const role of THEME_COLOR_ROLES) {
      const name = role.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
      expect(vars[`--${tokens.prefix}-${name}`]).toBeDefined()
      expect(vars[`--${tokens.prefix}-${name}-rgb`]).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/)
    }

    for (const step of Object.keys(tokens.ramp || {})) {
      expect(vars[`--${tokens.prefix}-ramp-${step}`]).toBeDefined()
      expect(vars[`--${tokens.prefix}-ramp-${step}-rgb`]).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/)
    }
  })

  it.each(TOKENISED)('$key lists only neutral families on its ramp', (tokens) => {
    // A chromatic family folded onto the ramp would let a tenant repaint
    // `danger` or `success` by moving the greys, which EDITABLE_COLOR_ROLES
    // exists to prevent.
    const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']

    for (const family of tokens.rampFamilies || []) {
      expect(neutrals, `${tokens.key} folds "${family}" onto its ramp`).toContain(family)
    }
  })
})

describe('tailwind config stays in step with the manifests', () => {
  // Reading the config as text avoids pulling Tailwind's plugin chain into the
  // unit run; all we need is the declared role list.
  const config = readFileSync(join(process.cwd(), 'tailwind.config.ts'), 'utf8')

  it.each(TOKENISED)('$key declares its extras in TOKENISED_TEMPLATES', (tokens) => {
    const entry = new RegExp(`\\b${tokens.prefix}:\\s*\\[([^\\]]*)\\]`).exec(config)
    expect(entry, `tailwind.config.ts has no scale for prefix "${tokens.prefix}"`).not.toBeNull()

    // Ramp steps come in through the shared RAMP_STEPS spread, so only the
    // literals in the entry are the theme's own extras.
    const declared = [...entry![1].matchAll(/'([^']+)'/g)]
      .map((match) => match[1])
      .filter((name) => !name.startsWith('ramp-'))
    const expected = Object.keys(tokens.extra || {})

    expect([...declared].sort()).toEqual([...expected].sort())
  })

  it.each(TOKENISED)('$key spreads RAMP_STEPS when it has a ramp', (tokens) => {
    if (!tokens.ramp) return

    const entry = new RegExp(`\\b${tokens.prefix}:\\s*\\[([^\\]]*)\\]`).exec(config)
    expect(entry![1], `${tokens.key} has a ramp but no ramp steps in its scale`).toContain('RAMP_STEPS')
  })
})

describe('applyColorOverrides', () => {
  it('returns the author’s palette untouched when nothing is overridden', () => {
    expect(applyColorOverrides(nourTokens, null).color).toEqual(nourTokens.color)
    expect(applyColorOverrides(nourTokens, {}).color).toEqual(nourTokens.color)
  })

  it('repaints an overridden role and everything derived from it', () => {
    const result = applyColorOverrides(nourTokens, { brand: '#2F6F62' })

    expect(result.color.brand).toBe('#2F6F62')
    expect(result.color.brandDeep).not.toBe(nourTokens.color.brandDeep)
    expect(result.color.brandSoft).not.toBe(nourTokens.color.brandSoft)
  })

  it('leaves roles derived from an untouched source alone', () => {
    const result = applyColorOverrides(nourTokens, { brand: '#2F6F62' })

    // Accent was not overridden, so its ladder must not move.
    expect(result.color.accent).toBe(nourTokens.color.accent)
    expect(result.color.accentDeep).toBe(nourTokens.color.accentDeep)
    expect(result.color.accentSoft).toBe(nourTokens.color.accentSoft)
  })

  it('never lets a tenant repaint a role that carries meaning', () => {
    // `sale`, `warning`, `danger` and `success` are not editable, so even a
    // payload naming them must not move them.
    const result = applyColorOverrides(nourTokens, { sale: '#000000' } as never)

    expect(result.color.sale).toBe(nourTokens.color.sale)
  })

  it('ignores malformed hexes rather than rendering an unstyled store', () => {
    const result = applyColorOverrides(nourTokens, { brand: 'rebeccapurple' })
    expect(result.color.brand).toBe(nourTokens.color.brand)
  })

  it('only derives from editable roles', () => {
    for (const rule of Object.values(DERIVED_COLOR_ROLES)) {
      expect(EDITABLE_COLOR_ROLES).toContain(rule!.from)
    }
  })
})

describe('colour helpers', () => {
  it('converts hex to the channel form Tailwind opacity modifiers need', () => {
    expect(hexToRgbChannels('#C9A24B')).toBe('201 162 75')
    expect(hexToRgbChannels('#fff')).toBe('255 255 255')
    expect(hexToRgbChannels('not-a-colour')).toBe('0 0 0')
  })

  it('shifts toward white and black without leaving the byte range', () => {
    expect(shiftHex('#808080', 1)).toBe('#ffffff')
    expect(shiftHex('#808080', -1)).toBe('#000000')
    expect(shiftHex('#808080', 0)).toBe('#808080')
  })

  it('builds scales that resolve through the channel vars', () => {
    const scale = buildTailwindColorScale('nr', ['bg', 'inkSoft'])

    expect(scale.bg).toBe('rgb(var(--nr-bg-rgb) / <alpha-value>)')
    expect(scale['ink-soft']).toBe('rgb(var(--nr-ink-soft-rgb) / <alpha-value>)')
  })
})
