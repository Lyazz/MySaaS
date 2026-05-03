import type { DriveStep } from 'driver.js'

export function useOrdersTour() {
  function getOrdersSteps(t: (k: string) => string): DriveStep[] {
    return [
      {
        element: '[data-tour="orders-tabs"]',
        popover: {
          title: t('admin.tours.orders.steps.tabs.title'),
          description: t('admin.tours.orders.steps.tabs.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="orders-export"]',
        popover: {
          title: t('admin.tours.orders.steps.export.title'),
          description: t('admin.tours.orders.steps.export.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="orders-table"]',
        popover: {
          title: t('admin.tours.orders.steps.table.title'),
          description: t('admin.tours.orders.steps.table.desc'),
          side: 'top',
        },
      },
    ]
  }
  return { getOrdersSteps }
}
