<script setup lang="ts">
import { contactPageTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'

const tenant = useState<any>('tenant')
const storeSettings = useState<any>('storeSettings')
const templateKey = computed(() => resolveTemplateKey(storeSettings.value?.templateKey))
const ContactPage = computed(() => contactPageTemplates[templateKey.value])
</script>

<template>
  <component :is="ContactPage" v-if="tenant" />
  <MarketingSaasContactPage v-else />
</template>
