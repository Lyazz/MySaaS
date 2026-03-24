<script setup lang="ts">
// Global head configuration if needed, but pages will override
useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - Swekly Platform` : 'Swekly Platform';
  }
})

const { locale } = useI18n({ useScope: 'global' })
const htmlDir = computed(() => (locale.value === 'ar' ? 'rtl' : 'ltr'))
const htmlLang = computed(() => {
  if (locale.value === 'fr') return 'fr-FR'
  if (locale.value === 'ar') return 'ar-DZ'
  return 'en-US'
})

// Initialize tenant state globally
const event = useRequestEvent()
const tenant = useState('tenant', () => event?.context.tenant)
const storeSettings = useState<any>('storeSettings', () => event?.context.storeSettings)
const facebookPixelId = useState<string | null>('facebookPixelId', () => (event?.context as any)?.facebookPixelId ?? null)

const faviconUrl = computed(() => storeSettings.value?.faviconUrl || '/favicon.ico')

useHead({
  htmlAttrs: {
    lang: htmlLang,
    dir: htmlDir
  },
  link: [
    { rel: 'icon', type: 'image/x-icon', href: faviconUrl }
  ]
})

// Store default language should be applied when user has no locale cookie yet.
const localeCookie = useCookie<string | null>('i18n_redirected', { default: () => null })
const i18n = useI18n({ useScope: 'global' })
watchEffect(() => {
  if (localeCookie.value) return
  const preferred = storeSettings.value?.language
  if (!preferred) return
  if (!['en', 'fr', 'ar'].includes(preferred)) return
  if (i18n.locale.value === preferred) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const composer = i18n as any
  if (typeof composer.setLocale === 'function') {
    // eslint-disable-next-line no-void
    void composer.setLocale(preferred)
  } else {
    i18n.locale.value = preferred
  }
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toast />
</template>
