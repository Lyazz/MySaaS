<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold text-primary">
      {{ t('admin.pages.onboarding.language.title') }}
    </h3>
    <div>
      <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.language.label') }}</label>
      <BaseSelect :value="modelValue.language" @change="onLanguageChange">
        <option v-for="l in languages" :key="l.key" :value="l.key">{{ l.label }}</option>
      </BaseSelect>
      <p class="mt-1 text-xs text-muted">
        {{ t('admin.pages.onboarding.language.rtlHint') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseSelect from '~/components/ui/BaseSelect.vue'

interface OnboardingForm {
  name: string; logoUrl: string | null; description: string
  templateKey: string; primaryColor: string; language: string
  product: { name: string; price: number | null; imageUrl: string | null }
}
const props = defineProps<{ modelValue: OnboardingForm }>()
const emit = defineEmits<{ 'update:modelValue': [value: OnboardingForm] }>()
const { t, setLocale } = useI18n({ useScope: 'global' })

const languages = [
  { key: 'ar', label: `${t('i18n.locales.ar')} (AR)` },
  { key: 'fr', label: `${t('i18n.locales.fr')} (FR)` },
  { key: 'en', label: `${t('i18n.locales.en')} (EN)` },
]

async function onLanguageChange(event: Event) {
  const lang = (event.target as HTMLSelectElement).value
  emit('update:modelValue', { ...props.modelValue, language: lang })
  try { await setLocale(lang as any) } catch {}
}
</script>
