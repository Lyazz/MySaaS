<template>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <div class="p-6 border-b border-slate-100 bg-slate-50/50">
      <div class="flex items-center justify-between">
        <div>
           <h3 class="text-lg font-bold text-slate-800">{{ t('admin.homepageSettingsForm.sections.title') }}</h3>
           <p class="mt-1 text-sm text-slate-500">{{ t('admin.homepageSettingsForm.sections.subtitle') }}</p>
        </div>
      </div>
    </div>

    <div class="p-6 space-y-6">
      
      <!-- Browse by category -->
      <div class="border rounded-xl transition-all duration-300" :class="modelValue.browseByCategory.enabled ? 'border-teal-200 shadow-md ring-1 ring-teal-50' : 'border-slate-200 bg-slate-50'">
        <div class="p-5 flex items-center justify-between gap-4 cursor-pointer select-none" @click="modelValue.browseByCategory.enabled = !modelValue.browseByCategory.enabled" :class="{ 'border-b border-teal-100 bg-teal-50/30 rounded-t-xl': modelValue.browseByCategory.enabled }">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="modelValue.browseByCategory.enabled ? 'bg-teal-100 text-teal-600' : 'bg-slate-200 text-slate-400'">
               <Icon name="lucide:layout-grid" class="w-5 h-5" />
            </div>
            <div>
              <p class="text-base font-bold text-slate-800">{{ t('admin.homepageSettingsForm.sections.browseByCategory.title') }}</p>
              <p class="text-sm text-slate-500">{{ t('admin.homepageSettingsForm.sections.browseByCategory.subtitle') }}</p>
            </div>
          </div>
          <BaseToggle v-model="modelValue.browseByCategory.enabled" :sr-label="t('admin.homepageSettingsForm.sections.browseByCategory.toggle')" @click.stop/>
        </div>
        
        <!-- Expanded Settings -->
        <div v-show="modelValue.browseByCategory.enabled" class="p-5 bg-white rounded-b-xl animate-fadeIn border-t border-slate-100">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
             <BaseInput 
                v-model="modelValue.browseByCategory.eyebrow" 
                label="Eyebrow Text" 
                placeholder="e.g. Collections" 
             />
             <BaseInput 
                v-model="modelValue.browseByCategory.title" 
                label="Section Title" 
                placeholder="e.g. Browse by Category" 
             />
          </div>
        </div>
      </div>

      <!-- New arrivals -->
      <div class="border rounded-xl transition-all duration-300" :class="modelValue.newArrivals.enabled ? 'border-teal-200 shadow-md ring-1 ring-teal-50' : 'border-slate-200 bg-slate-50'">
        <div class="p-5 flex items-center justify-between gap-4 cursor-pointer select-none" @click="modelValue.newArrivals.enabled = !modelValue.newArrivals.enabled" :class="{ 'border-b border-teal-100 bg-teal-50/30 rounded-t-xl': modelValue.newArrivals.enabled }">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="modelValue.newArrivals.enabled ? 'bg-teal-100 text-teal-600' : 'bg-slate-200 text-slate-400'">
               <Icon name="lucide:sparkles" class="w-5 h-5" />
            </div>
            <div>
              <p class="text-base font-bold text-slate-800">{{ t('admin.homepageSettingsForm.sections.newArrivals.title') }}</p>
              <p class="text-sm text-slate-500">{{ t('admin.homepageSettingsForm.sections.newArrivals.subtitle') }}</p>
            </div>
          </div>
          <BaseToggle v-model="modelValue.newArrivals.enabled" :sr-label="t('admin.homepageSettingsForm.sections.newArrivals.toggle')" @click.stop/>
        </div>

        <!-- Expanded Settings -->
        <div v-show="modelValue.newArrivals.enabled" class="p-5 bg-white rounded-b-xl animate-fadeIn border-t border-slate-100">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
             <BaseInput 
                v-model="modelValue.newArrivals.eyebrow" 
                label="Eyebrow Text" 
                placeholder="e.g. New Arrivals" 
             />
             <BaseInput 
                v-model="modelValue.newArrivals.title" 
                label="Section Title" 
                placeholder="e.g. Trending Now" 
             />
             <BaseInput 
                v-model.number="modelValue.newArrivals.limit" 
                type="number"
                label="Number of Products" 
                min="2" max="12"
             />
          </div>
        </div>
      </div>

      <!-- Best sellers -->
      <div class="border rounded-xl transition-all duration-300" :class="modelValue.bestSellers.enabled ? 'border-teal-200 shadow-md ring-1 ring-teal-50' : 'border-slate-200 bg-slate-50'">
        <div class="p-5 flex items-center justify-between gap-4 cursor-pointer select-none" @click="modelValue.bestSellers.enabled = !modelValue.bestSellers.enabled" :class="{ 'border-b border-teal-100 bg-teal-50/30 rounded-t-xl': modelValue.bestSellers.enabled }">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="modelValue.bestSellers.enabled ? 'bg-teal-100 text-teal-600' : 'bg-slate-200 text-slate-400'">
               <Icon name="lucide:award" class="w-5 h-5" />
            </div>
            <div>
              <p class="text-base font-bold text-slate-800">{{ t('admin.homepageSettingsForm.sections.bestSellers.title') }}</p>
              <p class="text-sm text-slate-500">{{ t('admin.homepageSettingsForm.sections.bestSellers.subtitle') }}</p>
            </div>
          </div>
          <BaseToggle v-model="modelValue.bestSellers.enabled" :sr-label="t('admin.homepageSettingsForm.sections.bestSellers.toggle')" @click.stop/>
        </div>

        <!-- Expanded Settings -->
        <div v-show="modelValue.bestSellers.enabled" class="p-5 bg-white rounded-b-xl animate-fadeIn border-t border-slate-100">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
             <BaseInput 
                v-model="modelValue.bestSellers.eyebrow" 
                label="Eyebrow Text" 
                placeholder="e.g. Best Sellers" 
             />
             <BaseInput 
                v-model="modelValue.bestSellers.title" 
                label="Section Title" 
                placeholder="e.g. Most Popular" 
             />
             <BaseInput 
                v-model.number="modelValue.bestSellers.limit" 
                type="number"
                label="Number of Products" 
                min="2" max="12"
             />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '~/components/ui/BaseInput.vue'
import BaseToggle from '~/components/ui/BaseToggle.vue'
import type { StorefrontHomeConfig } from '~/shared/storefront/homepage'

const props = defineProps<{
  modelValue: StorefrontHomeConfig['sections']
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: StorefrontHomeConfig['sections']): void
}>()

const { t } = useI18n({ useScope: 'global' })
</script>

<style scoped>
.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
