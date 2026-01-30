<script setup lang="ts">
const tenant = useState('tenant')

definePageMeta({
  layout: false
})
</script>


<template>
  <NuxtLayout :name="tenant ? 'store' : 'default'">
    <TenantStorefront v-if="tenant" />
    <SaasLanding v-else />
  </NuxtLayout>
</template>
