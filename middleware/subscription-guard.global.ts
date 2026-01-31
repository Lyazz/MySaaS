import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
    if (process.server) return

    if (!to.path.startsWith('/admin')) return
    if (to.path.startsWith('/admin/billing')) return

    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) return
    if (authStore.user?.isSuperAdmin) return

    const token = (authStore as any).token?.value ?? (authStore as any).token
    if (!token || typeof token !== 'string') return

    try {
        const snapshot = await $fetch<any>('/api/admin/billing/subscription', {
            headers: { Authorization: `Bearer ${token}` }
        })

        const end = snapshot?.subscription?.currentPeriodEnd
        const status = snapshot?.subscription?.status
        if (status === 'PAST_DUE') {
            return navigateTo('/admin/billing')
        }
        if (typeof end === 'string') {
            const endDate = new Date(end)
            if (!Number.isNaN(endDate.getTime()) && Date.now() >= endDate.getTime()) {
                return navigateTo('/admin/billing')
            }
        }
    } catch {
        // If billing endpoint fails, don't block navigation.
    }
})

