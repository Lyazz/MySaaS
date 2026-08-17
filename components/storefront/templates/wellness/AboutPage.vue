<script setup lang="ts">
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')

useTenantSeo({
  title: `About - ${tenantName.value}`,
  description: `Learn more about ${tenantName.value}.`
})
</script>

<template>
  <div class="bg-wl-paper font-wellness text-wl-ink"><div class="max-w-3xl mx-auto px-4 py-16">
    <h1 class="wl-display text-4xl text-wl-ink mb-5">
      About {{ tenantName }}
    </h1>
    <p class="text-wl-muted leading-relaxed">
      Welcome to {{ tenantName }}. This page is part of your tenant storefront template and can be customized from the
      onboarding wizard.
    </p>
  </div></div>
</template>

