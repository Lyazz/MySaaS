<script setup lang="ts">
import { storeShellTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'

const storeSettings = useState<any>('storeSettings')
const route = useRoute()

const templateKey = computed(() => {
  if (route.query.preview_template) {
    return resolveTemplateKey(route.query.preview_template as string)
  }
  return resolveTemplateKey(storeSettings.value?.templateKey)
})
const StoreShell = computed(() => storeShellTemplates[templateKey.value])

const tenant = useState<any>('tenant')
const facebookPixelId = useState<string | null>('facebookPixelId')

const pixelScriptEnabled = computed(() => Boolean(tenant.value))
const pixelNoscriptEnabled = computed(() => Boolean(tenant.value && facebookPixelId.value))
const metaPixel = useMetaPixel()

useHead(() => {
  if (!pixelScriptEnabled.value) return {}
  return {
    script: [
      {
        key: 'facebook-pixel-loader',
        src: '/api/pixel/facebook.js',
        async: true
      }
    ]
  }
})

watch(
  () => route.fullPath,
  () => {
    if (!process.client) return
    metaPixel.pageView()
  },
  { immediate: true }
)
</script>

<template>
  <component :is="StoreShell">
    <slot />
    <StorefrontSharedProductCardVariantModalHost />
    <noscript v-if="pixelNoscriptEnabled">
      <img
        height="1"
        width="1"
        style="display:none"
        :src="`https://www.facebook.com/tr?id=${facebookPixelId}&ev=PageView&noscript=1`"
        alt=""
      >
    </noscript>
  </component>
</template>
