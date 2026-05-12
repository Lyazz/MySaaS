<script setup lang="ts">
import { aboutPageTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'

const tenant = useState<any>('tenant')
const storeSettings = useState<any>('storeSettings')
const templateKey = computed(() => resolveTemplateKey(storeSettings.value?.templateKey))
const AboutPage = computed(() => aboutPageTemplates[templateKey.value])

if (!tenant.value) {
  await navigateTo('/', { redirectCode: 301 })
}
</script>

<template>
  <component :is="AboutPage" v-if="tenant" />
</template>
