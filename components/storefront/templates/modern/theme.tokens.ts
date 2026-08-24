import type { ThemeTokens } from '~/shared/storefront/theme/tokens'

/**
 * Modern — clean fashion, electronics, general retail. The reference template:
 * `TEMPLATE.md` tells every new theme to start from this one.
 *
 * The first template migrated that expresses its palette as default-Tailwind
 * classes rather than hexes, and it needed a mechanism the hex-led ones did
 * not. `modern` reaches for ten slate weights and eight gray weights — more
 * distinct neutrals than `ink` / `inkSoft` / `inkFaint` can hold — so the
 * greys live in `ramp` and the roles point into it.
 *
 * One deliberate collapse: slate and gray are used interchangeably here
 * (slate 400 times, gray 41), with no discernible rule about which appears
 * where. Both now resolve to the slate ramp. Maximum shift is ΔE 5.99 at the
 * 500 step, on 41 of 521 colour occurrences; the two families differ by two to
 * six values per channel and the mixing looks accidental rather than authored.
 *
 * Chromatic families are left on the stock palette on purpose — see
 * `rampFamilies`.
 */
export const modernTokens: ThemeTokens = {
  key: 'modern',
  name: 'Modern',
  prefix: 'mo',
  fit: 'Clean fashion, electronics, and general retail',
  scheme: 'light',

  // Tailwind slate, verbatim. Keeping the stock values is what makes the
  // migration a re-encoding rather than a redesign; the creator changes them
  // by regenerating the ramp, not by the author picking new greys now.
  ramp: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617'
  },

  rampFamilies: ['slate', 'gray'],

  color: {
    bg: '#F8FAFC',
    bgAlt: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceAlt: '#F8FAFC',

    ink: '#0F172A',
    inkSoft: '#475569',
    inkFaint: '#94A3B8',

    border: '#E2E8F0',
    borderStrong: '#CBD5E1',

    // Teal, from TEMPLATE_ORIGINAL_BRAND_COLORS.
    brand: '#0D9488',
    brandDeep: '#0B6D65',
    brandSoft: '#CCFBF1',

    accent: '#0F172A',
    accentDeep: '#020617',
    accentSoft: '#E2E8F0',

    // The shades the template already uses for these states.
    sale: '#E11D48',
    warning: '#B45309',
    danger: '#B91C1C',
    success: '#047857'
  },

  extra: {
    // The one non-neutral, non-semantic hue: an informational blue used for
    // notices. Not the brand, and not editable.
    info: '#2563EB',
    infoWash: '#EFF6FF',
    // A stray off-white with a green cast, used as a ground four times. Kept
    // at its exact value rather than rounded to ramp-50 so the migration stays
    // lossless; it is a candidate to fold in later.
    paper: '#F8FAF9'
  },

  type: {
    display: {
      family: 'Outfit',
      stack: "'Outfit', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      weights: [400, 500, 600, 700]
    },
    // Outfit, not DM Sans. The root sets Outfit as an inline style, which beats
    // the `font-sans` class sitting next to it, so Outfit is what anything
    // inheriting from the root actually renders in. DM Sans still reaches the
    // children that ask for `font-sans` explicitly.
    body: {
      family: 'Outfit',
      stack: "'Outfit', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      weights: [400, 500, 600, 700]
    },
    label: {
      family: 'DM Sans',
      stack: "'DM Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      weights: [400, 500, 600, 700]
    }
  },

  geometry: {
    radiusButton: 999,
    radiusCard: 12,
    radiusInput: 8,
    radiusPill: 999,
    density: 1
  },

  motion: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },

  shadow: {
    xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
    sm: '0 2px 6px rgba(15, 23, 42, 0.05), 0 8px 20px -14px rgba(15, 23, 42, 0.20)',
    md: '0 3px 10px rgba(15, 23, 42, 0.05), 0 22px 48px -26px rgba(15, 23, 42, 0.24)',
    lg: '0 6px 16px rgba(15, 23, 42, 0.06), 0 40px 84px -36px rgba(15, 23, 42, 0.30)'
  }
}

export default modernTokens
