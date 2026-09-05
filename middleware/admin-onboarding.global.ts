import { useAuthStore } from '~/stores/auth'

/**
 * Pulls a merchant into the setup wizard on their way into the admin -- but only
 * until they deliberately step out of it.
 *
 * This used to redirect on `isCompleted === false` alone, which made the entire
 * admin unreachable for anyone who got stuck on a step (no product photos to
 * hand, no delivery account yet). `onboardingExitedAt` records "Finish later",
 * and once it is set the wizard stops grabbing the wheel; the draft banner and
 * the getting-started checklist bring them back instead.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return
  if (!to.path.startsWith('/admin')) return
  if (to.path === '/admin/onboarding') return

  const authStore = useAuthStore()
  if (!authStore.ensureSessionActive() || !authStore.token) return
  if (authStore.user?.role === 'staff') return

  const cached = useState<any>('storeSettings')

  try {
    if (!cached.value) {
      cached.value = await $fetch('/api/admin/store-settings', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
    }

    const settings = cached.value
    if (settings && settings.isCompleted === false && !settings.onboardingExitedAt) {
      return navigateTo('/admin/onboarding')
    }
  } catch {
    // Let the normal page render; auth middleware / page logic will handle errors.
  }
})
