export default defineNuxtRouteMiddleware((to) => {
    const tenant = useState('tenant')

    if (process.server && !tenant.value) {
        const event = useRequestEvent()
        if (event?.context?.tenant) {
            tenant.value = event.context.tenant
            const storeSettings = useState<any>('storeSettings')
            if (!storeSettings.value && event.context.storeSettings) {
                storeSettings.value = event.context.storeSettings
            }
        }
    }

    // Respect layout disabling (layout: false)
    if (to.meta.layout === false) return

    // If layout is explicitly set (and not default), respect it.
    // This allows pages like /admin to use 'admin' layout.
    if (to.meta.layout && to.meta.layout !== 'default') return

    if (tenant.value) {
        // If in tenant context, use store layout
        to.meta.layout = 'store'
    } else {
        // If in SaaS context (localhost), use marketing layout for public pages
        to.meta.layout = 'marketing'
    }
})
