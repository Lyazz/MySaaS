<script setup lang="ts">
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')

useTenantSeo({
  title: `Contact - ${tenantName.value}`,
  description: `Contact ${tenantName.value}.`
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-12">
    <h1 class="text-4xl font-sans font-bold text-stone-900 mb-4">
      Contact {{ tenantName }}
    </h1>
    <p class="text-stone-600 leading-relaxed">
      This is the store contact page. Add your phone/email/address from the store settings wizard to replace this
      placeholder content.
    </p>
  </div>
</template>

