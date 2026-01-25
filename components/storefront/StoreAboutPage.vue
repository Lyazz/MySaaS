<script setup lang="ts">
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')

useTenantSeo({
  title: `About - ${tenantName.value}`,
  description: `Learn more about ${tenantName.value}.`
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-12">
    <h1 class="text-4xl font-display font-bold text-slate-900 mb-4">About {{ tenantName }}</h1>
    <p class="text-slate-600 leading-relaxed">
      Welcome to {{ tenantName }}. This page is part of your tenant storefront template and can be customized from the
      onboarding wizard.
    </p>
  </div>
</template>

