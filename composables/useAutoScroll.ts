export function useAutoScroll(productsSource: Ref<any[]>, options = { speed: 1.5, interval: 20 }) {
    const scrollContainer = ref<HTMLElement | null>(null)
    let scrollInterval: any = null
    const isHovering = ref(false)

    // Duplicate products for infinite scroll
    const infiniteList = computed(() => {
        const products = productsSource.value || []
        if (products.length === 0) return []
        // Duplicate products 3 times for seamless infinite scroll
        return [...products, ...products, ...products]
    })

    const startAutoScroll = () => {
        // Stop any existing interval
        stopAutoScroll()

        if (!scrollContainer.value) {
            return
        }

        scrollInterval = setInterval(() => {
            if (!scrollContainer.value) return

            const container = scrollContainer.value
            const currentSpeed = isHovering.value ? 0.3 : options.speed // Slow down to ~20-30% on hover

            container.scrollLeft += currentSpeed

            // Loop back when we've scrolled through one set of products
            const oneSetWidth = container.scrollWidth / 3
            if (container.scrollLeft >= oneSetWidth) {
                // Reset without jumping visually
                container.scrollLeft = container.scrollLeft - oneSetWidth
            }
        }, options.interval)
    }

    const stopAutoScroll = () => {
        if (scrollInterval) {
            clearInterval(scrollInterval)
            scrollInterval = null
        }
    }

    // Watch for when the container becomes available and data is ready
    watch([scrollContainer, infiniteList], ([newContainer, newList]) => {
        if (newContainer && newList.length > 0) {
            // Use nextTick equivalent delay to ensure rendering
            setTimeout(() => {
                startAutoScroll()
            }, 500)
        }
    })

    onMounted(() => {
        // Try to start if already ready
        if (scrollContainer.value && infiniteList.value.length > 0) {
            startAutoScroll()
        }
    })

    onUnmounted(() => {
        stopAutoScroll()
    })

    return {
        scrollContainer,
        infiniteList,
        isHovering,
        startAutoScroll,
        stopAutoScroll
    }
}
