<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div class="p-6 border-b border-slate-100">
      <div class="flex items-center justify-between">
        <div>
           <h3 class="text-lg font-semibold text-slate-900">{{ t('admin.homepageSettingsForm.sections.title') }}</h3>
           <p class="mt-1 text-sm text-slate-500">{{ t('admin.homepageSettingsForm.sections.subtitle') }}</p>
        </div>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Browse by category -->
      <div class="border border-slate-200 rounded-xl overflow-hidden transition-all hover:border-slate-300 hover:shadow-sm" :class="{ 'bg-slate-50/50': !modelValue.browseByCategory.enabled }">
        <div class="p-4 flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-slate-800">{{ t('admin.homepageSettingsForm.sections.browseByCategory.title') }}</p>
            <p class="text-xs text-slate-500 mt-1">{{ t('admin.homepageSettingsForm.sections.browseByCategory.subtitle') }}</p>
          </div>
          <BaseToggle v-model="modelValue.browseByCategory.enabled" :sr-label="t('admin.homepageSettingsForm.sections.browseByCategory.toggle')"/>
        </div>
      </div>

      <!-- New arrivals -->
      <div class="border border-slate-200 rounded-xl overflow-hidden transition-all hover:border-slate-300 hover:shadow-sm" :class="{ 'bg-slate-50/50': !modelValue.newArrivals.enabled }">
        <div class="p-4 flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-slate-800">{{ t('admin.homepageSettingsForm.sections.newArrivals.title') }}</p>
            <p class="text-xs text-slate-500 mt-1">{{ t('admin.homepageSettingsForm.sections.newArrivals.subtitle') }}</p>
          </div>
          <BaseToggle v-model="modelValue.newArrivals.enabled" :sr-label="t('admin.homepageSettingsForm.sections.newArrivals.toggle')" />
        </div>
      </div>

      <!-- Best sellers -->
      <div class="border border-slate-200 rounded-xl overflow-hidden transition-all hover:border-slate-300 hover:shadow-sm" :class="{ 'bg-slate-50/50': !modelValue.bestSellers.enabled }">
        <div class="p-4 flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-slate-800">{{ t('admin.homepageSettingsForm.sections.bestSellers.title') }}</p>
            <p class="text-xs text-slate-500 mt-1">{{ t('admin.homepageSettingsForm.sections.bestSellers.subtitle') }}</p>
          </div>
          <BaseToggle v-model="modelValue.bestSellers.enabled" :sr-label="t('admin.homepageSettingsForm.sections.bestSellers.toggle')" />
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
