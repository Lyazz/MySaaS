<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    class?: string
    showLabels?: boolean
  }>(),
  {
    showLabels: false
  }
)

const i18n = useI18n({ useScope: 'global' })
const switchLocale = async (code: 'en' | 'fr' | 'ar') => {
  // Nuxt i18n augments the composer with `setLocale`.
  // Fall back to direct assignment for plain vue-i18n.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const composer = i18n as any
  if (typeof composer.setLocale === 'function') {
    await composer.setLocale(code)
  } else if (composer.locale && typeof composer.locale === 'object' && 'value' in composer.locale) {
    composer.locale.value = code
  }

  if (process.client) {
    document.cookie = `i18n_redirected=${code}; Path=/; SameSite=Lax`
  }
}
</script>

<template>
  <div
    class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1"
    :class="props.class"
    data-testid="locale-switcher"
    :aria-label="i18n.t('i18n.switcher.label')"
  >
    <button
      type="button"
      class="px-2 py-1 text-xs font-semibold rounded-md transition-colors"
      :class="i18n.locale === 'fr' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'"
      data-testid="locale-switch-fr"
      @click="switchLocale('fr')"
    >
      <span v-if="showLabels">{{ i18n.t('i18n.locales.fr') }}</span>
      <span v-else>FR</span>
    </button>
    <button
      type="button"
      class="px-2 py-1 text-xs font-semibold rounded-md transition-colors"
      :class="i18n.locale === 'ar' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'"
      data-testid="locale-switch-ar"
      @click="switchLocale('ar')"
    >
      <span v-if="showLabels">{{ i18n.t('i18n.locales.ar') }}</span>
      <span v-else>AR</span>
    </button>
    <button
      type="button"
      class="px-2 py-1 text-xs font-semibold rounded-md transition-colors"
      :class="i18n.locale === 'en' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'"
      data-testid="locale-switch-en"
      @click="switchLocale('en')"
    >
      <span v-if="showLabels">{{ i18n.t('i18n.locales.en') }}</span>
      <span v-else>EN</span>
    </button>
  </div>
</template>
