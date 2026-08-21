<script setup lang="ts">
const tenant = useState<any>('tenant')
const { t } = useI18n({ useScope: 'global' })
const tenantName = computed(() => tenant.value?.name || t('storefront.common.storeFallback'))

useTenantSeo({
  title: t('storefront.pages.about.seo.title', { tenant: tenantName.value }),
  description: t('storefront.pages.about.seo.description', { tenant: tenantName.value })
})
</script>

<template>
  <div class="bg-[#F2ECE1] min-h-screen">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-stretch">
        <!-- Text -->
        <div class="lg:col-span-7 order-2 lg:order-1 flex flex-col justify-center">
          <p class="emb-label text-brand-700 mb-4">{{ t('storefront.footer.aboutUs') }}</p>
          <h1 class="emb-display text-4xl md:text-[54px] leading-[1.05] text-[#16211E]">
            {{ t('storefront.pages.about.heading', { tenant: tenantName }) }}
          </h1>
          <span class="block h-px w-24 bg-[#DFA254] my-8" />
          <p class="text-lg text-[#5A6763] leading-relaxed max-w-xl">
            {{ t('storefront.pages.about.placeholder') }}
          </p>
          <NuxtLink
            to="/products"
            class="group mt-10 self-start inline-flex items-center gap-3 h-12 px-7 bg-brand-600 text-[#FDFAF4] emb-label hover:bg-[#DFA254] hover:text-[#062622] transition-colors"
          >
            {{ t('storefront.shop.allProducts') }}
            <Icon name="lucide:arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" />
          </NuxtLink>
        </div>

        <!-- The tile wall -->
        <div class="lg:col-span-5 order-1 lg:order-2">
          <div class="emb-plate-dark aspect-[4/5] w-full">
            <div class="emb-plate-inner bg-brand-600 flex items-center justify-center">
              <div class="emb-zellige opacity-25 absolute inset-0" />
              <span class="emb-star relative w-24 h-24 md:w-32 md:h-32 text-[#DFA254]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
