<script setup lang="ts">
import { storeShellTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'

const storeSettings = useState<any>('storeSettings')
const templateKey = computed(() => resolveTemplateKey(storeSettings.value?.templateKey))
const StoreShell = computed(() => storeShellTemplates[templateKey.value])

const tenant = useState<any>('tenant')
const facebookPixelId = useState<string | null>('facebookPixelId')
const route = useRoute()

const pixelScriptEnabled = computed(() => Boolean(tenant.value))
const pixelNoscriptEnabled = computed(() => Boolean(tenant.value && facebookPixelId.value))
const metaPixel = useMetaPixel()
const productDetailRoute = computed(() => /^\/(?:product|p)\//.test(route.path))

useHead(() => {
  const head: Record<string, any> = {}
  if (pixelScriptEnabled.value) {
    head.script = [
      {
        key: 'facebook-pixel-loader',
        src: '/api/pixel/facebook.js',
        async: true
      }
    ]
  }
  if (pixelNoscriptEnabled.value) {
    head.noscript = [
      {
        key: 'facebook-pixel-noscript',
        innerHTML: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${facebookPixelId.value}&ev=PageView&noscript=1" alt="">`
      }
    ]
  }
  return head
})

watch(
  () => route.fullPath,
  () => {
    if (!process.client) return
    if (productDetailRoute.value) return
    metaPixel.pageView()
  },
  { immediate: true }
)
</script>

<template>
  <component :is="StoreShell" :hide-navigation="false" :mobile-header-hidden="true" :hide-announcement-bar="true">
    <slot />
    <StorefrontSharedProductCardVariantModalHost />
  </component>
</template>
