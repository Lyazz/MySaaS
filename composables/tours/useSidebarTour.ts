import type { DriveStep } from 'driver.js'

export function useSidebarTour() {
  function getSidebarSteps(t: (k: string) => string): DriveStep[] {
    return [
      {
        element: '[data-tour="sidebar-logo"]',
        popover: {
          title: t('admin.tours.sidebar.steps.logo.title'),
          description: t('admin.tours.sidebar.steps.logo.desc'),
          side: 'right',
        },
      },
      {
        element: '[data-tour="sidebar-dashboard"]',
        popover: {
          title: t('admin.tours.sidebar.steps.dashboard.title'),
          description: t('admin.tours.sidebar.steps.dashboard.desc'),
          side: 'right',
        },
      },
      {
        element: '[data-tour="sidebar-products"]',
        popover: {
          title: t('admin.tours.sidebar.steps.products.title'),
          description: t('admin.tours.sidebar.steps.products.desc'),
          side: 'right',
        },
      },
      {
        element: '[data-tour="sidebar-orders"]',
        popover: {
          title: t('admin.tours.sidebar.steps.orders.title'),
          description: t('admin.tours.sidebar.steps.orders.desc'),
          side: 'right',
        },
      },
      {
        element: '[data-tour="sidebar-delivery"]',
        popover: {
          title: t('admin.tours.sidebar.steps.delivery.title'),
          description: t('admin.tours.sidebar.steps.delivery.desc'),
          side: 'right',
        },
      },
      {
        element: '[data-tour="sidebar-settings"]',
        popover: {
          title: t('admin.tours.sidebar.steps.settings.title'),
          description: t('admin.tours.sidebar.steps.settings.desc'),
          side: 'right',
        },
      },
      {
        element: '[data-tour="sidebar-tour-menu"]',
        popover: {
          title: t('admin.tours.sidebar.steps.help.title'),
          description: t('admin.tours.sidebar.steps.help.desc'),
          side: 'right',
        },
      },
    ]
  }
  return { getSidebarSteps }
}
