import { formatPriceAmount, parsePriceInput } from '~/shared/pricing/money-format'

export const useCurrency = () => {
    const storeSettings = useState<any>('storeSettings')

    const currencyCode = computed(() => storeSettings.value?.currencyCode || 'DZD')
    const locale = computed(() => storeSettings.value?.currencyCountry ? `fr-${storeSettings.value.currencyCountry}` : 'fr-DZ')

    const formatAmount = (amount: number | string | null | undefined): string => {
        return formatPriceAmount(amount, { locale: locale.value })
    }

    const format = (amount: number | string | null | undefined): string => {
        const formattedAmount = formatAmount(amount)
        if (!formattedAmount) return ''
        return `${formattedAmount} ${currencyCode.value}`
    }

    return {
        currencyCode,
        format,
        formatAmount,
        parse: parsePriceInput
    }
}
