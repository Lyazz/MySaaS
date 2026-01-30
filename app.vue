<script setup lang="ts">
// Global head configuration if needed, but pages will override
useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - Swekly Platform` : 'Swekly Platform';
  }
})

// Initialize tenant state globally
const event = useRequestEvent()
useState('tenant', () => event?.context.tenant)
useState('storeSettings', () => event?.context.storeSettings)
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toast />
</template>
