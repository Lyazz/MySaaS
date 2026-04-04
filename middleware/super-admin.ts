import { useAuthStore } from '~/stores/auth'
import { toSaasHost, useRequestOrigin } from '~/composables/host'
import { usePlatformBaseDomain } from '~/composables/platformBaseDomain'

export default defineNuxtRouteMiddleware(async (to, from) => {
    const authStore = useAuthStore()
    const tenant = useState<any>('tenant')
    if (tenant.value) {
        const { protocol, host } = useRequestOrigin()
        const platformBaseDomain = usePlatformBaseDomain()
        const saasHost = toSaasHost(host, { platformBaseDomain })
        if (saasHost) {
            return navigateTo(`${protocol}://${saasHost}${to.fullPath}`, { external: true })
        }
    }

    // Check if user is authenticated
    if (!authStore.isAuthenticated) {
        return navigateTo('/super-admin/login')
    }

    // SSR-safe hydration: if we have a token but no user in memory, resolve /api/me.
    if (!authStore.user && authStore.token) {
        try {
            const url = useTenantApiUrl('/api/me')
            const res = await $fetch<any>(url, {
                headers: {
                    Authorization: `Bearer ${authStore.token}`,
                    ...(useTenantApiHeaders() || {})
                }
            })
            if (res?.success && res.user) {
                authStore.setAuth(authStore.token, res.user, res.tenant)
            }
        } catch {
            return navigateTo('/super-admin/login')
        }
    }

    // Check if user is super admin
    if (!authStore.user?.isSuperAdmin) {
        // Regular user trying to access super admin area - redirect with error
        return navigateTo('/', {
            replace: true
        })
    }
})
