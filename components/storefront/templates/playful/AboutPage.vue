<script setup lang="ts">
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')

useTenantSeo({
  title: `About - ${tenantName.value}`,
  description: `Learn more about ${tenantName.value}.`
})
</script>

<template>
  <div class="bg-[#faf5ff] min-h-screen py-12">
    <div class="max-w-5xl mx-auto px-4 bg-white p-8 md:p-12 rounded-[2rem] border-4 border-purple-100 shadow-sm">
      <h1 class="text-4xl font-sans font-black text-[#4c1d95] mb-4">
        About {{ tenantName }}
      </h1>
      <p class="text-slate-600 leading-relaxed font-medium">
        Welcome to {{ tenantName }}. This page is part of your tenant storefront template and can be customized from the
        onboarding wizard.
      </p>
    </div>
  </div>
</template>

