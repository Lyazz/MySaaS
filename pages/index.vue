<script setup lang="ts">
const tenant = useState('tenant')

// Dynamically set layout based on whether we are viewing a tenant or the main site
const layout = computed(() => tenant.value ? 'store' : 'default')
setPageLayout(layout.value)
</script>


<template>
  <div>
    <TenantStorefront v-if="tenant" />
    <SaasLanding v-else />
  </div>
</template>
