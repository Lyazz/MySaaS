<script setup lang="ts">
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')

useTenantSeo({
  title: `About - ${tenantName.value}`,
  description: `Learn more about ${tenantName.value}.`
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-16">
    <div class="border-b border-[#A67C52]/20 pb-6 mb-8">
      <h1 class="text-4xl font-bold text-[#A67C52] tracking-wide" style="background-color:#0E1117; font-family:'Cormorant Garamond',serif;">
        About {{ tenantName }}
      </h1>
    </div>
    <p class="text-gray-400 leading-relaxed text-lg" style="background-color:#0E1117; font-family:'Cormorant Garamond',serif;">
      Welcome to {{ tenantName }}. This page is part of your tenant storefront template and can be customized from the
      onboarding wizard.
    </p>
  </div>
</template>
