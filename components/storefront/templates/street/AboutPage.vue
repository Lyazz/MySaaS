<script setup lang="ts">
const tenant = useState<any>('tenant')
const storeSettings = useState<any>('storeSettings')
const { t } = useI18n({ useScope: 'global' })
const year = new Date().getFullYear()
</script>

<template>
  <div class="bg-white min-h-[80vh]">
    <div class="max-w-4xl mx-auto px-6 py-24 text-center">
        <!-- Badge -->
        <span class="inline-block bg-brand border-2 border-black px-4 py-1 font-street text-xl uppercase shadow-[4px_4px_0_0_#000] rotate-2 mb-12">
            {{ t('storefront.templates.street.about.since', { year }) }}
        </span>

        <h1 class="font-street text-7xl md:text-9xl mb-12 uppercase leading-none">
            {{ t('storefront.templates.street.about.titlePrefix') }}<br><span class="text-stroke-black text-transparent">{{ t('storefront.templates.street.about.titleAccent') }}</span>
        </h1>

        <div class="font-mono text-lg md:text-xl leading-relaxed text-gray-800 border-l-4 border-black pl-8 text-left space-y-8">
            <p>
                {{ storeSettings?.description || t('storefront.templates.street.about.descriptionFallback') }}
            </p>
            <p>
                {{ t('storefront.templates.street.about.missionPrefix') }} <strong>{{ t('storefront.templates.street.about.missionAccent') }}</strong>
            </p>
        </div>

        <div class="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div class="bg-black text-white p-6 border-2 border-black shadow-[8px_8px_0_0_var(--brand)]">
                <h3 class="font-street text-3xl mb-4 text-brand">{{ t('storefront.templates.street.about.values.quality.title') }}</h3>
                <p class="font-mono text-xs uppercase">{{ t('storefront.templates.street.about.values.quality.description') }}</p>
            </div>
            <div class="bg-white text-black p-6 border-2 border-black shadow-[8px_8px_0_0_#000]">
                <h3 class="font-street text-3xl mb-4">{{ t('storefront.templates.street.about.values.design.title') }}</h3>
                <p class="font-mono text-xs uppercase">{{ t('storefront.templates.street.about.values.design.description') }}</p>
            </div>
            <div class="bg-brand text-black p-6 border-2 border-black shadow-[8px_8px_0_0_#000]">
                <h3 class="font-street text-3xl mb-4">{{ t('storefront.templates.street.about.values.culture.title') }}</h3>
                <p class="font-mono text-xs uppercase">{{ t('storefront.templates.street.about.values.culture.description') }}</p>
            </div>
        </div>
    </div>
    
    <!-- Big Image Area -->
    <div class="h-96 w-full bg-black border-y-4 border-black relative overflow-hidden group">
         <img src="/blank.svg" class="w-full h-full object-cover opacity-50 grayscale group-hover:scale-105 transition-transform duration-1000" />
         <div class="absolute inset-0 flex items-center justify-center">
             <span class="font-street text-white text-[10vw] uppercase opacity-20 group-hover:opacity-40 transition-opacity select-none">{{ t('storefront.templates.street.about.heroText') }}</span>
         </div>
    </div>
  </div>
</template>

<style scoped>
.text-stroke-black {
    -webkit-text-stroke: 2px black;
}
</style>
