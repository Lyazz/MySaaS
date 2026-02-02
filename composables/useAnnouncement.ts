export const useAnnouncement = () => {
    const route = useRoute()
    const storeSettings = useState<any>('storeSettings')

    // Default values
    const defaultText = "Welcome to our store! Check out our latest offers."

    // Visibility state
    const isVisible = useState<boolean>('announcement-visible', () => true)

    // Computed text: Query Param > Store Settings > Default
    const text = computed(() => {
        if (route.query.announcement_text) {
            return route.query.announcement_text as string
        }

        // Use store setting if available (even if empty string, though we fallback to default if falsy to be safe? 
        // User said "generic default when no specific text". Empty string is specific text?)
        // Let's stick to: if it has value, use it. If not, default.
        if (storeSettings.value?.announcementText) {
            return storeSettings.value.announcementText
        }

        return defaultText
    })

    // Computed scrolling: Query Param > Store Settings > Default (false)
    const isScrolling = computed(() => {
        // Query param override
        const q = route.query.announcement_scrolling
        if (q !== undefined && q !== null) {
            return String(q) === 'true' || q === '1'
        }

        // Store setting
        return storeSettings.value?.announcementScrolling === true
    })

    const dismiss = () => {
        isVisible.value = false
    }

    const show = () => {
        isVisible.value = true
    }

    return {
        text,
        isScrolling,
        isVisible,
        dismiss,
        show
    }
}
