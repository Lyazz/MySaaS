<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-semibold text-primary">{{ t('admin.pages.onboarding.delivery.title') }}</h2>
      <p class="mt-1 text-sm text-secondary">{{ t('admin.pages.onboarding.delivery.subtitle') }}</p>
    </div>

    <div class="space-y-2">
      <button
        v-for="option in OPTIONS"
        :key="option.key"
        type="button"
        class="flex w-full items-start gap-3 rounded-xl border p-3.5 text-start transition-colors"
        :class="isOn(option.key) ? 'border-line-strong surface-2' : 'border-line hover:border-line-strong'"
        :aria-pressed="isOn(option.key)"
        @click="toggle(option.key)"
      >
        <span
          class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-colors"
          :class="isOn(option.key) ? 'border-transparent text-brand-contrast' : 'border-line-strong'"
          :style="isOn(option.key) ? { background: 'var(--brand)' } : undefined"
        >
          <Icon v-if="isOn(option.key)" name="lucide:check" class="h-3 w-3" />
        </span>

        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2">
            <Icon :name="option.icon" class="h-4 w-4 text-tertiary" />
            <span class="text-sm font-semibold text-primary">
              {{ t(`admin.pages.onboarding.delivery.options.${option.key}.label`) }}
            </span>
          </span>
          <span class="mt-1 block text-mini text-tertiary">
            {{ t(`admin.pages.onboarding.delivery.options.${option.key}.hint`) }}
          </span>
        </span>
      </button>
    </div>

    <!--
      Carrier credentials are a settings job, not an onboarding one: they need an
      account, an API token and a wilaya price grid. Choosing the carrier here is
      enough to make the store publishable; connecting it can wait.
    -->
    <p v-if="hasCarrier" class="flex items-start gap-2.5 rounded-xl border border-line p-3 text-mini text-secondary surface-2">
      <Icon name="lucide:info" class="mt-0.5 h-4 w-4 shrink-0 text-tertiary" />
      <span>
        {{ t('admin.pages.onboarding.delivery.carrierNote') }}
        <NuxtLink to="/admin/delivery" class="underline">{{ t('admin.pages.delivery.title') }}</NuxtLink>
      </span>
    </p>

    <p v-if="!hasAny" class="text-mini text-muted">
      {{ t('admin.pages.onboarding.delivery.required') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { OnboardingDraft } from './types'

const props = defineProps<{ modelValue: OnboardingDraft }>()
const emit = defineEmits<{ 'update:modelValue': [value: OnboardingDraft] }>()
const { t } = useI18n({ useScope: 'global' })

const OPTIONS = [
  { key: 'SELF', icon: 'lucide:bike' },
  { key: 'PICKUP', icon: 'lucide:store' },
  { key: 'MAYSTRO', icon: 'lucide:truck' },
  { key: 'YALIDINE', icon: 'lucide:truck' }
] as const

type OptionKey = (typeof OPTIONS)[number]['key']

const isOn = (key: OptionKey) =>
  key === 'PICKUP'
    ? props.modelValue.storePickupEnabled
    : props.modelValue.deliveryProviders.includes(key)

const hasCarrier = computed(() =>
  props.modelValue.deliveryProviders.some((p) => p === 'MAYSTRO' || p === 'YALIDINE')
)

const hasAny = computed(
  () => props.modelValue.deliveryProviders.length > 0 || props.modelValue.storePickupEnabled
)

function toggle(key: OptionKey) {
  if (key === 'PICKUP') {
    emit('update:modelValue', { ...props.modelValue, storePickupEnabled: !props.modelValue.storePickupEnabled })
    return
  }

  const current = props.modelValue.deliveryProviders
  const next = current.includes(key) ? current.filter((p) => p !== key) : [...current, key]
  emit('update:modelValue', { ...props.modelValue, deliveryProviders: next })
}
</script>
