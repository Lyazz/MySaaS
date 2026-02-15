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
  <div class="max-w-5xl mx-auto px-4 py-20 text-center">
    <h1 class="text-5xl font-serif font-bold text-slate-900 mb-12 tracking-tight">
      {{ t('storefront.pages.contact.classic.heading') }}
    </h1>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
        <div class="space-y-4">
            <div class="w-12 h-12 bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Icon name="lucide:phone" class="w-5 h-5 text-slate-900" />
            </div>
            <h3 class="font-bold text-xs uppercase tracking-widest text-slate-900">{{ t('storefront.pages.contact.sections.callUs') }}</h3>
            <p class="text-slate-500 text-sm">0770 83 85 76</p>
        </div>
        <div class="space-y-4">
            <div class="w-12 h-12 bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Icon name="lucide:mail" class="w-5 h-5 text-slate-900" />
            </div>
            <h3 class="font-bold text-xs uppercase tracking-widest text-slate-900">{{ t('storefront.pages.contact.sections.emailUs') }}</h3>
            <p class="text-slate-500 text-sm">noukhba.contact@gmail.com</p>
        </div>
        <div class="space-y-4">
            <div class="w-12 h-12 bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Icon name="lucide:map-pin" class="w-5 h-5 text-slate-900" />
            </div>
            <h3 class="font-bold text-xs uppercase tracking-widest text-slate-900">{{ t('storefront.pages.contact.sections.visitUs') }}</h3>
            <p class="text-slate-500 text-sm">{{ t('storefront.pages.contact.addressPlaceholder') }}</p>
        </div>
    </div>
  </div>
</template>
