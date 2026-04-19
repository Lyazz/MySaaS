<template>
  <div class="rounded-2xl overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
    <div class="p-6" style="border-bottom: 1px solid var(--surface-border); background: var(--surface-2)">
      <div class="flex items-center justify-between">
        <div>
           <h3 class="text-lg font-bold" style="color: var(--text-primary)">{{ t('admin.homepageSettingsForm.carousel.title') }}</h3>
           <p class="mt-1 text-sm" style="color: var(--text-tertiary)">{{ t('admin.homepageSettingsForm.carousel.subtitle') }}</p>
        </div>
        <button
          type="button"
          class="ui-btn ui-btn--secondary text-sm"
          :disabled="slides.length >= 10"
          @click="addSlide"
        >
           <Icon name="lucide:plus" class="w-4 h-4" />
           {{ t('admin.homepageSettingsForm.carousel.addSlide') }}
        </button>
      </div>
    </div>

    <div class="p-6 space-y-4">
       <div v-if="slides.length === 0" class="text-center py-12 rounded-xl border-2 border-dashed" style="background: var(--surface-2); border-color: var(--surface-border)">
          <Icon name="lucide:image-off" class="w-12 h-12 mx-auto mb-3" style="color: var(--text-muted)" />
          <p class="font-medium" style="color: var(--text-tertiary)">{{ t('admin.homepageSettingsForm.carousel.noSlides') }}</p>
          <button 
             @click="addSlide"
             type="button"
             class="mt-4 [color:var(--brand)] hover:[color:var(--brand)] font-semibold text-sm"
          >
             {{ t('admin.homepageSettingsForm.carousel.createFirst') }}
          </button>
       </div>

       <div 
         v-for="(slide, index) in slides"
         :key="'slide-' + index"
         class="rounded-xl transition-all duration-200 relative group"
         :style="expandedSlideIndex === index ? 'background: var(--surface-1); border: 1px solid rgba(var(--brand-rgb) / 0.4)' : 'background: var(--surface-1); border: 1px solid var(--surface-border)'"
       >
          <!-- Accordion Header -->
          <div 
             class="px-5 py-4 flex items-center justify-between cursor-pointer select-none"
             :style="expandedSlideIndex === index ? 'background: rgba(var(--brand-rgb) / 0.08); border-bottom: 1px solid rgba(var(--brand-rgb) / 0.2)' : ''"
             :class="expandedSlideIndex === index ? 'rounded-t-xl' : 'rounded-xl'"
             @click="toggleSlide(index)"
          >
             <div class="flex items-center gap-4">
                <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style="color: var(--text-muted)" @click.stop>
                   <button type="button" @click="moveSlide(index, -1)" :disabled="index === 0" class="hover:text-white disabled:opacity-30 p-0.5">
                      <Icon name="lucide:chevron-up" class="w-4 h-4" />
                   </button>
                   <button type="button" @click="moveSlide(index, 1)" :disabled="index === slides.length - 1" class="hover:text-white disabled:opacity-30 p-0.5">
                      <Icon name="lucide:chevron-down" class="w-4 h-4" />
                   </button>
                </div>
                
                <div class="w-12 h-12 rounded overflow-hidden flex-shrink-0 flex items-center justify-center" style="background: var(--surface-3); border: 1px solid var(--surface-border)">
                   <img v-if="slide.imageUrl" :src="slide.imageUrl" class="w-full h-full object-cover" />
                   <Icon v-else name="lucide:image" class="w-5 h-5" style="color: var(--text-muted)" />
                </div>
                
                <div>
                   <span class="font-semibold block" style="color: var(--text-primary)">
                      {{ slide.title || t('admin.homepageSettingsForm.carousel.untitled') }}
                   </span>
                   <span class="text-xs mt-0.5 block" style="color: var(--text-tertiary)">Slide {{ index + 1 }}</span>
                </div>
             </div>
             
             <div class="flex items-center gap-2" @click.stop>
                <button 
                   type="button"
                   @click="removeSlide(index)"
                   class="hover:text-red-400 transition-colors p-2 rounded-lg" style="color: var(--text-muted)"
                   :title="t('admin.common.delete')"
                >
                   <Icon name="lucide:trash-2" class="w-4 h-4" />
                </button>
                <div class="w-px h-6 mx-1" style="background: var(--surface-border)"></div>
                <div class="p-2 transform transition-transform duration-200" style="color: var(--text-muted)" :class="{ 'rotate-180': expandedSlideIndex === index }">
                   <Icon name="lucide:chevron-down" class="w-5 h-5" />
                </div>
             </div>
          </div>

          <!-- Accordion Body -->
          <div v-show="expandedSlideIndex === index" class="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
             <!-- Image Column -->
             <div class="lg:col-span-5 relative">
                <ImageUploader 
                   v-model="slide.imageUrl"
                   mode="generic"
                   :label="t('admin.homepageSettingsForm.fields.imageUrl')"
                   :hint="t('admin.homepageSettingsForm.fields.imageUrlHint')"
                />
             </div>

             <!-- Fields Column -->
             <div class="lg:col-span-7 space-y-5">
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
                
                <div class="grid grid-cols-2 gap-5">
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
  
  if (expandedSlideIndex.value === index) {
     expandedSlideIndex.value = newIndex
  } else if (expandedSlideIndex.value === newIndex) {
     expandedSlideIndex.value = index
  }
}
</script>

<style scoped>
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
