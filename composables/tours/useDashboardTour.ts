import type { DriveStep } from 'driver.js'

export function useDashboardTour() {
  function getDashboardSteps(t: (k: string) => string): DriveStep[] {
    return [
      {
        element: '[data-tour="dashboard-stats"]',
        popover: {
          title: t('admin.tours.dashboard.steps.stats.title'),
          description: t('admin.tours.dashboard.steps.stats.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="dashboard-checklist"]',
        popover: {
          title: t('admin.tours.dashboard.steps.checklist.title'),
          description: t('admin.tours.dashboard.steps.checklist.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="dashboard-chart"]',
        popover: {
          title: t('admin.tours.dashboard.steps.chart.title'),
          description: t('admin.tours.dashboard.steps.chart.desc'),
          side: 'top',
        },
      },
    ]
  }
  return { getDashboardSteps }
}
