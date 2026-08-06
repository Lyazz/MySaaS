export const useClearanceBanner = () => {
    const storeSettings = useState<any>('storeSettings')

    const isVisible = useState<boolean>('clearance-banner-visible', () => true)

    const isEnabled = computed(() =>
        Boolean(storeSettings.value?.clearanceEnabled) && Boolean(storeSettings.value?.clearanceBannerEnabled)
    )

    // null means "no custom text configured" — the component falls back to an i18n default.
    const text = computed<string | null>(() => storeSettings.value?.clearanceBannerText || null)

    const dismiss = () => {
        isVisible.value = false
    }

    const show = () => {
        isVisible.value = true
    }

    return {
        isEnabled,
        text,
        isVisible,
        dismiss,
        show
    }
}
