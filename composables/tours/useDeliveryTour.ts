import type { DriveStep } from 'driver.js'

export function useDeliveryTour() {
  function getDeliverySteps(t: (k: string) => string): DriveStep[] {
    return [
      {
        element: '[data-tour="delivery-providers"]',
        popover: {
          title: t('admin.tours.delivery.steps.providers.title'),
          description: t('admin.tours.delivery.steps.providers.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="delivery-config"]',
        popover: {
          title: t('admin.tours.delivery.steps.config.title'),
          description: t('admin.tours.delivery.steps.config.desc'),
          side: 'top',
        },
      },
    ]
  }
  return { getDeliverySteps }
}
