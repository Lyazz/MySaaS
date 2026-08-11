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
    <div class="max-w-6xl mx-auto px-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <!-- Visual Column (arched decorative frame) -->
        <div class="order-1 relative">
          <div class="absolute -inset-4 md:-inset-6 rounded-tl-3xl rounded-tr-[110px] rounded-br-3xl rounded-bl-[110px] bg-[#C9A24B]/15 -z-10" />
          <div class="aspect-square rounded-tl-3xl rounded-tr-[110px] rounded-br-3xl rounded-bl-[110px] border border-[#C9A24B]/35 bg-[#FFFDF9] shadow-xl flex items-center justify-center">
            <Icon name="lucide:mail" class="w-20 h-20 md:w-28 md:h-28 text-[#C9A24B]" />
          </div>
        </div>

        <!-- Text Column -->
        <div class="order-2">
          <div class="flex items-center gap-3 mb-6">
            <span class="h-px w-10 bg-[#C9A24B]/50" />
            <Icon name="lucide:sparkle" class="w-4 h-4 text-[#C9A24B]" />
            <span class="h-px w-10 bg-[#C9A24B]/50" />
          </div>
          <h1 class="text-4xl md:text-5xl font-bold text-[#2E1E20] mb-6 tracking-tight">
            {{ t('storefront.pages.contact.heading', { tenant: tenantName }) }}
          </h1>
          <div class="bg-[#FFFDF9] rounded-tl-lg rounded-tr-[48px] rounded-br-lg rounded-bl-lg border border-[#C9A24B]/35 shadow-sm px-8 py-10 md:px-10 md:py-10">
            <p class="text-[#5C4A44] leading-relaxed text-lg">
              {{ t('storefront.pages.contact.placeholder') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
