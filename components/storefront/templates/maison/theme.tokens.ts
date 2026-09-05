import type { ThemeTokens } from '~/shared/storefront/theme/tokens'

/**
 * Pistachio — premium food, nuts, refined retail.
 *
 * The template that was already doing this. Its components hold no hex and no
 * Tailwind palette class at all: 753 references to 46 `--at-*` custom
 * properties, every one of them declared in one block. So there is no codemod
 * for maison — the manifest replaces that block, and an alias list in the
 * provider keeps the house names (`--at-green`, `--at-text`) pointing at the
 * roles the rest of the system speaks.
 *
 * It was also already tenant-repaintable: the old provider bound `--at-green`,
 * `--at-cream` and `--at-success` to the tenant's brand inline, and the green
 * ramp is mixed from `--at-green` with `color-mix`, so the whole ramp followed.
 * `applyColorOverrides` now does that job, and does it for `accent` too.
 */
export const maisonTokens: ThemeTokens = {
  key: 'maison',
  name: 'Pistachio',
  prefix: 'at',
  fit: 'Premium food, nuts, refined retail',
  scheme: 'light',

  color: {
    // Warm paper stock, the colour of shelled pistachio skin.
    bg: '#FAF2E3',
    bgAlt: '#F3E7CF',
    surface: '#FFFBF0',
    surfaceAlt: '#F7E7C6',

    ink: '#1C2318',
    inkSoft: '#3A462F',
    inkFaint: '#9C8659',

    border: '#E7CE9C',
    borderStrong: '#C8A369',

    // The pistachio green. Matches TEMPLATE_ORIGINAL_BRAND_COLORS.
    brand: '#0B4A25',
    brandDeep: '#052A16',
    brandSoft: '#4E8858',

    // Gold leaf.
    accent: '#B38335',
    accentDeep: '#8B6322',
    accentSoft: '#E7C888',

    // `skin` in the old vocabulary — the rose of a pistachio's inner husk,
    // reserved for markdowns.
    sale: '#9C4C5B',
    warning: '#A4732A',
    danger: '#A63F45',
    // The old block set success to the brand green exactly, which left the two
    // indistinguishable. This is the next step down the same ramp.
    success: '#1D6136'
  },

  // Only the tints the stylesheet does not compute for itself. `leaf`, `sub`
  // and the green ramp are all `color-mix` results derived from the brand, so
  // hardcoding them here would be dead weight that silently disagrees with
  // what renders once a tenant repaints.
  extra: {
    surface3: '#EEDCB3',
    gold500: '#CB9E4E',
    muted: '#775F3E',
    skinSoft: '#C88E96'
  },

  type: {
    display: {
      family: 'Fraunces',
      stack: "'Fraunces', 'Noto Sans Arabic', Georgia, serif",
      weights: [400, 500, 600, 700]
    },
    // Noto Sans Arabic leads the body stack because this template is used for
    // Arabic-first storefronts; the Latin fallbacks follow it, not the reverse.
    body: {
      family: 'Noto Sans Arabic',
      stack: "'Noto Sans Arabic', ui-sans-serif, system-ui, sans-serif",
      weights: [300, 400, 500, 600]
    }
  },

  geometry: {
    radiusButton: 999,
    radiusCard: 18,
    radiusInput: 10,
    radiusPill: 999,
    density: 1
  },

  motion: {
    duration: 320,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
  },

  // Cast in the warm brown of the paper rather than black.
  shadow: {
    xs: '0 1px 2px rgba(58,40,14,0.05)',
    sm: '0 2px 4px rgba(58,40,14,0.05), 0 8px 20px -12px rgba(58,40,14,0.18)',
    md: '0 3px 8px rgba(58,40,14,0.05), 0 22px 48px -22px rgba(58,40,14,0.26)',
    lg: '0 6px 14px rgba(58,40,14,0.06), 0 40px 84px -32px rgba(58,40,14,0.34)'
  }
}

export default maisonTokens
