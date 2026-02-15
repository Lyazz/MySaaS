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
  <div class="max-w-5xl mx-auto px-4 py-12">
    <h1 class="text-4xl font-wellness font-bold text-slate-900 mb-4">
      {{ t('storefront.pages.contact.heading', { tenant: tenantName }) }}
    </h1>
    <p class="text-slate-600 leading-relaxed">
      {{ t('storefront.pages.contact.placeholder') }}
    </p>
  </div>
</template>
