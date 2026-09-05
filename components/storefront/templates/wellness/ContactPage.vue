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
  <div class="bg-wl-paper font-wellness text-wl-ink"><div class="max-w-3xl mx-auto px-4 py-16">
    <h1 class="wl-display text-4xl text-wl-ink mb-5">
      {{ t('storefront.pages.contact.heading', { tenant: tenantName }) }}
    </h1>
    <p class="text-wl-muted leading-relaxed">
      {{ t('storefront.pages.contact.placeholder') }}
    </p>
  </div></div>
</template>
