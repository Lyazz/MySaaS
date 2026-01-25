import { useAuthStore } from '~/stores/auth'
import { toSaasHost, useRequestOrigin } from '~/composables/host'

export default defineNuxtRouteMiddleware((to, from) => {
    const authStore = useAuthStore()
    const tenant = useState<any>('tenant')

    if (!authStore.isAuthenticated && to.path !== '/login') {
        // Tenants must log in from the SaaS landing host (root domain).
        if (tenant.value) {
            const { protocol, host } = useRequestOrigin()
            const saasHost = toSaasHost(host)
            if (saasHost) {
                const next = encodeURIComponent(to.fullPath)
                const tenantSlug = encodeURIComponent(tenant.value.slug)
                return navigateTo(`${protocol}://${saasHost}/login?tenant=${tenantSlug}&next=${next}`, {
                    external: true
                })
            }
        }

        return navigateTo('/login')
    }
})
