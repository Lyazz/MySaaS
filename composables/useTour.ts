import type { DriveStep } from 'driver.js'
import { useAuthStore } from '~/stores/auth'
import { useSidebarTour } from './tours/useSidebarTour'
import { useDashboardTour } from './tours/useDashboardTour'
import { useProductsTour } from './tours/useProductsTour'
import { useOrdersTour } from './tours/useOrdersTour'
import { useDeliveryTour } from './tours/useDeliveryTour'
import { useSettingsTour } from './tours/useSettingsTour'
export interface TourDef {
  id: string
  labelKey: string
  icon: string
  getSteps: (t: (k: string) => string) => DriveStep[]
}

// Module-level singleton — shared across all useTour() calls
const activeTourId = ref<string | null>(null)

// Registry built once (steps are pure functions of `t`, not reactive)
let _registry: TourDef[] | null = null

function getRegistry(): TourDef[] {
  if (_registry) return _registry
  const { getSidebarSteps } = useSidebarTour()
  const { getDashboardSteps } = useDashboardTour()
  const { getProductsSteps } = useProductsTour()
  const { getOrdersSteps } = useOrdersTour()
  const { getDeliverySteps } = useDeliveryTour()
  const { getSettingsSteps } = useSettingsTour()

  _registry = [
    { id: 'sidebar', labelKey: 'admin.tours.sidebar.label', icon: 'lucide:layout-dashboard', getSteps: getSidebarSteps },
    { id: 'dashboard', labelKey: 'admin.tours.dashboard.label', icon: 'lucide:bar-chart-2', getSteps: getDashboardSteps },
    { id: 'products', labelKey: 'admin.tours.products.label', icon: 'lucide:package', getSteps: getProductsSteps },
    { id: 'orders', labelKey: 'admin.tours.orders.label', icon: 'lucide:shopping-bag', getSteps: getOrdersSteps },
    { id: 'delivery', labelKey: 'admin.tours.delivery.label', icon: 'lucide:truck', getSteps: getDeliverySteps },
    { id: 'settings', labelKey: 'admin.tours.settings.label', icon: 'lucide:sliders', getSteps: getSettingsSteps },
  ]
  return _registry
}

export function useTour() {
  const { t } = useI18n({ useScope: 'global' })
  const authStore = useAuthStore()

  function getTourStorageKey(tourId: string) {
    const userId = authStore.user?.id || 'unknown'
    const tenantId = authStore.user?.tenantId || 'unknown'
    return `tour_seen_${tenantId}_${userId}_${tourId}`
  }

  async function startTour(id: string, { force = false } = {}) {
    if (!import.meta.client) return
    if (activeTourId.value && !force) return

    const def = getRegistry().find(d => d.id === id)
    if (!def) return

    const { driver } = await import('driver.js')

    activeTourId.value = id

    const driverObj = driver({
      showProgress: true,
      stagePadding: 6,
      nextBtnText: t('admin.tours.next'),
      prevBtnText: t('admin.tours.prev'),
      doneBtnText: t('admin.tours.done'),
      onDestroyStarted: () => {
        driverObj.destroy()
      },
      onDestroyed: () => {
        activeTourId.value = null
        if (import.meta.client) {
          localStorage.setItem(getTourStorageKey(id), '1')
        }
        // Chain: sidebar tour → auto-start dashboard tour
        if (id === 'sidebar') {
          autoStartIfNeeded('dashboard')
        }
      },
      steps: def.getSteps(t),
    })

    driverObj.drive()
  }

  function autoStartIfNeeded(id: string) {
    if (!import.meta.client) return
    if (activeTourId.value) return
    if (localStorage.getItem(getTourStorageKey(id))) return
    setTimeout(() => startTour(id), 600)
  }

  const tours = computed(() =>
    getRegistry().map(d => ({
      id: d.id,
      label: t(d.labelKey),
      icon: d.icon,
    }))
  )

  return { tours, activeTourId, startTour, autoStartIfNeeded }
}
