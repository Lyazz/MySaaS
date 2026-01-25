<script setup lang="ts">
const tenant = useState('tenant')
</script>


<template>
  <div>
    <TenantStorefront v-if="tenant" />
    <SaasLanding v-else />
  </div>
</template>
