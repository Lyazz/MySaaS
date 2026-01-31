<script setup lang="ts">
import { storeShellTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'

const storeSettings = useState<any>('storeSettings')
const templateKey = computed(() => resolveTemplateKey(storeSettings.value?.templateKey))
const StoreShell = computed(() => storeShellTemplates[templateKey.value])
</script>

<template>
  <component :is="StoreShell" :hide-navigation="false" :mobile-header-hidden="true" :hide-announcement-bar="true">
    <slot />
  </component>
</template>
