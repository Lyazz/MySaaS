<script setup lang="ts">
const tenant = useState<any>('tenant')
const { t } = useI18n({ useScope: 'global' })
const storefrontContent = useStorefrontContent()
const tenantName = computed(() => tenant.value?.name || t('storefront.common.storeFallback'))

useTenantSeo({
  title: `About - ${tenantName.value}`,
  description: `Learn more about ${tenantName.value}.`
})
</script>

<template>
  <div class="bg-[var(--kw-cream)] min-h-screen pb-20">
    <section class="kw-band-pink kw-scallop pt-12 pb-16 md:pt-16 md:pb-20">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <span
          class="kw-blob kw-float w-20 h-20 mx-auto mb-7 flex items-center justify-center"
          style="background: linear-gradient(140deg, var(--kw-lemon), var(--kw-peach))"
        >
          <Icon
            name="lucide:heart"
            class="w-9 h-9 text-white"
          />
        </span>
        <p class="kw-kicker mb-3">
          {{ storefrontContent.home.welcomeTo(tenantName) }}
        </p>
        <h1 class="kw-display text-3xl md:text-[3rem]">
          {{ tenantName }}
        </h1>
      </div>
    </section>

    <div class="max-w-3xl mx-auto px-4 sm:px-6 -mt-6">
      <div class="kw-card p-8 md:p-12 text-center">
        <p class="kw-lede">
          Welcome to {{ tenantName }}. This page is part of your tenant storefront template and can be customized from
          the onboarding wizard.
        </p>
        <NuxtLink
          to="/products"
          class="kw-btn mt-9"
        >
          {{ storefrontContent.shop.allProducts }}
          <Icon
            name="lucide:arrow-right"
            class="w-4 h-4 rtl:rotate-180"
          />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
