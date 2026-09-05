export const useClearanceBanner = () => {
    const storeSettings = useState<any>('storeSettings')

    // Dismissal is stored in a session cookie so it's readable during SSR
    // (avoids a flash of the banner on refresh) and persists across reloads
    // until the browser session ends.
    const dismissed = useCookie<boolean>('clearance-banner-dismissed', { default: () => false })
    const isVisible = computed(() => !dismissed.value)

    const isEnabled = computed(() =>
        Boolean(storeSettings.value?.clearanceEnabled) && Boolean(storeSettings.value?.clearanceBannerEnabled)
    )

    // null means "no custom text configured" — the component falls back to an i18n default.
    const text = computed<string | null>(() => storeSettings.value?.clearanceBannerText || null)

    const dismiss = () => {
        dismissed.value = true
    }

    const show = () => {
        dismissed.value = false
    }

    return {
        isEnabled,
        text,
        isVisible,
        dismiss,
        show
    }
}
