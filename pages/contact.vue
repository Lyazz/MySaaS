<script setup lang="ts">
const tenant = useState<any>('tenant')
</script>

<template>
  <StorefrontStoreContactPage v-if="tenant" />
  <MarketingSaasContactPage v-else />
</template>
