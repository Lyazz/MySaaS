import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return
  if (!to.path.startsWith('/admin')) return
  if (to.path === '/admin/onboarding') return

  const authStore = useAuthStore()
  if (!authStore.isAuthenticated || !authStore.token) return
  if (authStore.user?.role === 'staff') return

  const cached = useState<any>('storeSettings')

  try {
    if (!cached.value) {
      cached.value = await $fetch('/api/admin/store-settings', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
    }

    if (cached.value && cached.value.isCompleted === false) {
      return navigateTo('/admin/onboarding')
    }
  } catch {
    // Let the normal page render; auth middleware / page logic will handle errors.
  }
})
