<script setup lang="ts">
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')

useTenantSeo({
  title: `About - ${tenantName.value}`,
  description: `Learn more about ${tenantName.value}.`
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-20 text-center">
    <h1 class="text-5xl font-serif font-bold text-slate-900 mb-8 tracking-tight">
      About {{ tenantName }}
    </h1>
    <div class="w-24 h-px bg-slate-900 mx-auto mb-12"></div>
    <div class="max-w-2xl mx-auto">
        <p class="text-slate-600 text-lg leading-relaxed font-light">
        Welcome to {{ tenantName }}. We are dedicated to providing the best quality products with a touch of elegance. Our journey began with a simple idea: to make luxury accessible to everyone.
        </p>
    </div>
  </div>
</template>
