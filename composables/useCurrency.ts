export const useCurrency = () => {
    const storeSettings = useState<any>('storeSettings')

    const currencyCode = computed(() => storeSettings.value?.currencyCode || 'DZD')
    const locale = computed(() => storeSettings.value?.currencyCountry ? `fr-${storeSettings.value.currencyCountry}` : 'fr-DZ')

    const format = (amount: number | string | null | undefined): string => {
        if (amount === null || amount === undefined) return ''
        const val = typeof amount === 'string' ? parseFloat(amount) : amount
        if (isNaN(val)) return ''

        try {
            return new Intl.NumberFormat(locale.value, {
                style: 'currency',
                currency: currencyCode.value,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(val)
        } catch (e) {
            // Fallback if currency code is invalid
            return `${val.toFixed(2)} ${currencyCode.value}`
        }
    }

    return {
        currencyCode,
        format
    }
}
