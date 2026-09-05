export const useAnnouncement = () => {
    const route = useRoute()
    const storeSettings = useState<any>('storeSettings')

    // Default values
    const defaultText = "Welcome to our store! Check out our latest offers."

    // Dismissal is stored in a session cookie so it's readable during SSR
    // (avoids a flash of the banner on refresh) and persists across reloads
    // until the browser session ends.
    const dismissed = useCookie<boolean>('announcement-dismissed', { default: () => false })
    const isVisible = computed(() => !dismissed.value)

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
        dismissed.value = true
    }

    const show = () => {
        dismissed.value = false
    }

    return {
        text,
        isScrolling,
        isVisible,
        dismiss,
        show
    }
}
