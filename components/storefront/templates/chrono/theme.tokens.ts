import type { ThemeTokens } from '~/shared/storefront/theme/tokens'

/**
 * Chrono Luxe — watches, jewellery, luxury accessories.
 *
 * The only dark template in the tokenised set so far, which is the interesting
 * part: the roles hold, but they invert. `ink` is a warm bone white because
 * that is what the type is set in, and `bg` is near-black. Anything in the
 * creator that reasons about contrast must read `scheme`, not guess from the
 * name of a role.
 *
 * Twenty-eight colours, of which eighteen carry a role and ten are one-off
 * panel and rule tints kept in `extra` so the codemod stays lossless.
 * Scan: `node scripts/theme/scan-palette.mjs chrono`.
 */
export const chronoTokens: ThemeTokens = {
  key: 'chrono',
  name: 'Chrono Luxe',
  prefix: 'ch',
  fit: 'Watches, jewelry, luxury accessories',
  scheme: 'dark',

  color: {
    // Case-back blacks, faintly blue.
    bg: '#0E1117',
    bgAlt: '#0B0E16',
    surface: '#131720',
    surfaceAlt: '#1A1F2E',

    // Dial print: bone white down to a warm grey.
    ink: '#E8E0D5',
    inkSoft: '#D4C5A9',
    inkFaint: '#7A7060',

    border: '#3A3530',
    borderStrong: '#8A8070',

    // Bronze. The house metal, and by far the most-used colour in the
    // template — 244 of its 499 colour occurrences.
    brand: '#A67C52',
    brandDeep: '#7A5A3A',
    brandSoft: '#C2B89A',

    // Gold, for the moments bronze is not enough.
    accent: '#D4B85C',
    accentDeep: '#D9A050',
    accentSoft: '#FCD34D',

    sale: '#C1440E',
    warning: '#D97070',
    danger: '#FCA5A5',
    success: '#70A080'
  },

  // Tailwind gray, verbatim. Chrono reaches for the stock neutrals for its
  // secondary type — gray 61 times, slate 28 — on top of its own bronze-warm
  // palette. Gray dominates, so both fold onto it; the two families differ by
  // at most ΔE 6 and the mixing reads as accidental.
  ramp: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712'
  },

  rampFamilies: ['gray', 'slate'],

  // Panel and rule tints with no role. On a dark template these are the
  // difference between a raised surface and a recessed one, so there are more
  // of them than a light theme needs.
  extra: {
    ruleMid: '#5A5450',
    ruleWarm: '#4A4540',
    ruleDeep: '#2A2520',
    panelRaised: '#1F2533',
    panelDeep: '#111620',
    panelCool: '#2A3040',
    voidInk: '#080B12',
    slateMuted: '#6B7280',
    saleDeep: '#7A1F0F',
    dangerDeep: '#7A4040'
  },

  type: {
    display: {
      family: 'Cormorant Garamond',
      stack: "'Cormorant Garamond', 'Playfair Display', ui-serif, Georgia, Cambria, serif",
      weights: [300, 400, 500, 600]
    },
    body: {
      family: 'Cormorant Garamond',
      stack: "'Cormorant Garamond', 'Playfair Display', ui-serif, Georgia, Cambria, serif",
      weights: [300, 400, 500, 600]
    }
  },

  geometry: {
    radiusButton: 2,
    radiusCard: 4,
    radiusInput: 2,
    radiusPill: 999,
    density: 1
  },

  motion: {
    duration: 400,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
  },

  // Cast in the case black rather than neutral black, so a raised panel does
  // not read as floating over grey.
  shadow: {
    xs: '0 1px 2px rgba(8, 11, 18, 0.40)',
    sm: '0 2px 6px rgba(8, 11, 18, 0.45), 0 8px 20px -14px rgba(8, 11, 18, 0.60)',
    md: '0 3px 10px rgba(8, 11, 18, 0.50), 0 22px 48px -26px rgba(8, 11, 18, 0.70)',
    lg: '0 6px 16px rgba(8, 11, 18, 0.55), 0 40px 84px -36px rgba(8, 11, 18, 0.80)'
  }
}

export default chronoTokens
