<script setup lang="ts">
const tenant = useState<any>('tenant')
const storeSettings = useState<any>('storeSettings')
const { t } = useI18n({ useScope: 'global' })
const tenantName = computed(() => tenant.value?.name || t('storefront.common.storeFallback'))

useTenantSeo({
  title: t('storefront.pages.about.seo.title', { tenant: tenantName.value }),
  description: t('storefront.pages.about.seo.description', { tenant: tenantName.value })
})

const aboutBody = computed(() => storeSettings.value?.description || t('storefront.pages.about.placeholder'))
</script>

<template>
  <div class="ed-theme">
    <div class="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-10 py-14 md:py-24">
      <div class="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        <!-- Text -->
        <div class="lg:col-span-7">
          <p class="ed-kicker mb-6">{{ t('storefront.footer.aboutUs') }}</p>
          <h1 class="ed-display text-4xl md:text-[3.5rem] leading-[1.06] text-[#262019]">
            {{ t('storefront.pages.about.heading', { tenant: tenantName }) }}
          </h1>
          <span class="block h-px w-24 bg-[#B8532E] my-8" />
          <p class="ed-dropcap text-[17px] leading-[1.75] text-[#4A4038] max-w-xl">
            {{ aboutBody }}
          </p>
          <NuxtLink to="/products" class="ed-btn-solid mt-10">
            {{ t('storefront.shop.allProducts') }}
            <Icon name="lucide:arrow-right" class="w-4 h-4 rtl:rotate-180" />
          </NuxtLink>
        </div>

        <!-- Marque plate -->
        <div class="lg:col-span-5">
          <div class="bg-[#FBF8F2] border border-[#DAD2C4] p-2">
            <div class="aspect-[4/5] bg-[#EFE8DA] flex items-center justify-center relative overflow-hidden">
              <span class="ed-display text-[6rem] md:text-[8rem] text-[#C4B8A4] leading-none select-none">{{ tenantName.charAt(0) }}</span>
              <span class="absolute bottom-3 start-3 ed-ui text-[10px] uppercase tracking-[0.2em] text-[#8A7E6E]">Est. {{ new Date().getFullYear() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
