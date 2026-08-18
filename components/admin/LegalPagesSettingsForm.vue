<template>
  <div class="legal-form">
    <SettingsPageHeader
      :title="t('admin.nav.legalPages') || 'Legal pages'"
      :subtitle="'Configure terms, privacy, returns, and contact pages in FR / EN / AR. Footer links only appear when enabled.'"
    />

    <SettingsStatus
      :message="successMessage || errorMessage"
      :type="errorMessage ? 'error' : 'success'"
    />

    <div class="legal-pages">
      <SettingsSection
        v-for="page in pageEntries"
        :key="page.key"
        :anchor-id="`legal-${page.key}`"
        :icon="page.icon"
        :title="page.label"
        :subtitle="page.subtitle"
      >
        <div class="page-toggle-row">
          <div>
            <p class="page-toggle-title">Visible in footer</p>
            <p class="page-toggle-subtitle">If disabled, the link is hidden from storefront footer templates.</p>
          </div>
          <BaseToggle v-model="form[page.key].enabled" :sr-label="`Enable ${page.label}`" />
        </div>

        <div class="language-grid">
          <article v-for="lang in languageEntries" :key="lang.key" class="lang-card">
            <header class="lang-head">
              <div class="lang-flag">{{ lang.flag }}</div>
              <div>
                <p class="lang-name">{{ lang.label }}</p>
                <p class="lang-code">{{ lang.key.toUpperCase() }}</p>
              </div>
            </header>

            <div class="field">
              <label class="field-label">Title</label>
              <input
                v-model="form[page.key].title[lang.key]"
                type="text"
                class="field-input"
                maxlength="140"
              >
            </div>

            <div class="field">
              <label class="field-label">Content</label>
              <RichTextEditor
                v-model="form[page.key].content[lang.key]"
                placeholder="Enter rich text content..."
              />
            </div>
          </article>
        </div>
      </SettingsSection>
    </div>

    <SettingsSaveBar
      :is-dirty="isDirty"
      :saving="saving"
      @save="save"
      @discard="reset"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseToggle from '~/components/ui/BaseToggle.vue'
import RichTextEditor from '~/components/admin/RichTextEditor.vue'
import SettingsPageHeader from './settings/SettingsPageHeader.vue'
import SettingsStatus from './settings/SettingsStatus.vue'
import SettingsSection from './settings/SettingsSection.vue'
import SettingsSaveBar from './settings/SettingsSaveBar.vue'
import {
  buildDefaultStoreLegalPagesConfig,
  normalizeStoreLegalPagesConfig,
  type StoreLegalLanguage,
  type StoreLegalPageKey,
  type StoreLegalPagesConfig
} from '~/shared/storefront/legal-pages'

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

const saving = ref(false)
const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const form = reactive<StoreLegalPagesConfig>(buildDefaultStoreLegalPagesConfig())
const initialFormString = ref(JSON.stringify(form))
const isDirty = computed(() => initialFormString.value !== JSON.stringify(form))

const pageEntries = computed(() => [
  {
    key: 'terms' as StoreLegalPageKey,
    icon: 'lucide:file-text',
    label: t('storefront.footer.termsOfService') || 'Terms of use',
    subtitle: 'Public legal page and footer link'
  },
  {
    key: 'privacy' as StoreLegalPageKey,
    icon: 'lucide:shield',
    label: t('storefront.footer.privacyPolicy') || 'Privacy policy',
    subtitle: 'Public legal page and footer link'
  },
  {
    key: 'returns' as StoreLegalPageKey,
    icon: 'lucide:rotate-ccw',
    label: t('storefront.footer.returnPolicy') || 'Return policy',
    subtitle: 'Public legal page and footer link'
  },
  {
    key: 'contact' as StoreLegalPageKey,
    icon: 'lucide:phone',
    label: t('storefront.footer.contactUs') || 'Contact',
    subtitle: 'Public contact information page and footer link'
  }
])

const languageEntries = computed(() => [
  { key: 'fr' as StoreLegalLanguage, label: t('i18n.locales.fr') || 'French', flag: '🇫🇷' },
  { key: 'en' as StoreLegalLanguage, label: t('i18n.locales.en') || 'English', flag: '🇬🇧' },
  { key: 'ar' as StoreLegalLanguage, label: t('i18n.locales.ar') || 'Arabic', flag: '🇩🇿' }
])

const syncForm = (data: StoreLegalPagesConfig) => {
  for (const page of pageEntries.value) {
    form[page.key].enabled = data[page.key].enabled
    for (const lang of languageEntries.value) {
      form[page.key].title[lang.key] = data[page.key].title[lang.key]
      form[page.key].content[lang.key] = data[page.key].content[lang.key]
    }
  }
  initialFormString.value = JSON.stringify(form)
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const data = await $fetch<any>('/api/admin/store-settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })

    const normalized = normalizeStoreLegalPagesConfig(data?.legalPages)
    syncForm(normalized)
  } catch (e: any) {
    console.error('Failed to load legal pages settings', e)
    errorMessage.value = e?.data?.statusMessage || 'Failed to load legal pages settings.'
  } finally {
    loading.value = false
  }
}

const save = async () => {
  if (!isDirty.value) return

  saving.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const payload = JSON.parse(JSON.stringify(form))
    const updated = await $fetch<any>('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { legalPages: payload }
    })

    const normalized = normalizeStoreLegalPagesConfig(updated?.legalPages)
    syncForm(normalized)
    useState<any>('storeSettings').value = updated
    successMessage.value = 'Legal pages updated.'
  } catch (e: any) {
    console.error('Failed to save legal pages settings', e)
    errorMessage.value = e?.data?.statusMessage || 'Failed to save legal pages settings.'
  } finally {
    saving.value = false
  }
}

const reset = () => {
  const parsed = JSON.parse(initialFormString.value) as StoreLegalPagesConfig
  syncForm(parsed)
  successMessage.value = ''
  errorMessage.value = ''
}

onMounted(load)
</script>

<style scoped>

.legal-pages {
  display: grid;
  gap: 16px;
}

.page-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 14px;
}

.page-toggle-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-toggle-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.language-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.lang-card {
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  border-radius: 12px;
  padding: 12px;
}

.lang-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.lang-flag {
  font-size: 18px;
}

.lang-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.lang-code {
  font-size: 10.5px;
  color: var(--text-muted);
}

@media (max-width: 1100px) {
  .language-grid {
    grid-template-columns: 1fr;
  }
}
</style>
