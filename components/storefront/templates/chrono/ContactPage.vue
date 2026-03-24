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
  <div class="max-w-5xl mx-auto px-4 py-16">
    <div class="border-b border-[#A67C52]/20 pb-6 mb-8">
      <h1 class="text-4xl font-bold text-[#A67C52] tracking-wide" style="background-color:#0E1117; font-family:'Cormorant Garamond',serif;">
        {{ t('storefront.pages.contact.heading', { tenant: tenantName }) }}
      </h1>
    </div>
    <p class="text-gray-400 leading-relaxed text-lg" style="background-color:#0E1117; font-family:'Cormorant Garamond',serif;">
      {{ t('storefront.pages.contact.placeholder') }}
    </p>
  </div>
</template>
