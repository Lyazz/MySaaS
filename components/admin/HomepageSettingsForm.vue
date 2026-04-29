<template>
  <div class="homepage-form">
    <SettingsPageHeader
      :eyebrow="t('admin.nav.storefront') || 'Storefront'"
      :title="t('admin.pages.settings.homepage.title') || 'Homepage'"
      :subtitle="t('admin.homepageSettingsForm.subtitle')"
    />

    <SettingsAnchorTabs :tabs="tabs" :active-id="activeTab" @select="activeTab = $event" />

    <div v-if="message.text" class="status-toast" :class="message.type">
      <Icon :name="message.type === 'success' ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="w-4 h-4" />
      {{ message.text }}
    </div>

    <form @submit.prevent="save" class="homepage-sections">
      <SettingsSection
        anchor-id="hero"
        icon="lucide:image"
        :title="t('admin.homepageSettingsForm.carousel.title')"
        :subtitle="t('admin.homepageSettingsForm.carousel.subtitle')"
      >
        <HomeHeroSection v-model="form.carousel" />
      </SettingsSection>

      <SettingsSection
        anchor-id="sections"
        icon="lucide:layout-grid"
        :title="t('admin.homepageSettingsForm.sections.title')"
        :subtitle="t('admin.homepageSettingsForm.sections.subtitle')"
      >
        <HomeFeatureSection v-model="form.sections" />
      </SettingsSection>
    </form>

    <SettingsSaveBar
      :is-dirty="isDirty"
      :saving="saving"
      @save="save"
      @discard="reset"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAuthStore } from '~/stores/auth'
import HomeHeroSection from './homepage/HomeHeroSection.vue'
import HomeFeatureSection from './homepage/HomeFeatureSection.vue'
import SettingsPageHeader from './settings/SettingsPageHeader.vue'
import SettingsSection from './settings/SettingsSection.vue'
import SettingsSaveBar from './settings/SettingsSaveBar.vue'
import SettingsAnchorTabs from './settings/SettingsAnchorTabs.vue'
import { DEFAULT_STOREFRONT_HOME_CONFIG, type StorefrontHomeConfig } from '~/shared/storefront/homepage'

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

const loading = ref(false)
const saving = ref(false)
const message = reactive({ type: '' as 'success' | 'error' | '', text: '' })

const form = reactive<StorefrontHomeConfig>(structuredClone(DEFAULT_STOREFRONT_HOME_CONFIG))
const initialFormString = ref(JSON.stringify(form))
const isDirty = computed(() => initialFormString.value !== JSON.stringify(form))

const activeTab = ref('hero')
const tabs = computed(() => [
  { id: 'hero', label: t('admin.homepageSettingsForm.carousel.title'), icon: 'lucide:image' },
  { id: 'sections', label: t('admin.homepageSettingsForm.sections.title'), icon: 'lucide:layout-grid' }
])

function showMessage(type: 'success' | 'error', text: string) {
  message.type = type
  message.text = text
  setTimeout(() => { message.text = '' }, 4000)
}

function applyLoaded(cfg: StorefrontHomeConfig | null | undefined) {
  if (!cfg) return
  Object.assign(form, structuredClone(cfg))
  initialFormString.value = JSON.stringify(form)
}

async function fetchHomepageSettings() {
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

async function save() {
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

function reset() {
  if (confirm(t('admin.common.confirmDiscard') || t('admin.appearanceSettingsForm.confirm.discard'))) {
    fetchHomepageSettings()
  }
}

function setupScrollSpy() {
  if (typeof window === 'undefined') return
  const ids = ['hero', 'sections']
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      if (visible.length > 0 && visible[0].target.id) {
        activeTab.value = visible[0].target.id
      }
    },
    { rootMargin: '-80px 0px -50% 0px', threshold: [0.1, 0.3, 0.6] }
  )
  nextTick(() => {
    ids.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
  })
  onBeforeUnmount(() => observer.disconnect())
}

onMounted(() => {
  fetchHomepageSettings()
  setupScrollSpy()
})
</script>

<style scoped>
.homepage-form {
  padding-bottom: 120px;
}

.status-toast {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 500;
  margin-bottom: 16px;
}

.status-toast.success {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.status-toast.error {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.homepage-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
