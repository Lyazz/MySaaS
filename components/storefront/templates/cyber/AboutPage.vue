<script setup lang="ts">
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')

useTenantSeo({
  title: `About - ${tenantName.value}`,
  description: `Learn more about ${tenantName.value}.`
})
</script>

<template>
  <div class="min-h-screen py-12 relative">
    <!-- Synthwave Background -->
    <div class="fixed inset-0 z-0 pointer-events-none">
      <div class="absolute inset-0 bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0515]"></div>
      <div class="absolute bottom-0 left-0 right-0 h-[30%] bg-[linear-gradient(rgba(255,45,149,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,45,149,0.1)_1px,transparent_1px)] bg-[size:30px_30px] [perspective:500px] [transform:rotateX(60deg)] origin-bottom opacity-40"></div>
    </div>

    <div class="relative z-10 max-w-5xl mx-auto px-4">
      <h1 class="text-4xl font-sans font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 mb-4">
        About {{ tenantName }}
      </h1>
      <p class="text-purple-200/70 leading-relaxed">
        Welcome to {{ tenantName }}. This page is part of your tenant storefront template and can be customized from the
        onboarding wizard.
      </p>
    </div>
  </div>
</template>
