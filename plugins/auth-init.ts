export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) return
  if (authStore.user) return

  const token = authStore.token
  if (!token) return

  try {
    const url = useTenantApiUrl('/api/me')
    const res = await $fetch<any>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(useTenantApiHeaders() || {})
      }
    })

    if (res?.success && res.user) {
      authStore.setAuth(token, res.user, res.tenant)
    }
  } catch {
    // Ignore: token might be expired/invalid; route middleware will handle redirect.
  }
})

