<script setup lang="ts">
const tenant = useState<any>('tenant')
</script>

<template>
  <StorefrontStoreAboutPage v-if="tenant" />
  <MarketingSaasAboutPage v-else />
</template>
