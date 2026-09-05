import { computed } from 'vue'
import { formatPriceAmount } from '~/shared/pricing/money-format'

/**
 * Formatting shared by the billing screen and its parts.
 *
 * Subscription figures are whole dinars, so they are rendered without the two
 * decimal places `formatPriceAmount` defaults to — "2 990 DA" rather than
 * "2 990,00 DA".
 */
export const useBillingFormat = () => {
    const { t, locale } = useI18n({ useScope: 'global' })

    const numberLocale = computed(() => (locale.value === 'ar' ? 'ar-DZ' : 'fr-DZ'))

    /** Whole-dinar amount, no currency suffix. */
    const money = (amount: number | null | undefined): string => {
        if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—'
        return formatPriceAmount(amount, {
            locale: numberLocale.value,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        })
    }

    const count = (value: number | null | undefined): string => {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
        return new Intl.NumberFormat(numberLocale.value).format(value)
    }

    /** A plan allowance, where a negative limit means "no ceiling". */
    const limit = (value: number | null | undefined): string => {
        if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
        if (value < 0) return t('admin.pages.billing.usage.unlimited')
        return count(value)
    }

    const date = (value: string | Date | null | undefined): string => {
        if (!value) return '—'
        const parsed = value instanceof Date ? value : new Date(value)
        if (Number.isNaN(parsed.getTime())) return '—'
        return parsed.toLocaleDateString(locale.value, { year: 'numeric', month: 'long', day: 'numeric' })
    }

    const dateTime = (value: string | Date | null | undefined): string => {
        if (!value) return '—'
        const parsed = value instanceof Date ? value : new Date(value)
        if (Number.isNaN(parsed.getTime())) return '—'
        return parsed.toLocaleString(locale.value, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    /** "1 Sept – 1 Oct", for a usage window label. */
    const dateRange = (from: string | Date | null | undefined, to: string | Date | null | undefined): string => {
        if (!from || !to) return ''
        const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
        const start = new Date(from).toLocaleDateString(locale.value, opts)
        const end = new Date(to).toLocaleDateString(locale.value, opts)
        return `${start} – ${end}`
    }

    return { money, count, limit, date, dateTime, dateRange, numberLocale }
}
