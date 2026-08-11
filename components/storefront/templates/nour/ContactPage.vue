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
  <div class="bg-[#FAF3EA] min-h-screen py-16 md:py-24">
    <div class="max-w-3xl mx-auto px-6">
      <div class="flex items-center justify-center gap-3 mb-6">
        <span class="h-px w-10 bg-[#C9A24B]/50" />
        <Icon name="lucide:sparkle" class="w-4 h-4 text-[#C9A24B]" />
        <span class="h-px w-10 bg-[#C9A24B]/50" />
      </div>
      <h1 class="text-4xl md:text-5xl font-bold text-[#2E1E20] mb-6 text-center tracking-tight">
        {{ t('storefront.pages.contact.heading', { tenant: tenantName }) }}
      </h1>
      <div class="bg-[#FFFDF9] rounded-[24px] border border-[#C9A24B]/35 shadow-sm px-8 py-10 md:px-12 md:py-12">
        <p class="text-[#5C4A44] leading-relaxed text-lg">
          {{ t('storefront.pages.contact.placeholder') }}
        </p>
      </div>
    </div>
  </div>
</template>
