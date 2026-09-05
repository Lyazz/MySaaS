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
  <div class="bg-[#F2ECE1] min-h-screen">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-stretch">
        <!-- The tile wall -->
        <div class="lg:col-span-5 order-1">
          <div class="emb-plate-dark aspect-[4/5] w-full">
            <div class="emb-plate-inner bg-brand-600 flex items-center justify-center">
              <div class="emb-zellige opacity-25 absolute inset-0" />
              <Icon name="lucide:mail" class="relative w-20 h-20 md:w-28 md:h-28 text-[#DFA254]" />
            </div>
          </div>
        </div>

        <!-- Text -->
        <div class="lg:col-span-7 order-2 flex flex-col justify-center">
          <p class="emb-label text-brand-700 mb-4">{{ t('storefront.footer.contact') }}</p>
          <h1 class="emb-display text-4xl md:text-[54px] leading-[1.05] text-[#16211E]">
            {{ t('storefront.pages.contact.heading', { tenant: tenantName }) }}
          </h1>
          <span class="block h-px w-24 bg-[#DFA254] my-8" />
          <p class="text-lg text-[#5A6763] leading-relaxed max-w-xl">
            {{ t('storefront.pages.contact.placeholder') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
