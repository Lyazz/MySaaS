<script setup lang="ts">
import { cartTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'
import type { TemplateKey } from '~/components/storefront/templates/registry'

const storeSettings = useState<any>('storeSettings')
const templateKey = computed<TemplateKey>(() => resolveTemplateKey(storeSettings.value?.templateKey))

const ActiveTemplate = computed(() => cartTemplates[templateKey.value])

definePageMeta({
  title: 'Shopping Cart',
  middleware: 'tenant-only',
  layout: 'store'
})
</script>

<template>
  <component :is="ActiveTemplate" />
</template>
