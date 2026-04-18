<template>
  <div class="rounded-2xl overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
    <div class="p-6" style="border-bottom: 1px solid var(--surface-border); background: var(--surface-2)">
      <div class="flex items-center justify-between">
        <div>
           <h3 class="text-lg font-bold" style="color: var(--text-primary)">{{ t('admin.homepageSettingsForm.sections.title') }}</h3>
           <p class="mt-1 text-sm" style="color: var(--text-tertiary)">{{ t('admin.homepageSettingsForm.sections.subtitle') }}</p>
        </div>
      </div>
    </div>

    <div class="p-6 space-y-6">
      
      <!-- Browse by category -->
      <div class="rounded-xl transition-all duration-300" :style="modelValue.browseByCategory.enabled ? 'border: 1px solid rgba(var(--brand-rgb) / 0.4); background: var(--surface-1)' : 'border: 1px solid var(--surface-border); background: var(--surface-2)'">
        <div class="p-5 flex items-center justify-between gap-4 cursor-pointer select-none" @click="modelValue.browseByCategory.enabled = !modelValue.browseByCategory.enabled" :style="modelValue.browseByCategory.enabled ? 'background: rgba(var(--brand-rgb) / 0.08); border-bottom: 1px solid rgba(var(--brand-rgb) / 0.2); border-radius: 0.75rem 0.75rem 0 0' : ''">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="modelValue.browseByCategory.enabled ? 'bg-teal-900/40 text-teal-400' : ''" :style="!modelValue.browseByCategory.enabled ? 'background: var(--surface-3); color: var(--text-muted)' : ''">
               <Icon name="lucide:layout-grid" class="w-5 h-5" />
            </div>
            <div>
              <p class="text-base font-bold" style="color: var(--text-primary)">{{ t('admin.homepageSettingsForm.sections.browseByCategory.title') }}</p>
              <p class="text-sm" style="color: var(--text-tertiary)">{{ t('admin.homepageSettingsForm.sections.browseByCategory.subtitle') }}</p>
            </div>
          </div>
          <BaseToggle v-model="modelValue.browseByCategory.enabled" :sr-label="t('admin.homepageSettingsForm.sections.browseByCategory.toggle')" @click.stop/>
        </div>
        
        <!-- Expanded Settings -->
        <div v-show="modelValue.browseByCategory.enabled" class="p-5 rounded-b-xl animate-fadeIn" style="background: var(--surface-1); border-top: 1px solid var(--surface-border)">
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
      <div class="rounded-xl transition-all duration-300" :style="modelValue.newArrivals.enabled ? 'border: 1px solid rgba(var(--brand-rgb) / 0.4); background: var(--surface-1)' : 'border: 1px solid var(--surface-border); background: var(--surface-2)'">
        <div class="p-5 flex items-center justify-between gap-4 cursor-pointer select-none" @click="modelValue.newArrivals.enabled = !modelValue.newArrivals.enabled" :style="modelValue.newArrivals.enabled ? 'background: rgba(var(--brand-rgb) / 0.08); border-bottom: 1px solid rgba(var(--brand-rgb) / 0.2); border-radius: 0.75rem 0.75rem 0 0' : ''">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="modelValue.newArrivals.enabled ? 'bg-teal-900/40 text-teal-400' : ''" :style="!modelValue.newArrivals.enabled ? 'background: var(--surface-3); color: var(--text-muted)' : ''">
               <Icon name="lucide:sparkles" class="w-5 h-5" />
            </div>
            <div>
              <p class="text-base font-bold" style="color: var(--text-primary)">{{ t('admin.homepageSettingsForm.sections.newArrivals.title') }}</p>
              <p class="text-sm" style="color: var(--text-tertiary)">{{ t('admin.homepageSettingsForm.sections.newArrivals.subtitle') }}</p>
            </div>
          </div>
          <BaseToggle v-model="modelValue.newArrivals.enabled" :sr-label="t('admin.homepageSettingsForm.sections.newArrivals.toggle')" @click.stop/>
        </div>

        <!-- Expanded Settings -->
        <div v-show="modelValue.newArrivals.enabled" class="p-5 rounded-b-xl animate-fadeIn" style="background: var(--surface-1); border-top: 1px solid var(--surface-border)">
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
      <div class="rounded-xl transition-all duration-300" :style="modelValue.bestSellers.enabled ? 'border: 1px solid rgba(var(--brand-rgb) / 0.4); background: var(--surface-1)' : 'border: 1px solid var(--surface-border); background: var(--surface-2)'">
        <div class="p-5 flex items-center justify-between gap-4 cursor-pointer select-none" @click="modelValue.bestSellers.enabled = !modelValue.bestSellers.enabled" :style="modelValue.bestSellers.enabled ? 'background: rgba(var(--brand-rgb) / 0.08); border-bottom: 1px solid rgba(var(--brand-rgb) / 0.2); border-radius: 0.75rem 0.75rem 0 0' : ''">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="modelValue.bestSellers.enabled ? 'bg-teal-900/40 text-teal-400' : ''" :style="!modelValue.bestSellers.enabled ? 'background: var(--surface-3); color: var(--text-muted)' : ''">
               <Icon name="lucide:award" class="w-5 h-5" />
            </div>
            <div>
              <p class="text-base font-bold" style="color: var(--text-primary)">{{ t('admin.homepageSettingsForm.sections.bestSellers.title') }}</p>
              <p class="text-sm" style="color: var(--text-tertiary)">{{ t('admin.homepageSettingsForm.sections.bestSellers.subtitle') }}</p>
            </div>
          </div>
          <BaseToggle v-model="modelValue.bestSellers.enabled" :sr-label="t('admin.homepageSettingsForm.sections.bestSellers.toggle')" @click.stop/>
        </div>

        <!-- Expanded Settings -->
        <div v-show="modelValue.bestSellers.enabled" class="p-5 rounded-b-xl animate-fadeIn" style="background: var(--surface-1); border-top: 1px solid var(--surface-border)">
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
