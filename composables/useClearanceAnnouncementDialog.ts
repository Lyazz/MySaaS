const DISMISS_STORAGE_KEY = 'clearance-dialog-dismissed'

export const useClearanceAnnouncementDialog = () => {
    const storeSettings = useState<any>('storeSettings')
    const isVisible = useState<boolean>('clearance-dialog-visible', () => false)
    const hasChecked = useState<boolean>('clearance-dialog-checked', () => false)

    const isEnabled = computed(() =>
        Boolean(storeSettings.value?.clearanceEnabled) && Boolean(storeSettings.value?.clearanceBannerEnabled)
    )

    const maybeShow = () => {
        if (!process.client) return
        if (hasChecked.value) return
        hasChecked.value = true

        if (!isEnabled.value) return
        if (sessionStorage.getItem(DISMISS_STORAGE_KEY) === '1') return

        isVisible.value = true
    }

    const dismiss = () => {
        isVisible.value = false
        if (process.client) sessionStorage.setItem(DISMISS_STORAGE_KEY, '1')
    }

    return {
        isEnabled,
        isVisible,
        maybeShow,
        dismiss
    }
}
