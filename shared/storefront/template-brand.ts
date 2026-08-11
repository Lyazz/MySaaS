export const TEMPLATE_ORIGINAL_BRAND_COLORS = {
  classic: '#0F172A',
  modern: '#0D9488',
  street: '#FACC15',
  cozy: '#A4C3B2',
  cyber: '#F43F5E',
  stationnery: '#334155',
  food: '#EA580C',
  wellness: '#84CC16',
  playful: '#9333EA',
  activewear: '#EAB308',
  chrono: '#A67C52',
  maison: '#0B4A25',
  arena: '#00B8FC',
  nour: '#7A3B46',
  minimal: '#65A30D',
  interior: '#65A30D'
} as const

export type StorefrontTemplateColorKey = keyof typeof TEMPLATE_ORIGINAL_BRAND_COLORS

type StorefrontBrandColorSettings = {
  primaryColor?: string | null
  useBrandColor?: boolean | null
}

export const normalizeHexColor = (value?: string | null): string | null => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  const short = /^#([0-9a-fA-F]{3})$/.exec(trimmed)
  if (short) {
    return `#${short[1].split('').map((char) => char + char).join('')}`.toUpperCase()
  }

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase()
  }

  return null
}

export const hexToRgb = (value?: string | null, fallback = '#0D9488'): string => {
  const color = normalizeHexColor(value) ?? normalizeHexColor(fallback) ?? '#0D9488'
  const hex = color.slice(1)
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)

  if (!result) return '13 148 136'

  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
}

export const resolveStorefrontTemplateBrandColor = (
  templateKey: string,
  settings?: StorefrontBrandColorSettings | null
): string => {
  const originalColor =
    TEMPLATE_ORIGINAL_BRAND_COLORS[templateKey as StorefrontTemplateColorKey] ??
    TEMPLATE_ORIGINAL_BRAND_COLORS.modern
  const tenantColor = normalizeHexColor(settings?.primaryColor)

  if (settings?.useBrandColor === true && tenantColor) {
    return tenantColor
  }

  return originalColor
}
