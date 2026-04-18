<template>
  <div class="max-w-4xl mx-auto space-y-8 pb-24">
    
    <!-- Header Section -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
           <h1 class="text-2xl font-bold" style="color: var(--text-primary)">{{ t('admin.pages.settings.homepage.metaTitle') }}</h1>
           <p class="mt-1" style="color: var(--text-secondary)">{{ t('admin.homepageSettingsForm.subtitle') }}</p>
        </div>
      </div>
      
      <form @submit.prevent="save" class="space-y-8">
        <!-- Hero / Carousel Section -->
        <HomeHeroSection v-model="form.carousel" />

        <!-- Feature Sections -->
        <HomeFeatureSection v-model="form.sections" />
        <!-- Form Actions -->
        <div class="pt-4 flex items-center justify-end gap-6">
           <div 
             v-if="message.text" 
             class="px-3 py-1.5 rounded-full text-sm font-medium animate-fadeIn"
             :style="message.type === 'success' ? 'background: rgba(34,197,94,0.1); color: #4ade80' : 'background: rgba(239,68,68,0.1); color: #f87171'"
           >
             {{ message.text }}
           </div>

           <div class="flex items-center gap-3">
             <button
               type="button"
               class="ui-btn ui-btn--secondary text-sm"
               :disabled="loading || saving"
               @click="reset"
             >
               {{ t('admin.common.cancel') }}
             </button>
             
             <button
               type="submit"
               class="px-6 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30 active:scale-95 flex items-center gap-2"
               :class="saving ? 'bg-teal-500 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'"
               :disabled="loading || saving"
             >
               <Icon v-if="saving" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
               {{ saving ? t('admin.common.saving') : t('admin.common.saveChanges') }}
             </button>
           </div>
        </div>
      </form>
    </div>

  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import HomeHeroSection from './homepage/HomeHeroSection.vue'
import HomeFeatureSection from './homepage/HomeFeatureSection.vue'
import { DEFAULT_STOREFRONT_HOME_CONFIG, type StorefrontHomeConfig } from '~/shared/storefront/homepage'

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })
const loading = ref(false)
const saving = ref(false)
const message = reactive({ type: '', text: '' })

const form = reactive<StorefrontHomeConfig>(structuredClone(DEFAULT_STOREFRONT_HOME_CONFIG))

const showMessage = (type: 'success' | 'error', text: string) => {
   message.type = type
   message.text = text
   setTimeout(() => { message.text = '' }, 4000)
}

const applyLoaded = (cfg: StorefrontHomeConfig | null | undefined) => {
  if (!cfg) return
  Object.assign(form, structuredClone(cfg))
}

const fetchHomepageSettings = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/homepage-settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    }) as { homeConfig: StorefrontHomeConfig }
    applyLoaded(data.homeConfig)
  } catch (e) {
    console.error('Failed to load homepage settings', e)
    showMessage('error', t('admin.homepageSettingsForm.messages.loadFailed'))
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  message.text = ''
  try {
    const updated = await $fetch('/api/admin/homepage-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { homeConfig: form }
    })
    applyLoaded(updated.homeConfig)
    showMessage('success', t('admin.homepageSettingsForm.messages.saved'))
  } catch (e: any) {
    console.error('Failed to save homepage settings', e)
    showMessage('error', e.data?.statusMessage || t('admin.homepageSettingsForm.messages.saveFailed'))
  } finally {
    saving.value = false
  }
}

const reset = () => {
  if (confirm(t('admin.common.confirmDiscard'))) {
    fetchHomepageSettings()
  }
}

onMounted(() => {
  fetchHomepageSettings()
})
</script>

<style scoped>
.animate-fadeIn {
   animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
   from { opacity: 0; transform: translateY(5px); }
   to { opacity: 1; transform: translateY(0); }
}
</style>
