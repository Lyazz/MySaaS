import type { I18nOptions } from 'vue-i18n'

export default defineI18nConfig((): I18nOptions => ({
  legacy: false,
  fallbackLocale: 'en',
  missingWarn: false,
  fallbackWarn: false
}))
