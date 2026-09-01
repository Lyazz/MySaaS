<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold text-primary">
      {{ t('admin.pages.onboarding.brand.title') }}
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.brand.pickColor') }}</label>
        <input
 :value="modelValue.primaryColor"
 type="color"
 class="h-12 w-full rounded-lg border border-line surface-2"
 
 @input="emit('update:modelValue', { ...modelValue, primaryColor: ($event.target as HTMLInputElement).value })"
>
      </div>
      <div>
        <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.brand.hexValue') }}</label>
        <input
          :value="modelValue.primaryColor"
          type="text"
          placeholder="#4F46E5"
          class="ui-input w-full px-3 py-2"
          @input="emit('update:modelValue', { ...modelValue, primaryColor: ($event.target as HTMLInputElement).value })"
        >
        <p class="mt-1 text-xs text-muted">
          {{ t('admin.pages.onboarding.brand.example', { value: '#4F46E5' }) }}
        </p>
      </div>
    </div>
    <div class="rounded-lg p-4 border border-line">
      <p class="text-sm mb-2 text-secondary">{{ t('admin.pages.onboarding.brand.preview') }}</p>
      <!-- eslint-disable-next-line vue/no-restricted-class -- preview of the colour the merchant just picked; the fill is theirs, not a token -->
      <button type="button" class="px-4 py-2 rounded-lg text-white font-medium" :style="{ backgroundColor: modelValue.primaryColor }">
        {{ t('admin.pages.onboarding.brand.primaryButton') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface OnboardingForm {
  name: string; logoUrl: string | null; description: string
  templateKey: string; primaryColor: string; language: string
  product: { name: string; price: number | null; imageUrl: string | null }
}
const props = defineProps<{ modelValue: OnboardingForm }>()
const emit = defineEmits<{ 'update:modelValue': [value: OnboardingForm] }>()
const { t } = useI18n({ useScope: 'global' })
</script>
