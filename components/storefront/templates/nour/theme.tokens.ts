import type { ThemeTokens } from '~/shared/storefront/theme/tokens'

/**
 * Nour Élégance — modest fashion: abayas, hijabs, kaftans.
 *
 * Every value here was read out of the template's own components, not chosen
 * fresh, so switching the theme over to tokens changes no rendered pixel. The
 * scan that produced it: `node scripts/theme/scan-palette.mjs nour`.
 *
 * The thing worth knowing about this palette: it has no neutral hairline. All
 * 123 of the template's borders are the gold at eight different alphas, from
 * /15 to /50. That is the theme's actual signature and it survives tokenising
 * intact as `border-nr-accent/35` — the alpha ladder is the design, so the
 * creator exposes the gold as one editable colour rather than eight.
 */
export const nourTokens: ThemeTokens = {
  key: 'nour',
  name: 'Nour Élégance',
  prefix: 'nr',
  fit: 'Abayas, hijabs, kaftans, modest fashion',
  scheme: 'light',

  color: {
    // Grounds. Warm sand rising to an almost-white card stock.
    bg: '#FAF3EA',
    bgAlt: '#F3E7D8',
    surface: '#FFFDF9',
    surfaceAlt: '#F1E2CE',

    // Type. Three weights of a warm near-black, never pure grey.
    ink: '#2E1E20',
    inkSoft: '#6B5850',
    inkFaint: '#9C8B82',

    // Rules. Used where the gold would be too loud; see the note above.
    border: '#E9DCCB',
    borderStrong: '#C4B4A8',

    // The house colour. Comes from TEMPLATE_ORIGINAL_BRAND_COLORS and is the
    // one role a tenant overrides by default.
    brand: '#7A3B46',
    brandDeep: '#5A2A33',
    brandSoft: '#EFE0E2',

    // The gold. Carries the borders, the seals, and the price emphasis.
    accent: '#C9A24B',
    accentDeep: '#9A7728',
    accentSoft: '#E4C58F',

    // Fixed meanings, matching the Tailwind scale the template already uses
    // for these states (rose-700, amber-700, red-700, emerald-700).
    sale: '#BE123C',
    warning: '#B45309',
    danger: '#B91C1C',
    success: '#047857'
  },

  // Warm tints the roles do not cover. Not editable — they exist to keep the
  // codemod lossless rather than to be reasoned about.
  extra: {
    inkCocoa: '#5C4A44',
    sandWash: '#EEDFC7',
    sandLight: '#F6EAD6'
  },

  type: {
    display: {
      family: 'Marcellus',
      stack: "'Marcellus', Georgia, serif",
      weights: [400]
    },
    body: {
      family: 'Jost',
      stack: "'Jost', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      weights: [300, 400, 500, 600, 700]
    }
  },

  geometry: {
    radiusButton: 999,
    radiusCard: 16,
    radiusInput: 12,
    radiusPill: 999,
    density: 1
  },

  motion: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },

  shadow: {
    xs: '0 1px 2px rgba(46, 30, 32, 0.04)',
    sm: '0 2px 6px rgba(46, 30, 32, 0.05), 0 8px 20px -14px rgba(46, 30, 32, 0.20)',
    md: '0 3px 10px rgba(46, 30, 32, 0.05), 0 22px 48px -26px rgba(46, 30, 32, 0.26)',
    lg: '0 6px 16px rgba(46, 30, 32, 0.06), 0 40px 84px -36px rgba(46, 30, 32, 0.32)'
  }
}

export default nourTokens
