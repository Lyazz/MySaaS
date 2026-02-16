import { useAuthStore } from '~/stores/auth'

const pathToResource = (path: string): string | null => {
  if (path === '/admin' || path.startsWith('/admin/dashboard')) return 'dashboard'
  if (path.startsWith('/admin/products')) return 'products'
  if (path.startsWith('/admin/inventory')) return 'inventory'
  if (path.startsWith('/admin/categories')) return 'categories'
  if (path.startsWith('/admin/suppliers')) return 'suppliers'
  if (path.startsWith('/admin/purchases')) return 'purchases'
  if (path.startsWith('/admin/orders')) return 'orders'
  if (path.startsWith('/admin/sales')) return 'sales'
  if (path.startsWith('/admin/pos')) return 'pos'
  if (path.startsWith('/admin/customers')) return 'customers'
  if (path.startsWith('/admin/delivery')) return 'delivery'
  if (path.startsWith('/admin/cash')) return 'cash'
  if (path.startsWith('/admin/billing')) return 'billing'
  if (path.startsWith('/admin/settings/appearance')) return 'storeSettings'
  if (path.startsWith('/admin/settings/homepage')) return 'homepageSettings'
  if (path.startsWith('/admin/settings/contact')) return 'contactInfos'
  if (path.startsWith('/admin/settings/functional')) return 'storeSettings'
  if (path.startsWith('/admin/integrations')) return 'integrations'
  if (path.startsWith('/admin/meta-pixels')) return 'metaPixels'
  if (path.startsWith('/admin/users')) return 'users'
  return null
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
  if (allow('storeSettings')) return '/admin/settings/appearance'
  if (allow('homepageSettings')) return '/admin/settings/homepage'
  if (allow('contactInfos')) return '/admin/settings/contact'
  if (allow('integrations')) return '/admin/integrations'
  if (allow('metaPixels')) return '/admin/meta-pixels'
  return '/admin/orders'
}

export default defineNuxtRouteMiddleware((to) => {
  if (process.server) return
  if (!to.path.startsWith('/admin')) return

  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) return
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

  if (!perms.includes(`${resource}:read`)) {
    return navigateTo(firstAllowedPath(perms))
  }
})
