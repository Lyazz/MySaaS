export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  if (!authStore.ensureSessionActive()) return
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
      authStore.setAuth(token, res.user, res.tenant, res.staffRole ?? null, res.staffPermissions ?? null)
    }
  } catch {
    authStore.logout({ redirect: false, revoke: false })
  }
})
