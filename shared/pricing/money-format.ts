const NBSP_REGEX = /[\u00a0\u202f\s]/g

export interface FormatPriceOptions {
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

export const DEFAULT_PRICE_LOCALE = 'fr-DZ'
export const DEFAULT_PRICE_MIN_FRACTION_DIGITS = 2
export const DEFAULT_PRICE_MAX_FRACTION_DIGITS = 2

const normalizeNumericString = (value: string): string => {
  const compact = value.replace(NBSP_REGEX, '').replace(/[^\d,.-]/g, '')
  if (!compact) return ''

  const lastComma = compact.lastIndexOf(',')
  const lastDot = compact.lastIndexOf('.')
  const decimalPos = Math.max(lastComma, lastDot)

  if (decimalPos < 0) return compact.replace(/[.,]/g, '')

  const integerPart = compact.slice(0, decimalPos).replace(/[.,]/g, '')
  const decimalPart = compact.slice(decimalPos + 1).replace(/[.,]/g, '')
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart
}

export const parsePriceInput = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null

  const normalized = normalizeNumericString(value)
  if (!normalized || normalized === '-' || normalized === '.') return null

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export const formatPriceAmount = (
  value: unknown,
  options: FormatPriceOptions = {}
): string => {
  const parsed = parsePriceInput(value)
  if (parsed === null) return ''

  const locale = options.locale || DEFAULT_PRICE_LOCALE
  const minimumFractionDigits =
    options.minimumFractionDigits ?? DEFAULT_PRICE_MIN_FRACTION_DIGITS
  const maximumFractionDigits =
    options.maximumFractionDigits ?? DEFAULT_PRICE_MAX_FRACTION_DIGITS

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(parsed)
}

export const normalizePriceInput = (
  value: unknown,
  options: FormatPriceOptions = {}
): string => {
  return formatPriceAmount(value, options)
}
