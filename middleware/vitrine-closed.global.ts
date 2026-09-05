/**
 * When REGISTRATIONS_OPEN is "false", the whole public marketing site (the
 * "site vitrine" served on the apex/SaaS host) is closed and every page is
 * replaced by /site-closed.
 *
 * Left reachable so existing merchants and staff are never locked out:
 *   - /login, /forgot-password
 *   - /admin/**, /super-admin/**
 * Tenant storefronts ({tenant}.host) are never affected — they resolve a
 * tenant context, and this guard bails out whenever one is present.
 *
 * Reopen by removing the env var or setting it to "true".
 */
const EXEMPT_PATHS = new Set(['/site-closed', '/login', '/forgot-password'])
const EXEMPT_PREFIXES = ['/admin', '/super-admin', '/api', '/_nuxt', '/__nuxt']

export default defineNuxtRouteMiddleware((to) => {
  const { public: pub } = useRuntimeConfig()
  if (pub.registrationsOpen !== false) return

  // Tenant storefronts are out of scope for this switch.
  const tenant = useState('tenant')
  if (tenant.value) return

  if (EXEMPT_PATHS.has(to.path)) return
  if (EXEMPT_PREFIXES.some((prefix) => to.path === prefix || to.path.startsWith(`${prefix}/`))) return

  return navigateTo('/site-closed')
})
