<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-semibold text-primary">{{ t('admin.pages.onboarding.brand.title') }}</h2>
      <p class="mt-1 text-sm text-secondary">{{ t('admin.pages.onboarding.brand.subtitle') }}</p>
    </div>

    <div>
      <p class="ui-label mb-2">{{ t('admin.pages.onboarding.brand.suggested') }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="swatch in SWATCHES"
          :key="swatch"
          type="button"
          class="h-9 w-9 rounded-full border-2 transition-transform hover:scale-110"
          :class="isSelected(swatch) ? 'border-line-strong' : 'border-line'"
          :style="{ background: swatch }"
          :aria-label="swatch"
          :aria-pressed="isSelected(swatch)"
          @click="select(swatch)"
        />
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <UiField :label="t('admin.pages.onboarding.brand.pickColor')">
        <template #default="{ fieldId }">
          <input
            :id="fieldId"
            :value="modelValue.primaryColor"
            type="color"
            class="h-11 w-full rounded-lg border border-line surface-2"
            @input="select(($event.target as HTMLInputElement).value)"
          >
        </template>
      </UiField>

      <UiField :label="t('admin.pages.onboarding.brand.hexValue')" :error="hexError">
        <template #default="{ fieldId }">
          <input
            :id="fieldId"
            :value="modelValue.primaryColor"
            type="text"
            spellcheck="false"
            maxlength="7"
            placeholder="#0D9488"
            class="ui-input w-full px-3 py-2 font-mono-nums"
            @input="onHexInput(($event.target as HTMLInputElement).value)"
          >
        </template>
      </UiField>
    </div>

    <!--
      Contrast is the one thing a merchant cannot see coming: a pale brand colour
      makes every button on their storefront unreadable, and they find out from a
      customer. Checked against WCAG AA for large text.
    -->
    <div v-if="contrastWarning" class="flex items-start gap-2.5 rounded-xl border border-line p-3 surface-2">
      <Icon name="lucide:triangle-alert" class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p class="text-mini text-secondary">{{ t('admin.pages.onboarding.brand.contrastWarning') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OnboardingDraft } from './types'

const props = defineProps<{ modelValue: OnboardingDraft }>()
const emit = defineEmits<{ 'update:modelValue': [value: OnboardingDraft] }>()
const { t } = useI18n({ useScope: 'global' })

const SWATCHES = ['#0D9488', '#4F46E5', '#DB2777', '#EA580C', '#65A30D', '#0EA5E9', '#7C3AED', '#18181B']

const hexError = ref('')

const isSelected = (value: string) =>
  props.modelValue.primaryColor.toUpperCase() === value.toUpperCase()

function select(value: string) {
  hexError.value = ''
  emit('update:modelValue', { ...props.modelValue, primaryColor: value.toUpperCase() })
}

function onHexInput(raw: string) {
  const value = raw.startsWith('#') ? raw : `#${raw}`
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    // Keep the keystroke visible, but say why it will not be saved. The server
    // rejects anything that is not a six-digit hex, so failing here is kinder.
    hexError.value = t('admin.pages.onboarding.brand.hexInvalid')
    emit('update:modelValue', { ...props.modelValue, primaryColor: value })
    return
  }
  select(value)
}

/** Relative luminance per WCAG 2.1, used for the contrast check below. */
function luminance(hex: string): number | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

const contrastWarning = computed(() => {
  const l = luminance(props.modelValue.primaryColor)
  if (l === null) return false
  const againstWhite = 1.05 / (l + 0.05)
  const againstBlack = (l + 0.05) / 0.05
  return Math.max(againstWhite, againstBlack) < 3
})
</script>
