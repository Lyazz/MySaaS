<template>
  <div class="hero-section">
    <div class="hero-section-toolbar">
      <div class="hero-section-meta">
        <span class="hero-section-count">{{ slides.length }}</span>
        <span class="hero-section-count-label">
          {{ slides.length === 1 ? (t('admin.homepageSettingsForm.carousel.slide') || 'slide') : (t('admin.homepageSettingsForm.carousel.slides') || 'slides') }}
        </span>
      </div>
      <button
        type="button"
        class="hero-section-add"
        :disabled="slides.length >= 10"
        @click="addSlide"
      >
        <Icon name="lucide:plus" class="w-3.5 h-3.5" />
        {{ t('admin.homepageSettingsForm.carousel.addSlide') }}
      </button>
    </div>

    <div v-if="slides.length === 0" class="hero-empty">
      <Icon name="lucide:image-off" class="hero-empty-icon" />
      <p class="hero-empty-title">{{ t('admin.homepageSettingsForm.carousel.noSlides') }}</p>
      <button type="button" class="hero-empty-cta" @click="addSlide">
        {{ t('admin.homepageSettingsForm.carousel.createFirst') }}
      </button>
    </div>

    <div v-else class="hero-list">
      <div
        v-for="(slide, index) in slides"
        :key="'slide-' + index"
        class="hero-item"
        :class="{ 'is-expanded': expandedSlideIndex === index }"
      >
        <button
          type="button"
          class="hero-item-head"
          @click="toggleSlide(index)"
        >
          <div class="hero-item-controls" @click.stop>
            <button
              type="button"
              class="hero-item-control"
              :disabled="index === 0"
              @click="moveSlide(index, -1)"
              :aria-label="t('admin.common.moveUp') || 'Move up'"
            >
              <Icon name="lucide:chevron-up" class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="hero-item-control"
              :disabled="index === slides.length - 1"
              @click="moveSlide(index, 1)"
              :aria-label="t('admin.common.moveDown') || 'Move down'"
            >
              <Icon name="lucide:chevron-down" class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="hero-item-thumb">
            <img v-if="slide.imageUrl" :src="slide.imageUrl" alt="" />
            <Icon v-else name="lucide:image" class="w-4 h-4" />
          </div>

          <div class="hero-item-titles">
            <p class="hero-item-title">{{ slide.title || t('admin.homepageSettingsForm.carousel.untitled') }}</p>
            <p class="hero-item-subtitle">{{ t('admin.homepageSettingsForm.carousel.slide') || 'Slide' }} {{ index + 1 }}</p>
          </div>

          <div class="hero-item-actions" @click.stop>
            <button
              type="button"
              class="hero-item-delete"
              :title="t('admin.common.delete')"
              @click="removeSlide(index)"
            >
              <Icon name="lucide:trash-2" class="w-3.5 h-3.5" />
            </button>
            <Icon
              name="lucide:chevron-down"
              class="hero-item-chevron"
              :class="{ 'is-open': expandedSlideIndex === index }"
            />
          </div>
        </button>

        <div v-show="expandedSlideIndex === index" class="hero-item-body">
          <div class="hero-item-grid">
            <div class="hero-item-image">
              <ImageUploader
                v-model="slide.imageUrl"
                mode="generic"
                :label="t('admin.homepageSettingsForm.fields.imageUrl')"
                :hint="t('admin.homepageSettingsForm.fields.imageUrlHint')"
              />
            </div>
            <div class="hero-item-fields">
              <BaseInput
                v-model="slide.title"
                :label="t('admin.homepageSettingsForm.fields.title')"
                placeholder="e.g. Summer Collection"
              />
              <BaseInput
                v-model="slide.subtitle"
                :label="t('admin.homepageSettingsForm.fields.subtitle')"
                placeholder="e.g. Up to 50% off"
              />
              <div class="hero-item-fields-row">
                <BaseInput
                  v-model="slide.buttonText"
                  :label="t('admin.homepageSettingsForm.fields.buttonText')"
                  placeholder="Shop Now"
                />
                <BaseInput
                  v-model="slide.buttonHref"
                  :label="t('admin.homepageSettingsForm.fields.buttonLink')"
                  placeholder="/collections/summer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseInput from '~/components/ui/BaseInput.vue'
import ImageUploader from '~/components/admin/ImageUploader.vue'
import type { StorefrontHomeCarouselSlide } from '~/shared/storefront/homepage'

const props = defineProps<{
  modelValue: StorefrontHomeCarouselSlide[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: StorefrontHomeCarouselSlide[]): void
}>()

const { t } = useI18n({ useScope: 'global' })
const expandedSlideIndex = ref<number | null>(0)

const slides = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const toggleSlide = (index: number) => {
  expandedSlideIndex.value = expandedSlideIndex.value === index ? null : index
}

const addSlide = () => {
  if (slides.value.length >= 10) return
  slides.value.push({
    title: '',
    subtitle: '',
    buttonText: t('storefront.home.cta.shopNow'),
    buttonHref: '/products',
    imageUrl: ''
  })
  expandedSlideIndex.value = slides.value.length - 1
}

const removeSlide = (index: number) => {
  if (confirm(t('admin.common.confirmDelete'))) {
    slides.value.splice(index, 1)
    if (expandedSlideIndex.value === index) expandedSlideIndex.value = null
  }
}

const moveSlide = (index: number, direction: number) => {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= slides.value.length) return

  const newSlides = [...slides.value]
  const temp = newSlides[index]
  newSlides[index] = newSlides[newIndex]
  newSlides[newIndex] = temp
  slides.value = newSlides

  if (expandedSlideIndex.value === index) expandedSlideIndex.value = newIndex
  else if (expandedSlideIndex.value === newIndex) expandedSlideIndex.value = index
}
</script>

<style scoped>
.hero-section-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.hero-section-meta {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.hero-section-count {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.hero-section-count-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.hero-section-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 9px;
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.hero-section-add:hover:not(:disabled) {
  background: var(--nav-hover-bg);
  border-color: rgba(var(--brand-rgb) / 0.4);
}

.hero-section-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hero-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 56px 20px;
  background: var(--surface-1);
  border: 1px dashed var(--surface-border);
  border-radius: 14px;
  text-align: center;
}

.hero-empty-icon {
  width: 36px;
  height: 36px;
  color: var(--text-muted);
}

.hero-empty-title {
  font-size: 13.5px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.hero-empty-cta {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 0;
  transition: opacity 0.15s ease;
}

.hero-empty-cta:hover {
  opacity: 0.8;
}

.hero-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hero-item {
  background: var(--surface-1);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.15s ease;
}

.hero-item.is-expanded {
  border-color: color-mix(in srgb, var(--surface-border) 30%, var(--text-secondary));
}

.hero-item-head {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.hero-item-head:hover {
  background: var(--nav-hover-bg);
}

.hero-item.is-expanded .hero-item-head {
  background: var(--surface-2);
  border-bottom: 1px solid var(--surface-border);
}

.hero-item-controls {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.hero-item:hover .hero-item-controls,
.hero-item.is-expanded .hero-item-controls {
  opacity: 1;
}

.hero-item-control {
  width: 22px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.hero-item-control:hover:not(:disabled) {
  background: var(--surface-3);
  color: var(--text-primary);
}

.hero-item-control:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.hero-item-thumb {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-3);
  border: 1px solid var(--surface-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.hero-item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-item-titles {
  flex: 1;
  min-width: 0;
}

.hero-item-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-item-subtitle {
  font-size: 11.5px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.hero-item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.hero-item-delete {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.hero-item-delete:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
}

.hero-item-chevron {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  transition: transform 0.2s ease;
}

.hero-item-chevron.is-open {
  transform: rotate(180deg);
}

.hero-item-body {
  padding: 18px 16px;
  background: var(--surface-2);
  animation: fadeSlide 0.2s ease-out forwards;
}

.hero-item-grid {
  display: grid;
  grid-template-columns: minmax(180px, 280px) 1fr;
  gap: 18px;
}

@media (max-width: 760px) {
  .hero-item-grid {
    grid-template-columns: 1fr;
  }
}

.hero-item-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.hero-item-fields-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 480px) {
  .hero-item-fields-row {
    grid-template-columns: 1fr;
  }
}

@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
