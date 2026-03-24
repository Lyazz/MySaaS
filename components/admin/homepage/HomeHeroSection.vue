<template>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <div class="p-6 border-b border-slate-100 bg-slate-50/50">
      <div class="flex items-center justify-between">
        <div>
           <h3 class="text-lg font-bold text-slate-800">{{ t('admin.homepageSettingsForm.carousel.title') }}</h3>
           <p class="mt-1 text-sm text-slate-500">{{ t('admin.homepageSettingsForm.carousel.subtitle') }}</p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50"
          :disabled="slides.length >= 10"
          @click="addSlide"
        >
           <Icon name="lucide:plus" class="w-4 h-4" />
           {{ t('admin.homepageSettingsForm.carousel.addSlide') }}
        </button>
      </div>
    </div>

    <div class="p-6 space-y-4">
       <div v-if="slides.length === 0" class="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Icon name="lucide:image-off" class="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p class="text-slate-500 font-medium">{{ t('admin.homepageSettingsForm.carousel.noSlides') }}</p>
          <button 
             @click="addSlide"
             type="button"
             class="mt-4 text-teal-600 hover:text-teal-700 font-semibold text-sm"
          >
             {{ t('admin.homepageSettingsForm.carousel.createFirst') }}
          </button>
       </div>

       <div 
         v-for="(slide, index) in slides"
         :key="'slide-' + index"
         class="bg-white rounded-xl border transition-all duration-200 relative group"
         :class="expandedSlideIndex === index ? 'border-teal-200 shadow-md ring-1 ring-teal-50' : 'border-slate-200 hover:border-slate-300'"
       >
          <!-- Accordion Header -->
          <div 
             class="px-5 py-4 flex items-center justify-between cursor-pointer select-none"
             :class="expandedSlideIndex === index ? 'bg-teal-50/30 border-b border-teal-100 rounded-t-xl' : 'rounded-xl'"
             @click="toggleSlide(index)"
          >
             <div class="flex items-center gap-4">
                <div class="flex flex-col gap-1 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                   <button type="button" @click="moveSlide(index, -1)" :disabled="index === 0" class="hover:text-slate-600 disabled:opacity-30 p-0.5">
                      <Icon name="lucide:chevron-up" class="w-4 h-4" />
                   </button>
                   <button type="button" @click="moveSlide(index, 1)" :disabled="index === slides.length - 1" class="hover:text-slate-600 disabled:opacity-30 p-0.5">
                      <Icon name="lucide:chevron-down" class="w-4 h-4" />
                   </button>
                </div>
                
                <div class="w-12 h-12 rounded bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                   <img v-if="slide.imageUrl" :src="slide.imageUrl" class="w-full h-full object-cover" />
                   <Icon v-else name="lucide:image" class="w-5 h-5 text-slate-400" />
                </div>
                
                <div>
                   <span class="font-semibold text-slate-800 block">
                      {{ slide.title || t('admin.homepageSettingsForm.carousel.untitled') }}
                   </span>
                   <span class="text-xs text-slate-500 mt-0.5 block">Slide {{ index + 1 }}</span>
                </div>
             </div>
             
             <div class="flex items-center gap-2" @click.stop>
                <button 
                   type="button"
                   @click="removeSlide(index)"
                   class="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                   :title="t('admin.common.delete')"
                >
                   <Icon name="lucide:trash-2" class="w-4 h-4" />
                </button>
                <div class="w-px h-6 bg-slate-200 mx-1"></div>
                <div class="p-2 text-slate-400 transform transition-transform duration-200" :class="{ 'rotate-180': expandedSlideIndex === index }">
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
