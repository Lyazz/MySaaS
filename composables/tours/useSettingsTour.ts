import type { DriveStep } from 'driver.js'

export function useSettingsTour() {
  function getSettingsSteps(t: (k: string) => string): DriveStep[] {
    return [
      {
        element: '[data-tour="settings-appearance-tab"]',
        popover: {
          title: t('admin.tours.settings.steps.appearance.title'),
          description: t('admin.tours.settings.steps.appearance.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="settings-template"]',
        popover: {
          title: t('admin.tours.settings.steps.template.title'),
          description: t('admin.tours.settings.steps.template.desc'),
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="settings-color"]',
        popover: {
          title: t('admin.tours.settings.steps.color.title'),
          description: t('admin.tours.settings.steps.color.desc'),
          side: 'bottom',
        },
      },
    ]
  }
  return { getSettingsSteps }
}
