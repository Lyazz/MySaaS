/**
 * Visual identity for each delivery carrier, shared by the admin and the storefront
 * so a carrier looks the same wherever a shopper or an operator meets it.
 *
 * `logo` points at a normalized square mark in `public/images/carriers/` — all
 * carrier marks are 256×256 PNGs produced by `scripts/normalize-carrier-logos.mjs`
 * so they sit on the same grid at every size. `tile` is the plate the mark sits
 * on: it matches the logo's own background so the mark reads at 16px as well as
 * at 36px. Carriers without artwork fall back to `icon`.
 */
export type CarrierBrand = {
  logo?: string
  tile?: string
  icon: string
}

export const CARRIER_BRANDS: Record<string, CarrierBrand> = {
  MAYSTRO: {
    logo: '/images/carriers/maystro.png',
    tile: '#ffffff',
    icon: 'lucide:truck'
  },
  YALIDINE: {
    logo: '/images/carriers/yalidine.png',
    tile: '#d72e31',
    icon: 'lucide:package'
  },
  ECOTRACK: { icon: 'lucide:send' },
  ZR_EXPRESS: { icon: 'lucide:zap' },
  SELF: { icon: 'lucide:bike' }
}

export function carrierBrand(provider?: string | null): CarrierBrand | null {
  if (!provider) return null
  return CARRIER_BRANDS[provider] ?? null
}
