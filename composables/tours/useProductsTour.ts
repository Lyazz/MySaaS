import type { DriveStep } from 'driver.js'

export function useProductsTour() {
  function getProductsSteps(t: (k: string) => string): DriveStep[] {
    return [
      {
        element: '[data-tour="products-create-btn"]',
        popover: {
          title: t('admin.tours.products.steps.create.title'),
          description: t('admin.tours.products.steps.create.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="products-search"]',
        popover: {
          title: t('admin.tours.products.steps.search.title'),
          description: t('admin.tours.products.steps.search.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="products-table"]',
        popover: {
          title: t('admin.tours.products.steps.table.title'),
          description: t('admin.tours.products.steps.table.desc'),
          side: 'top',
        },
      },
    ]
  }
  return { getProductsSteps }
}
