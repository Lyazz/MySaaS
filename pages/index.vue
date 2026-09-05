<script setup lang="ts">
const tenant = useState('tenant')

definePageMeta({
  layout: false
})

if (!tenant.value) {
  const auth = useAuthStore()
  if (auth.isAuthenticated && auth.user) {
    await navigateTo(auth.user.isSuperAdmin ? '/super-admin' : '/admin')
  }
}
</script>


<template>
  <NuxtLayout :name="tenant ? 'store' : 'default'">
    <TenantStorefront v-if="tenant" />
    <SaasLanding v-else />
  </NuxtLayout>
</template>
