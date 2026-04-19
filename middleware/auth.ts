import { useAuthStore } from '~/stores/auth'
import { toSaasHost, useRequestOrigin } from '~/composables/host'
import { usePlatformBaseDomain } from '~/composables/platformBaseDomain'

export default defineNuxtRouteMiddleware((to, from) => {
    const authStore = useAuthStore()
    const tenant = useState<any>('tenant')
    const hasActiveSession = authStore.ensureSessionActive()

    if (!hasActiveSession && to.path !== '/login') {
        // Tenants must log in from the SaaS landing host (root domain).
        if (tenant.value) {
            const { protocol, host } = useRequestOrigin()
            const platformBaseDomain = usePlatformBaseDomain()
            const saasHost = toSaasHost(host, { platformBaseDomain })
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

    // Prevent Super Admin from accessing Tenant Admin area
    if (hasActiveSession && to.path.startsWith('/admin') && authStore.user?.isSuperAdmin) {
        return navigateTo('/super-admin')
    }
})
