<script setup lang="ts">
import { resolveTemplateKey, storeShellTemplates } from '~/components/storefront/templates/registry'
import type { TemplateKey } from '~/components/storefront/templates/registry'

const storeSettings = useState<any>('storeSettings')
const templateKey = computed<TemplateKey>(() => resolveTemplateKey(storeSettings.value?.templateKey))

const ActiveShell = computed(() => storeShellTemplates[templateKey.value])
</script>

<template>
  <component :is="ActiveShell" v-bind="$attrs">
    <slot />
  </component>
</template>
