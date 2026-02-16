<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div class="p-6 border-b border-slate-100">
      <div class="flex items-center justify-between">
        <div>
           <h3 class="text-lg font-semibold text-slate-900">{{ t('admin.homepageSettingsForm.carousel.title') }}</h3>
           <p class="mt-1 text-sm text-slate-500">{{ t('admin.homepageSettingsForm.carousel.subtitle') }}</p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
          :disabled="slides.length >= 10"
          @click="addSlide"
        >
           <Icon name="lucide:plus" class="w-4 h-4" />
           {{ t('admin.homepageSettingsForm.carousel.addSlide') }}
        </button>
      </div>
    </div>

    <div class="p-6 bg-slate-50/50 space-y-4">
       <div v-if="slides.length === 0" class="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <Icon name="lucide:image-off" class="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p class="text-slate-500 font-medium">{{ t('admin.homepageSettingsForm.carousel.noSlides') }}</p>
          <button 
             @click="addSlide"
             class="mt-4 text-teal-600 hover:text-teal-700 font-medium text-sm"
          >
             {{ t('admin.homepageSettingsForm.carousel.createFirst') }}
          </button>
       </div>

       <div 
         v-for="(slide, index) in slides"
         :key="index"
         class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md"
       >
          <!-- Header (Collapsible trigger could go here, for now just simple header) -->
          <div class="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
             <span class="font-medium text-slate-700 text-sm flex items-center gap-2">
                <span class="bg-slate-200 text-slate-600 text-xs w-5 h-5 rounded-full flex items-center justify-center">{{ index + 1 }}</span>
                {{ slide.title || t('admin.homepageSettingsForm.carousel.untitled') }}
             </span>
             <button 
                type="button"
                @click="removeSlide(index)"
                class="text-slate-400 hover:text-red-600 transition-colors p-1"
                :title="t('admin.common.delete')"
             >
                <Icon name="lucide:trash-2" class="w-4 h-4" />
             </button>
          </div>

          <div class="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
             <!-- Image Column -->
             <div class="lg:col-span-1">
                <ImageUploader 
                   v-model="slide.imageUrl"
                   :label="t('admin.homepageSettingsForm.fields.imageUrl')"
                   :hint="t('admin.homepageSettingsForm.fields.imageUrlHint')"
                />
             </div>

             <!-- Fields Column -->
             <div class="lg:col-span-1 space-y-4">
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
                
                <div class="grid grid-cols-2 gap-4">
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
import { computed } from 'vue'
import BaseInput from '~/components/ui/BaseInput.vue'
import ImageUploader from '~/components/admin/ImageUploader.vue'

interface Slide {
  title: string
  subtitle: string
  buttonText: string
  buttonHref: string
  imageUrl: string
}

const props = defineProps<{
  modelValue: Slide[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Slide[]): void
}>()

const { t } = useI18n({ useScope: 'global' })

const slides = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const addSlide = () => {
  if (slides.value.length >= 10) return
  slides.value.push({
    title: '',
    subtitle: '',
    buttonText: t('storefront.home.cta.shopNow'),
    buttonHref: '/products',
    imageUrl: ''
  })
}

const removeSlide = (index: number) => {
  slides.value.splice(index, 1)
}
</script>
