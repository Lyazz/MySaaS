<script setup lang="ts">
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || 'Store')

useTenantSeo({
  title: `Contact - ${tenantName.value}`,
  description: `Contact ${tenantName.value}.`
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-20 text-center">
    <h1 class="text-5xl font-serif font-bold text-slate-900 mb-12 tracking-tight">
      Get in Touch
    </h1>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
        <div class="space-y-4">
            <div class="w-12 h-12 bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Icon name="lucide:phone" class="w-5 h-5 text-slate-900" />
            </div>
            <h3 class="font-bold text-xs uppercase tracking-widest text-slate-900">Call Us</h3>
            <p class="text-slate-500 text-sm">0770 83 85 76</p>
        </div>
        <div class="space-y-4">
            <div class="w-12 h-12 bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Icon name="lucide:mail" class="w-5 h-5 text-slate-900" />
            </div>
            <h3 class="font-bold text-xs uppercase tracking-widest text-slate-900">Email Us</h3>
            <p class="text-slate-500 text-sm">noukhba.contact@gmail.com</p>
        </div>
        <div class="space-y-4">
            <div class="w-12 h-12 bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Icon name="lucide:map-pin" class="w-5 h-5 text-slate-900" />
            </div>
            <h3 class="font-bold text-xs uppercase tracking-widest text-slate-900">Visit Us</h3>
            <p class="text-slate-500 text-sm">123 Store St, City, Country</p>
        </div>
    </div>
  </div>
</template>
