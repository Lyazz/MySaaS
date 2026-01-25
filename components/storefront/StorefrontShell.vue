<script setup lang="ts">
import ClassicStoreShell from '~/components/storefront/templates/ClassicStoreShell.vue'
import ModernStoreShell from '~/components/storefront/templates/ModernStoreShell.vue'

const storeSettings = useState<any>('storeSettings')
const templateKey = computed(() => storeSettings.value?.templateKey || 'classic')

const ActiveShell = computed(() => {
  return templateKey.value === 'modern' ? ModernStoreShell : ClassicStoreShell
})
</script>

<template>
  <component :is="ActiveShell">
    <slot />
  </component>
</template>

