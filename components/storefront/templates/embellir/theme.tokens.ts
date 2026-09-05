import type { ThemeTokens } from '~/shared/storefront/theme/tokens'

/**
 * Embellir — skincare, cosmetics, bath and body.
 *
 * The hammam rather than the spa: glazed zellige green for the chrome, warm
 * polished plaster for the page, one bright note of orange blossom, and hard
 * 2px corners throughout where the other wellness themes go soft.
 *
 * This template already named most of its palette in its `--emb-*` block, so
 * the role assignment below is that vocabulary rather than a reinterpretation:
 * tadelakt is the ground, marble the raised stock, clay the hairline, neroli
 * the accent. Scan: `node scripts/theme/scan-palette.mjs embellir`.
 *
 * All fifteen colours the components use land on a shared role, so this
 * manifest needs no `extra` block.
 */
export const embellirTokens: ThemeTokens = {
  key: 'embellir',
  name: 'Embellir',
  prefix: 'emb',
  fit: 'Skincare, cosmetics, bath and body, wellness',
  scheme: 'light',

  color: {
    // Tadelakt rising to marble. Warm plaster, never grey.
    bg: '#F2ECE1',
    bgAlt: '#E4DACB',
    surface: '#FDFAF4',
    surfaceAlt: '#FBF0EC',

    ink: '#16211E',
    inkSoft: '#5A6763',
    inkFaint: '#8E9793',

    // Clay. The hairline the tiling is set in.
    border: '#CBBDAB',
    borderStrong: '#B3AA9E',

    // Glaze — the zellige green that carries the chrome.
    brand: '#0E3F3A',
    brandDeep: '#062622',
    brandSoft: '#DDE4E3',

    // Neroli. `accentDeep` is the weight the template uses for accent-coloured
    // type, where the full neroli would not hold contrast on plaster.
    accent: '#DFA254',
    accentDeep: '#8A5A18',
    accentSoft: '#EFD1AA',

    sale: '#B4593F',
    warning: '#A9761C',
    danger: '#8E3A22',
    success: '#2F6F4F'
  },

  type: {
    display: {
      family: 'Bodoni Moda',
      stack: "'Bodoni Moda', 'Bodoni 72', Didot, ui-serif, Georgia, serif",
      weights: [400, 500, 600]
    },
    body: {
      family: 'Karla',
      stack: "'Karla', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      weights: [300, 400, 500, 600, 700]
    }
  },

  // Flat and tiled. The 2px corner is the template's signature and the reason
  // it reads as a hammam rather than a pharmacy.
  geometry: {
    radiusButton: 2,
    radiusCard: 2,
    radiusInput: 2,
    radiusPill: 2,
    density: 1
  },

  motion: {
    duration: 240,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },

  shadow: {
    xs: '0 1px 2px rgba(22, 33, 30, 0.04)',
    sm: '0 2px 4px rgba(22, 33, 30, 0.05), 0 8px 18px -14px rgba(6, 38, 34, 0.22)',
    md: '0 3px 8px rgba(22, 33, 30, 0.05), 0 20px 44px -24px rgba(6, 38, 34, 0.28)',
    lg: '0 6px 14px rgba(22, 33, 30, 0.06), 0 38px 78px -34px rgba(6, 38, 34, 0.34)'
  }
}

export default embellirTokens
