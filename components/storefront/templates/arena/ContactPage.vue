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
  <div class="bg-[#06080c] min-h-screen text-slate-300">
    <div class="border-b border-white/[0.06] bg-black">
      <div class="h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-60" />
      <div class="max-w-[1400px] mx-auto px-5 lg:px-10 py-12 lg:py-16">
        <h1 class="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-[-0.04em] text-white leading-[0.92]">
          {{ t('storefront.pages.contact.heading', { tenant: tenantName }) }}
        </h1>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-5 lg:px-10 py-16 lg:py-24">
      <div class="relative bg-[#0b0f14] border border-white/[0.06] p-8 lg:p-12">
        <span class="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-brand-500" />
        <span class="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-brand-500" />
        <span class="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-brand-500" />
        <span class="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-brand-500" />

        <p class="text-base lg:text-lg text-slate-300 leading-relaxed">
          {{ t('storefront.pages.contact.placeholder') }}
        </p>
      </div>
    </div>
  </div>
</template>
