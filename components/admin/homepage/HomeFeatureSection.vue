<template>
  <div class="feature-list">
    <div
      v-for="entry in entries"
      :key="entry.key"
      class="feature-card"
      :class="{ 'is-enabled': modelValue[entry.key].enabled }"
    >
      <button
        type="button"
        class="feature-head"
        @click="toggle(entry.key)"
      >
        <div class="feature-head-left">
          <div class="feature-icon" :class="{ 'is-active': modelValue[entry.key].enabled }">
            <Icon :name="entry.icon" class="w-4 h-4" />
          </div>
          <div class="feature-titles">
            <p class="feature-title">{{ t(entry.titleKey) }}</p>
            <p class="feature-subtitle">{{ t(entry.subtitleKey) }}</p>
          </div>
        </div>
        <div class="feature-head-right" @click.stop>
          <BaseToggle
            v-model="modelValue[entry.key].enabled"
            :sr-label="t(entry.toggleKey)"
          />
        </div>
      </button>

      <div v-show="modelValue[entry.key].enabled" class="feature-body">
        <div :class="entry.fields === 3 ? 'feature-grid-3' : 'feature-grid-2'">
          <BaseInput
            v-model="modelValue[entry.key].eyebrow"
            :label="t('admin.homepageSettingsForm.fields.eyebrow') || 'Eyebrow text'"
            :placeholder="entry.eyebrowPlaceholder"
          />
          <BaseInput
            v-model="modelValue[entry.key].title"
            :label="t('admin.homepageSettingsForm.fields.sectionTitle') || 'Section title'"
            :placeholder="entry.titlePlaceholder"
          />
          <BaseInput
            v-if="entry.fields === 3"
            :model-value="getLimit(entry.key)"
            type="number"
            :label="t('admin.homepageSettingsForm.fields.numberOfProducts') || 'Number of products'"
            min="2"
            max="12"
            @update:model-value="(v) => setLimit(entry.key, v)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

type SectionKey = keyof StorefrontHomeConfig['sections']

interface Entry {
  key: SectionKey
  icon: string
  titleKey: string
  subtitleKey: string
  toggleKey: string
  eyebrowPlaceholder: string
  titlePlaceholder: string
  fields: 2 | 3
}

const entries: Entry[] = [
  {
    key: 'browseByCategory',
    icon: 'lucide:layout-grid',
    titleKey: 'admin.homepageSettingsForm.sections.browseByCategory.title',
    subtitleKey: 'admin.homepageSettingsForm.sections.browseByCategory.subtitle',
    toggleKey: 'admin.homepageSettingsForm.sections.browseByCategory.toggle',
    eyebrowPlaceholder: 'Collections',
    titlePlaceholder: 'Browse by Category',
    fields: 2
  },
  {
    key: 'newArrivals',
    icon: 'lucide:sparkles',
    titleKey: 'admin.homepageSettingsForm.sections.newArrivals.title',
    subtitleKey: 'admin.homepageSettingsForm.sections.newArrivals.subtitle',
    toggleKey: 'admin.homepageSettingsForm.sections.newArrivals.toggle',
    eyebrowPlaceholder: 'New Arrivals',
    titlePlaceholder: 'Trending Now',
    fields: 3
  },
  {
    key: 'bestSellers',
    icon: 'lucide:award',
    titleKey: 'admin.homepageSettingsForm.sections.bestSellers.title',
    subtitleKey: 'admin.homepageSettingsForm.sections.bestSellers.subtitle',
    toggleKey: 'admin.homepageSettingsForm.sections.bestSellers.toggle',
    eyebrowPlaceholder: 'Best Sellers',
    titlePlaceholder: 'Most Popular',
    fields: 3
  }
]

function toggle(key: SectionKey) {
  const next = { ...props.modelValue, [key]: { ...props.modelValue[key], enabled: !props.modelValue[key].enabled } }
  emit('update:modelValue', next)
}

function getLimit(key: SectionKey): number {
  const section = props.modelValue[key] as { limit?: number }
  return section.limit ?? 6
}

function setLimit(key: SectionKey, value: unknown) {
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num)) return
  const target = props.modelValue[key] as { limit?: number }
  target.limit = num
}
</script>

<style scoped>
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-card {
  background: var(--surface-1);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.feature-card.is-enabled {
  border-color: color-mix(in srgb, var(--surface-border) 30%, var(--text-secondary));
}

.feature-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  gap: 14px;
  transition: background 0.15s ease;
}

.feature-head:hover {
  background: var(--nav-hover-bg);
}

.feature-card.is-enabled .feature-head {
  background: var(--surface-2);
  border-bottom: 1px solid var(--surface-border);
}

.feature-head-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.feature-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--surface-3);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.feature-icon.is-active {
  background: color-mix(in srgb, var(--brand) 18%, transparent);
  color: var(--brand);
}

.feature-titles {
  min-width: 0;
}

.feature-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.feature-subtitle {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--text-tertiary);
}

.feature-head-right {
  flex-shrink: 0;
}

.feature-body {
  padding: 16px;
  background: var(--surface-2);
  animation: fadeSlide 0.18s ease-out forwards;
}

.feature-grid-2,
.feature-grid-3 {
  display: grid;
  gap: 12px;
}

.feature-grid-2 {
  grid-template-columns: 1fr 1fr;
}

.feature-grid-3 {
  grid-template-columns: 1fr 1fr 1fr;
}

@media (max-width: 720px) {
  .feature-grid-2,
  .feature-grid-3 {
    grid-template-columns: 1fr;
  }
}

@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
