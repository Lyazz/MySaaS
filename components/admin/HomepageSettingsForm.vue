<template>
  <div class="space-y-6">
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="p-6 md:p-8">
        <h2 class="text-xl font-bold text-slate-900">{{ t('admin.pages.settings.homepage.metaTitle') }}</h2>
        <p class="text-slate-600 mt-2 max-w-2xl">
          {{ t('admin.homepageSettingsForm.subtitle') }}
        </p>
      </div>
    </div>

    <form class="space-y-6" @submit.prevent="save">
      <!-- Carousel -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6 md:p-8 md:grid md:grid-cols-3 md:gap-8">
          <div class="md:col-span-1">
            <h3 class="text-lg font-semibold text-slate-900">{{ t('admin.homepageSettingsForm.carousel.title') }}</h3>
            <p class="mt-2 text-sm text-slate-500 leading-relaxed">
              {{ t('admin.homepageSettingsForm.carousel.subtitle') }}
            </p>
          </div>

          <div class="mt-6 md:mt-0 md:col-span-2 space-y-4">
            <div v-if="loading" class="text-sm text-slate-500">{{ t('admin.common.loading') }}</div>

            <div v-else class="space-y-4">
              <div
                v-for="(slide, index) in form.carousel"
                :key="index"
                class="border border-slate-200 rounded-xl p-4 space-y-4"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-slate-800">{{ t('admin.homepageSettingsForm.carousel.slideLabel', { index: index + 1 }) }}</p>
                    <p class="text-xs text-slate-500 mt-1">{{ t('admin.homepageSettingsForm.carousel.slideHint') }}</p>
                  </div>
                  <button
                    type="button"
                    class="text-sm text-red-600 hover:text-red-700"
                    :disabled="form.carousel.length <= 1 || saving"
                    @click="removeSlide(index)"
                  >
                    {{ t('admin.common.delete') }}
                  </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="md:col-span-1 space-y-3">
                    <div class="aspect-[16/9] bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        v-if="slide.imageUrl"
                        :src="slide.imageUrl"
                        :alt="t('admin.homepageSettingsForm.carousel.slidePreviewAlt')"
                        class="w-full h-full object-cover"
                      >
                      <div v-else class="text-xs text-slate-500">{{ t('admin.homepageSettingsForm.carousel.noImage') }}</div>
                    </div>

                    <label class="block">
                      <span class="text-xs font-medium text-slate-700">{{ t('admin.homepageSettingsForm.carousel.uploadImage') }}</span>
                      <input
                        type="file"
                        accept="image/*"
                        class="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                        :disabled="saving || uploadingIndex === index"
                        @change="onSlideFileChange($event, index)"
                      >
                    </label>
                  </div>

                  <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BaseInput v-model="slide.title" :label="t('admin.homepageSettingsForm.fields.title')" required />
                    <BaseInput v-model="slide.subtitle" :label="t('admin.homepageSettingsForm.fields.subtitle')" />
                    <BaseInput v-model="slide.buttonText" :label="t('admin.homepageSettingsForm.fields.buttonText')" />
                    <BaseInput v-model="slide.buttonHref" :label="t('admin.homepageSettingsForm.fields.buttonLink')" :hint="t('admin.homepageSettingsForm.fields.buttonLinkHint')" />
                    <div class="md:col-span-2">
                      <BaseInput v-model="slide.imageUrl" :label="t('admin.homepageSettingsForm.fields.imageUrl')" :hint="t('admin.homepageSettingsForm.fields.imageUrlHint')" />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                :disabled="saving || form.carousel.length >= 10"
                @click="addSlide"
              >
                <Icon name="lucide:plus" class="w-4 h-4" />
                {{ t('admin.homepageSettingsForm.carousel.addSlide') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Sections -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6 md:p-8 md:grid md:grid-cols-3 md:gap-8">
          <div class="md:col-span-1">
            <h3 class="text-lg font-semibold text-slate-900">{{ t('admin.homepageSettingsForm.sections.title') }}</h3>
            <p class="mt-2 text-sm text-slate-500 leading-relaxed">
              {{ t('admin.homepageSettingsForm.sections.subtitle') }}
            </p>
          </div>

          <div class="mt-6 md:mt-0 md:col-span-2 space-y-6">
            <!-- Browse by category -->
            <div class="border border-slate-200 rounded-xl p-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold text-slate-800">{{ t('admin.homepageSettingsForm.sections.browseByCategory.title') }}</p>
                  <p class="text-xs text-slate-500 mt-1">{{ t('admin.homepageSettingsForm.sections.browseByCategory.subtitle') }}</p>
                </div>
                <BaseToggle v-model="form.sections.browseByCategory.enabled" :sr-label="t('admin.homepageSettingsForm.sections.browseByCategory.toggle')"/>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <BaseInput v-model="form.sections.browseByCategory.eyebrow" :label="t('admin.homepageSettingsForm.fields.eyebrow')" />
                <BaseInput v-model="form.sections.browseByCategory.title" :label="t('admin.homepageSettingsForm.fields.title')" />
              </div>
            </div>

            <!-- New arrivals -->
            <div class="border border-slate-200 rounded-xl p-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold text-slate-800">{{ t('admin.homepageSettingsForm.sections.newArrivals.title') }}</p>
                  <p class="text-xs text-slate-500 mt-1">{{ t('admin.homepageSettingsForm.sections.newArrivals.subtitle') }}</p>
                </div>
                <BaseToggle v-model="form.sections.newArrivals.enabled" :sr-label="t('admin.homepageSettingsForm.sections.newArrivals.toggle')" />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <BaseInput v-model="form.sections.newArrivals.eyebrow" :label="t('admin.homepageSettingsForm.fields.eyebrow')" />
                <BaseInput v-model="form.sections.newArrivals.title" :label="t('admin.homepageSettingsForm.fields.title')" />
                <BaseInput
                  v-model="newArrivalsLimitText"
                  :label="t('admin.homepageSettingsForm.fields.limit')"
                  hint="1–24"
                  inputmode="numeric"
                />
              </div>
            </div>

            <!-- Best sellers -->
            <div class="border border-slate-200 rounded-xl p-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold text-slate-800">{{ t('admin.homepageSettingsForm.sections.bestSellers.title') }}</p>
                  <p class="text-xs text-slate-500 mt-1">{{ t('admin.homepageSettingsForm.sections.bestSellers.subtitle') }}</p>
                </div>
                <BaseToggle v-model="form.sections.bestSellers.enabled" :sr-label="t('admin.homepageSettingsForm.sections.bestSellers.toggle')" />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <BaseInput v-model="form.sections.bestSellers.eyebrow" :label="t('admin.homepageSettingsForm.fields.eyebrow')" />
                <BaseInput v-model="form.sections.bestSellers.title" :label="t('admin.homepageSettingsForm.fields.title')" />
                <BaseInput
                  v-model="bestSellersLimitText"
                  :label="t('admin.homepageSettingsForm.fields.limit')"
                  hint="1–24"
                  inputmode="numeric"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="fixed bottom-6 right-6 md:static md:flex md:justify-end">
        <div class="bg-white md:bg-transparent p-2 md:p-0 rounded-full shadow-lg md:shadow-none border md:border-none border-slate-200 flex items-center gap-3">
          <div v-if="successMessage" class="hidden md:block text-sm text-emerald-600 font-medium animate-fadeIn px-3">
            {{ successMessage }}
          </div>
          <div v-if="errorMessage" class="hidden md:block text-sm text-red-600 font-medium animate-fadeIn px-3">
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            class="inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
            :disabled="loading || saving"
          >
            <Icon v-if="saving" name="lucide:loader-2" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
            {{ saving ? t('admin.common.saving') : t('admin.common.saveChanges') }}
          </button>
        </div>
      </div>

      <div v-if="successMessage || errorMessage" class="md:hidden fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4">
        <div class="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
          <span class="text-sm font-medium">{{ successMessage || errorMessage }}</span>
          <button @click="successMessage = ''; errorMessage = ''" class="ml-4 text-slate-400 hover:text-white">
            <Icon name="lucide:x" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import BaseToggle from '~/components/ui/BaseToggle.vue'
import BaseInput from '~/components/ui/BaseInput.vue'
import { DEFAULT_STOREFRONT_HOME_CONFIG, type StorefrontHomeConfig } from '~/shared/storefront/homepage'

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })
const loading = ref(false)
const saving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const uploadingIndex = ref<number | null>(null)

const form = reactive<StorefrontHomeConfig>(structuredClone(DEFAULT_STOREFRONT_HOME_CONFIG))

const newArrivalsLimitText = computed({
  get: () => String(form.sections.newArrivals.limit ?? 6),
  set: (v: string) => {
    const n = Number.parseInt(v, 10)
    if (!Number.isFinite(n)) return
    form.sections.newArrivals.limit = n
  }
})

const bestSellersLimitText = computed({
  get: () => String(form.sections.bestSellers.limit ?? 6),
  set: (v: string) => {
    const n = Number.parseInt(v, 10)
    if (!Number.isFinite(n)) return
    form.sections.bestSellers.limit = n
  }
})

const applyLoaded = (cfg: StorefrontHomeConfig | null | undefined) => {
  if (!cfg) return
  Object.assign(form, structuredClone(cfg))
}

const fetchHomepageSettings = async () => {
  loading.value = true
  try {
    const data = await $fetch<{ homeConfig: StorefrontHomeConfig }>('/api/admin/homepage-settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    applyLoaded(data.homeConfig)
  } catch (e) {
    console.error('Failed to load homepage settings', e)
    errorMessage.value = t('admin.homepageSettingsForm.messages.loadFailed')
    setTimeout(() => (errorMessage.value = ''), 4000)
  } finally {
    loading.value = false
  }
}

await fetchHomepageSettings()

const addSlide = () => {
  form.carousel.push({
    title: t('admin.homepageSettingsForm.carousel.defaults.title'),
    subtitle: '',
    buttonText: t('storefront.home.cta.shopNow'),
    buttonHref: '/products',
    imageUrl: ''
  })
}

const removeSlide = (index: number) => {
  if (form.carousel.length <= 1) return
  form.carousel.splice(index, 1)
}

const onSlideFileChange = async (event: Event, index: number) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const [file] = input.files

  uploadingIndex.value = index
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: formData
    })
    if (!response.ok) throw new Error(t('admin.homepageSettingsForm.messages.uploadFailed'))
    const data = await response.json()
    form.carousel[index].imageUrl = data.url
  } catch (e) {
    console.error('Slide upload failed', e)
    errorMessage.value = t('admin.homepageSettingsForm.messages.uploadFailed')
    setTimeout(() => (errorMessage.value = ''), 4000)
  } finally {
    uploadingIndex.value = null
    input.value = ''
  }
}

const save = async () => {
  saving.value = true
  successMessage.value = ''
  errorMessage.value = ''
  try {
    const updated = await $fetch<{ homeConfig: StorefrontHomeConfig }>('/api/admin/homepage-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { homeConfig: form }
    })
    applyLoaded(updated.homeConfig)
    successMessage.value = t('admin.homepageSettingsForm.messages.saved')
    setTimeout(() => (successMessage.value = ''), 4000)
  } catch (e: any) {
    console.error('Failed to save homepage settings', e)
    errorMessage.value = e.data?.statusMessage || t('admin.homepageSettingsForm.messages.saveFailed')
    setTimeout(() => (errorMessage.value = ''), 4000)
  } finally {
    saving.value = false
  }
}
</script>
