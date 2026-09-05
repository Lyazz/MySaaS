<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-xl font-semibold text-primary">{{ t('admin.pages.onboarding.template.title') }}</h2>
      <p class="mt-1 text-sm text-secondary">{{ t('admin.pages.onboarding.template.subtitle') }}</p>
    </div>

    <div class="space-y-3">
      <div class="relative">
        <Icon name="lucide:search" class="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted" />
        <input
          v-model="query"
          type="search"
          class="ui-input w-full py-2 pe-3 ps-9"
          :placeholder="t('admin.pages.onboarding.template.searchPlaceholder')"
        >
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="audience in AUDIENCES"
          :key="audience"
          type="button"
          class="rounded-full border px-3 py-1 text-mini font-medium transition-colors"
          :class="activeAudience === audience
            ? 'border-line-strong text-primary surface-2'
            : 'border-line text-tertiary hover:text-primary'"
          :aria-pressed="activeAudience === audience"
          @click="activeAudience = activeAudience === audience ? 'all' : audience"
        >
          {{ t(`admin.pages.onboarding.template.audiences.${audience}`) }}
        </button>
      </div>
    </div>

    <p v-if="!visibleTemplates.length" class="rounded-xl border border-line p-4 text-sm text-muted">
      {{ t('admin.common.noResults') }}
    </p>

    <div v-else class="grid grid-cols-2 gap-3">
      <button
        v-for="tpl in visibleTemplates"
        :key="tpl.key"
        type="button"
        class="group flex flex-col overflow-hidden rounded-xl border text-start transition-all"
        :class="modelValue.templateKey === tpl.key ? 'shadow-card' : 'border-line hover:border-line-strong'"
        :style="modelValue.templateKey === tpl.key ? { borderColor: tpl.color } : undefined"
        :aria-pressed="modelValue.templateKey === tpl.key"
        @click="emit('update:modelValue', { ...modelValue, templateKey: tpl.key })"
      >
        <!-- A miniature of the theme drawn from its own palette and typeface, so
             the card is honest about what the merchant is picking. -->
        <span class="flex h-24 flex-col justify-between p-2.5" :style="{ background: tpl.bg }">
          <span class="h-1 w-8 rounded-full" :style="{ background: tpl.color }" />
          <span
            class="block truncate text-mini font-semibold"
            :style="{ color: tpl.textColor, fontFamily: tpl.fontStyle }"
          >{{ tpl.sample }}</span>
          <span
            class="inline-block w-fit px-2 py-0.5 text-micro font-bold leading-none"
            :style="{ background: tpl.color, color: tpl.btnText, borderRadius: tpl.radius }"
          >{{ t('admin.pages.onboarding.template.buy') }}</span>
        </span>

        <span class="flex items-center justify-between gap-2 border-t border-line px-2.5 py-2 surface-1">
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold text-primary">{{ tpl.label }}</span>
            <span class="block truncate text-mini text-tertiary">{{ tpl.storeTypes }}</span>
          </span>
          <Icon
            v-if="modelValue.templateKey === tpl.key"
            name="lucide:check-circle-2"
            class="h-4 w-4 shrink-0 text-brand"
          />
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TEMPLATE_KEYS } from '~/components/storefront/templates/registry'
import { TEMPLATE_SPECIMENS, TEMPLATE_SPECIMEN_FONT_HREF } from './template-specimens'
import type { OnboardingDraft } from './types'

defineProps<{ modelValue: OnboardingDraft }>()
const emit = defineEmits<{ 'update:modelValue': [value: OnboardingDraft] }>()
const { t } = useI18n({ useScope: 'global' })

const AUDIENCES = ['fashion', 'beauty', 'food', 'tech', 'home', 'kids'] as const
type Audience = (typeof AUDIENCES)[number]

const query = ref('')
const activeAudience = ref<Audience | 'all'>('all')

// Four of these faces ship only inside the storefront theme that uses them, so
// the specimens would otherwise fall back to a system serif and misrepresent the
// theme being chosen.
useHead({ link: [{ rel: 'stylesheet', href: TEMPLATE_SPECIMEN_FONT_HREF }] })

const templates = computed(() =>
  TEMPLATE_KEYS.map((key) => {
    const spec = TEMPLATE_SPECIMENS[key]
    return {
      key,
      ...spec,
      sample: t(`admin.pages.onboarding.template.specimens.${key}`),
      storeTypes: t(`admin.appearanceSettingsForm.templates.options.${key}.storeTypes`)
    }
  })
)

const visibleTemplates = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return templates.value.filter((tpl) => {
    const matchesAudience = activeAudience.value === 'all' || tpl.audiences.includes(activeAudience.value)
    const matchesQuery =
      !needle ||
      tpl.label.toLowerCase().includes(needle) ||
      tpl.key.includes(needle) ||
      tpl.storeTypes.toLowerCase().includes(needle)
    return matchesAudience && matchesQuery
  })
})
</script>
