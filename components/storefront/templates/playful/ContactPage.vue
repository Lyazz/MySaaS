<script setup lang="ts">
const tenant = useState<any>('tenant')
const { t } = useI18n({ useScope: 'global' })
const tenantName = computed(() => tenant.value?.name || t('storefront.common.storeFallback'))

useTenantSeo({
  title: t('storefront.pages.contact.seo.title', { tenant: tenantName.value }),
  description: t('storefront.pages.contact.seo.description', { tenant: tenantName.value })
})
</script>

<template>
  <div class="bg-[#faf5ff] min-h-screen py-12">
    <div class="max-w-5xl mx-auto px-4 bg-white p-8 md:p-12 rounded-[2rem] border-4 border-purple-100 shadow-sm">
      <h1 class="text-4xl font-sans font-black text-[#4c1d95] mb-4">
        {{ t('storefront.pages.contact.heading', { tenant: tenantName }) }}
      </h1>
      <p class="text-slate-600 leading-relaxed font-medium">
        {{ t('storefront.pages.contact.placeholder') }}
      </p>
    </div>
  </div>
</template>
