import { useAuthStore } from '~/stores/auth'
import { adminPathToResource, hasSettingsHubAccess } from '~/shared/admin/settings-navigation'

const pathToResource = (path: string): string | null => {
  return adminPathToResource(path)
}

const firstAllowedPath = (permissions: string[]): string => {
  const allow = (resource: string) => permissions.includes(`${resource}:read`)
  if (allow('orders')) return '/admin/orders'
  if (allow('dashboard')) return '/admin'
  if (allow('products')) return '/admin/products'
  if (allow('inventory')) return '/admin/inventory'
  if (allow('categories')) return '/admin/categories'
  if (allow('customers')) return '/admin/customers'
  if (allow('suppliers')) return '/admin/suppliers'
  if (allow('purchases')) return '/admin/purchases'
  if (allow('sales')) return '/admin/sales'
  if (allow('pos')) return '/admin/pos'
  if (allow('delivery')) return '/admin/delivery'
  if (allow('cash')) return '/admin/cash'
  if (allow('billing')) return '/admin/billing'
  if (hasSettingsHubAccess('staff', permissions)) return '/admin/settings'
  if (allow('integrations')) return '/admin/integrations'
  if (allow('metaPixels')) return '/admin/meta-pixels'
  return '/admin/orders'
}

export default defineNuxtRouteMiddleware((to) => {
  if (process.server) return
  if (!to.path.startsWith('/admin')) return

  const authStore = useAuthStore()
  if (!authStore.ensureSessionActive()) return
  if (authStore.user?.isSuperAdmin) return

  const role = authStore.user?.role || 'staff'

  if (role !== 'staff') return

  const resource = pathToResource(to.path)
  if (!resource) return

  const perms = authStore.staffPermissions

  // If permissions are not loaded yet, keep legacy behavior (orders only).
  if (!perms || perms.length === 0) {
    if (resource !== 'orders') return navigateTo('/admin/orders')
    return
  }

  if (resource === 'settingsHub') {
    if (!hasSettingsHubAccess('staff', perms)) return navigateTo(firstAllowedPath(perms))
    return
  }

  if (!perms.includes(`${resource}:read`)) {
    return navigateTo(firstAllowedPath(perms))
  }
})
