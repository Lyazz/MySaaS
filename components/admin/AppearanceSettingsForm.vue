<template>
  <div class="appearance-form">
    <SettingsPageHeader
      :eyebrow="t('admin.nav.storefront') || 'Storefront'"
      :title="t('admin.pages.settings.appearance.title') || 'Appearance'"
      :subtitle="t('admin.pages.settings.appearance.subtitle') || 'Manage your store identity, brand assets, and storefront template.'"
    >
      <template #actions>
        <a
          v-if="previewUrl"
          :href="previewUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="header-action header-action-secondary"
        >
          <Icon name="lucide:external-link" class="w-3.5 h-3.5" />
          <span>{{ t('admin.actions.viewStore') || 'View store' }}</span>
        </a>
        <button
          type="button"
          class="header-action header-action-magic"
          :disabled="loading"
          @click="mockAiGenerate"
        >
          <Icon name="lucide:sparkles" class="w-3.5 h-3.5" />
          <span>{{ t('admin.appearanceSettingsForm.brandAssets.logo.magicIdentity') || 'Magic identity' }}</span>
        </button>
      </template>
    </SettingsPageHeader>

    <SettingsAnchorTabs :tabs="tabs" :active-id="activeTab" @select="activeTab = $event" />

    <div v-if="message.text" class="status-toast" :class="message.type">
      <Icon :name="message.type === 'success' ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="w-4 h-4" />
      {{ message.text }}
    </div>

    <div class="appearance-sections">
      <!-- Identity -->
      <SettingsSection
        anchor-id="identity"
        icon="lucide:store"
        :title="t('admin.appearanceSettingsForm.identity.title')"
        :subtitle="t('admin.appearanceSettingsForm.identity.subtitle')"
      >
        <div class="field-grid">
          <div class="field">
            <label class="field-label">
              {{ t('admin.appearanceSettingsForm.identity.storeName.label') }}
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              class="field-input"
              :placeholder="t('admin.appearanceSettingsForm.identity.storeName.placeholder')"
            >
          </div>

          <div class="field">
            <label class="field-label">
              {{ t('admin.appearanceSettingsForm.identity.slug.label') }}
            </label>
            <div class="field-input-group">
              <input
                v-model="form.slug"
                type="text"
                required
                pattern="^[a-z0-9-]+$"
                class="field-input field-input-group-main"
                :placeholder="t('admin.appearanceSettingsForm.identity.slug.placeholder')"
                @input="handleSlugInput"
              >
              <span class="field-input-group-suffix">.{{ baseDomain }}</span>
            </div>
            <p class="field-hint">{{ t('admin.appearanceSettingsForm.identity.slug.hint') }}</p>
          </div>
        </div>
      </SettingsSection>

      <!-- Brand -->
      <SettingsSection
        anchor-id="brand"
        icon="lucide:palette"
        :title="t('admin.appearanceSettingsForm.brandAssets.title')"
        :subtitle="t('admin.appearanceSettingsForm.brandAssets.subtitle')"
      >
        <div class="brand-rows">
          <!-- Logo + Favicon row -->
          <div class="brand-row">
            <BrandImageField
              v-model="form.logoUrl"
              variant="logo"
              :label="t('admin.appearanceSettingsForm.brandAssets.logo.label')"
              :hint="t('admin.appearanceSettingsForm.brandAssets.logo.hint')"
              :accent="form.primaryColor"
              class="brand-row-main"
            />
            <BrandImageField
              v-model="form.faviconUrl"
              variant="favicon"
              :label="t('admin.appearanceSettingsForm.brandAssets.favicon.label') || 'Favicon'"
              :hint="t('admin.appearanceSettingsForm.brandAssets.favicon.hint')"
              :tab-title="form.name || 'My Store'"
              class="brand-row-aside"
            />
          </div>

          <!-- Primary color row -->
          <div class="brand-color-row">
            <div class="brand-color-head">
              <p class="brand-field-label-inline">{{ t('admin.appearanceSettingsForm.brandAssets.primaryColor.label') }}</p>
              <p class="brand-field-hint-inline">{{ t('admin.appearanceSettingsForm.brandAssets.primaryColor.hint') }}</p>
            </div>
            <div class="color-controls">
              <label class="color-swatch" :style="{ background: form.primaryColor }">
                <input
                  v-model="form.primaryColor"
                  type="color"
                  class="color-input"
                >
                <Icon name="lucide:pipette" class="color-swatch-icon" />
              </label>
              <input
                v-model="form.primaryColor"
                type="text"
                pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                class="field-input color-hex-input"
                placeholder="#C6F432"
              >
              <div class="color-presets-inline">
                <button
                  v-for="color in presetColors"
                  :key="color"
                  type="button"
                  class="color-preset"
                  :class="{ 'is-active': form.primaryColor === color }"
                  :style="{ background: color }"
                  :aria-label="color"
                  @click="form.primaryColor = color"
                >
                  <Icon v-if="form.primaryColor === color" name="lucide:check" class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      <!-- Templates -->
      <SettingsSection
        anchor-id="templates"
        icon="lucide:layout-template"
        :title="t('admin.appearanceSettingsForm.templates.title')"
        :subtitle="t('admin.appearanceSettingsForm.templates.subtitle')"
      >
        <template #aside>
          <div class="template-search">
            <Icon name="lucide:search" class="template-search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('admin.common.search') || 'Search templates'"
              class="template-search-input"
            >
          </div>
        </template>

        <div class="template-filters">
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            class="template-filter"
            :class="{ 'is-active': selectedCategory === cat }"
            @click="selectedCategory = cat"
          >
            {{ cat }}
          </button>
        </div>

        <div class="template-grid">
          <button
            v-for="tpl in filteredTemplates"
            :key="tpl.key"
            type="button"
            class="template-card"
            :class="{ 'is-selected': form.templateKey === tpl.key }"
            @click="form.templateKey = tpl.key"
          >
            <span v-if="form.templateKey === tpl.key" class="template-card-badge">
              <Icon name="lucide:check" class="w-3.5 h-3.5" />
            </span>

            <div class="template-card-preview" :style="{ background: tpl.bg, '--accent': tpl.color, '--card-bg': tpl.cardBg, '--border': tpl.border }">
              <div class="template-card-accent" />
              <div class="template-card-mockup" :style="{ background: tpl.cardBg, borderRadius: tpl.radius, borderColor: tpl.border }">
                <div class="template-card-mockup-img" :style="{ background: tpl.imgBg }">
                  <span>{{ tpl.emoji }}</span>
                </div>
                <div class="template-card-mockup-body" :style="{ fontFamily: tpl.fontStyle }">
                  <p class="template-card-mockup-name" :style="{ color: tpl.textColor }">{{ tpl.sampleDesc }}</p>
                  <p class="template-card-mockup-price" :style="{ color: tpl.color }">{{ tpl.samplePrice }}</p>
                  <span
                    class="template-card-mockup-cta"
                    :style="{ background: tpl.color, color: tpl.btnText, borderRadius: tpl.radius }"
                  >BUY</span>
                </div>
              </div>

              <div class="template-card-overlay">
                <span class="template-card-preview-btn" @click.stop="openQuickView(tpl.key)">
                  <Icon name="lucide:eye" class="w-3.5 h-3.5" />
                  {{ t('admin.appearanceSettingsForm.templates.quickView') || 'Quick view' }}
                </span>
              </div>
            </div>

            <div class="template-card-meta">
              <div class="template-card-meta-row">
                <p class="template-card-name">{{ tpl.label }}</p>
                <span class="template-card-category">{{ tpl.category }}</span>
              </div>
              <p class="template-card-desc">{{ tpl.storeTypes }}</p>
              <div class="template-card-pills">
                <span class="template-card-pill template-card-pill-color" :style="{ '--c': tpl.color }">
                  <span class="template-card-pill-dot" :style="{ background: tpl.color }" />
                  {{ tpl.color.toUpperCase() }}
                </span>
                <span class="template-card-pill">
                  <Icon name="lucide:type" class="w-3 h-3" />
                  {{ tpl.fontName }}
                </span>
              </div>
            </div>
          </button>
        </div>

        <div v-if="filteredTemplates.length === 0" class="template-empty">
          <Icon name="lucide:search-x" class="template-empty-icon" />
          <p>{{ t('admin.common.noResults') || 'No templates match your search' }}</p>
        </div>
      </SettingsSection>
    </div>

    <!-- Floating save bar -->
    <SettingsSaveBar
      :is-dirty="isDirty"
      :saving="saving"
      @save="save"
      @discard="reset"
    />

    <!-- Quick view modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showQuickView" class="quick-view-modal" @click.self="showQuickView = false">
          <div class="quick-view-panel">
            <header class="quick-view-head">
              <div class="quick-view-head-left">
                <Icon name="lucide:monitor" class="w-4 h-4" style="color: var(--text-muted)" />
                <h3>{{ t('admin.appearanceSettingsForm.templates.quickView') || 'Quick preview' }}</h3>
              </div>
              <button class="quick-view-close" @click="showQuickView = false" :aria-label="t('admin.common.close') || 'Close'">
                <Icon name="lucide:x" class="w-4 h-4" />
              </button>
            </header>
            <div class="quick-view-body">
              <div v-if="!quickViewUrl" class="quick-view-loading">
                <Icon name="lucide:loader-2" class="quick-view-spinner" />
                <p>{{ t('admin.common.loading') || 'Loading preview…' }}</p>
              </div>
              <iframe v-if="quickViewUrl" :src="quickViewUrl" class="quick-view-iframe" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SettingsPageHeader from './settings/SettingsPageHeader.vue'
import SettingsSection from './settings/SettingsSection.vue'
import SettingsSaveBar from './settings/SettingsSaveBar.vue'
import SettingsAnchorTabs from './settings/SettingsAnchorTabs.vue'
import BrandImageField from './settings/BrandImageField.vue'

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

const loading = ref(false)
const saving = ref(false)
const message = reactive({ type: '' as 'success' | 'error' | '', text: '' })

const presetColors = [
  '#C6F432', '#0f172a', '#4F46E5', '#F43F5E',
  '#EA580C', '#FACC15', '#8A9A5B', '#7C3AED'
]

const form = reactive({
  name: '',
  slug: '',
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  primaryColor: '#C6F432',
  templateKey: 'classic'
})

const initialFormString = ref(JSON.stringify(form))
const isDirty = computed(() => initialFormString.value !== JSON.stringify(form))

const categories = ['All', 'Minimalist', 'Bold', 'Tech', 'Luxury', 'Classic']
const selectedCategory = ref('All')
const searchQuery = ref('')

const showQuickView = ref(false)
const quickViewUrl = ref('')
const baseDomain = ref('')

const activeTab = ref('identity')
const tabs = computed(() => [
  { id: 'identity', label: t('admin.appearanceSettingsForm.identity.title'), icon: 'lucide:store' },
  { id: 'brand', label: t('admin.appearanceSettingsForm.brandAssets.title'), icon: 'lucide:palette' },
  { id: 'templates', label: t('admin.appearanceSettingsForm.templates.title'), icon: 'lucide:layout-template' }
])

const previewUrl = computed(() => {
  if (!form.slug || !baseDomain.value) return null
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:'
  return `${protocol}//${form.slug}.${baseDomain.value}`
})

const filteredTemplates = computed(() => {
  let list = templates.value
  if (selectedCategory.value !== 'All') {
    list = list.filter(t => t.category === selectedCategory.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(t =>
      t.label.toLowerCase().includes(q) ||
      t.storeTypes?.toLowerCase().includes(q) ||
      t.fontName.toLowerCase().includes(q)
    )
  }
  return list
})

onMounted(() => {
  if (typeof window !== 'undefined') {
    const host = window.location.host
    if (host.includes('localhost')) {
      baseDomain.value = 'localhost:3000'
    } else {
      const parts = host.split('.')
      baseDomain.value = parts.length > 2 ? parts.slice(1).join('.') : host
    }
  }
  fetchSettings()
  setupScrollSpy()
})

function setupScrollSpy() {
  if (typeof window === 'undefined') return
  const ids = ['identity', 'brand', 'templates']
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

const templates = computed(() => [
  { key: 'classic', label: 'Classic', category: 'Classic', storeTypes: t('admin.appearanceSettingsForm.templates.options.classic.storeTypes'), fontName: 'Alice', fontStyle: "'Alice', serif", color: '#0f172a', bg: '#f8fafc', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#e2e8f0,#cbd5e1)', border: '#e2e8f0', textColor: '#0f172a', btnText: '#ffffff', radius: '4px', emoji: '🖼️', sampleDesc: 'Élégant', samplePrice: '189 €' },
  { key: 'modern', label: 'Modern', category: 'Minimalist', storeTypes: t('admin.appearanceSettingsForm.templates.options.modern.storeTypes'), fontName: 'Outfit', fontStyle: "'Outfit', system-ui, sans-serif", color: '#0d9488', bg: '#f8fafc', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#ccfbf1,#99f6e4)', border: '#e2e8f0', textColor: '#475569', btnText: '#ffffff', radius: '8px', emoji: '🛍️', sampleDesc: 'Minimaliste', samplePrice: '129 €' },
  { key: 'street', label: 'Street', category: 'Bold', storeTypes: t('admin.appearanceSettingsForm.templates.options.street.storeTypes'), fontName: 'Anton', fontStyle: "'Anton', sans-serif", color: '#FACC15', bg: '#ffffff', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#fef9c3,#fde68a)', border: '#FACC15', textColor: '#000000', btnText: '#000000', radius: '0px', emoji: '👟', sampleDesc: 'Limited drop', samplePrice: '99 €' },
  { key: 'cozy', label: 'Cozy', category: 'Minimalist', storeTypes: t('admin.appearanceSettingsForm.templates.options.cozy.storeTypes'), fontName: 'Nunito', fontStyle: "'Nunito', sans-serif", color: '#A4C3B2', bg: '#F5F2EA', cardBg: '#F5F2EA', imgBg: 'linear-gradient(135deg,#d1fae5,#bbf7d0)', border: '#e8f0eb', textColor: '#475569', btnText: '#ffffff', radius: '16px', emoji: '🕯️', sampleDesc: 'Doux', samplePrice: '24 €' },
  { key: 'cyber', label: 'Cyber', category: 'Tech', storeTypes: t('admin.appearanceSettingsForm.templates.options.cyber.storeTypes'), fontName: 'Orbitron', fontStyle: "'Orbitron', sans-serif", color: '#F43F5E', bg: '#0d0515', cardBg: '#1a0a2e', imgBg: 'linear-gradient(135deg,#2d1b5e,#1a0a2e)', border: '#F43F5E', textColor: '#e9d5ff', btnText: '#ffffff', radius: '4px', emoji: '🤖', sampleDesc: 'Next-gen', samplePrice: '499 €' },
  { key: 'stationnery', label: 'Stationery', category: 'Minimalist', storeTypes: t('admin.appearanceSettingsForm.templates.options.stationnery.storeTypes'), fontName: 'Merriweather', fontStyle: "'Merriweather', serif", color: '#334155', bg: '#fdfbf7', cardBg: '#fdfbf7', imgBg: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', border: '#cbd5e1', textColor: '#1e293b', btnText: '#fdfbf7', radius: '2px', emoji: '📓', sampleDesc: 'Élégance', samplePrice: '18 €' },
  { key: 'food', label: 'Food', category: 'Bold', storeTypes: t('admin.appearanceSettingsForm.templates.options.food.storeTypes'), fontName: 'Nunito', fontStyle: "'Nunito', sans-serif", color: '#ea580c', bg: '#f5f5f4', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#ffedd5,#fed7aa)', border: '#e7e5e4', textColor: '#292524', btnText: '#ffffff', radius: '12px', emoji: '🍕', sampleDesc: 'Saveurs', samplePrice: '14 €' },
  { key: 'wellness', label: 'Wellness', category: 'Minimalist', storeTypes: t('admin.appearanceSettingsForm.templates.options.wellness.storeTypes'), fontName: 'Solway', fontStyle: "'Solway', serif", color: '#2A9D8F', bg: '#f8fafc', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#ccfbf1,#a7f3d0)', border: '#ccfbf1', textColor: '#475569', btnText: '#ffffff', radius: '12px', emoji: '🌿', sampleDesc: 'Bio', samplePrice: '22 €' },
  { key: 'playful', label: 'Playful', category: 'Bold', storeTypes: t('admin.appearanceSettingsForm.templates.options.playful.storeTypes'), fontName: 'Nunito', fontStyle: "'Nunito', sans-serif", color: '#9333EA', bg: '#faf5ff', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#f3e8ff,#e9d5ff)', border: '#e9d5ff', textColor: '#334155', btnText: '#ffffff', radius: '20px', emoji: '🧸', sampleDesc: 'Toys & Fun', samplePrice: '15 €' },
  { key: 'activewear', label: 'Activewear', category: 'Tech', storeTypes: t('admin.appearanceSettingsForm.templates.options.activewear.storeTypes'), fontName: 'Teko', fontStyle: "'Teko', sans-serif", color: '#EAB308', bg: '#000000', cardBg: '#111111', imgBg: 'linear-gradient(135deg,#1f2937,#000000)', border: '#333333', textColor: '#d1d5db', btnText: '#000000', radius: '0px', emoji: '⚡', sampleDesc: 'Performance', samplePrice: '89 €' },
  { key: 'chrono', label: 'Chrono Luxe', category: 'Luxury', storeTypes: t('admin.appearanceSettingsForm.templates.options.chrono.storeTypes'), fontName: 'Cormorant', fontStyle: "'Cormorant Garamond', serif", color: '#A67C52', bg: '#0E1117', cardBg: '#131720', imgBg: 'linear-gradient(135deg,#1A1F2E,#0B0E16)', border: 'rgba(212,197,169,0.18)', textColor: '#E8E0D5', btnText: '#ffffff', radius: '2px', emoji: '⌚', sampleDesc: 'Luxury', samplePrice: '3 500 €' },
  { key: 'maison', label: 'Maison', category: 'Minimalist', storeTypes: 'Déco · Maison · Art de vivre', fontName: 'Cormorant', fontStyle: "'Cormorant Garamond', serif", color: '#C17B4E', bg: '#FAF8F5', cardBg: '#FFFFFF', imgBg: 'linear-gradient(135deg,#F5F0EA,#EDE4D8)', border: 'rgba(212,196,180,0.5)', textColor: '#2C2420', btnText: '#ffffff', radius: '0px', emoji: '🏡', sampleDesc: 'Home & Déco', samplePrice: '2 800 DA' }
])

function handleSlugInput(e: Event) {
  const target = e.target as HTMLInputElement
  form.slug = target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

function showMessage(type: 'success' | 'error', text: string) {
  message.type = type
  message.text = text
  setTimeout(() => { message.text = '' }, 4000)
}

function openQuickView(key: string) {
  quickViewUrl.value = previewUrl.value ? `${previewUrl.value}?template=${key}` : ''
  showQuickView.value = true
}

function mockAiGenerate() {
  if (!form.logoUrl) {
    showMessage('error', t('admin.appearanceSettingsForm.brandAssets.logo.magicHint') || 'Upload a logo first to generate a brand identity.')
    return
  }
  loading.value = true
  setTimeout(() => {
    form.primaryColor = presetColors[Math.floor(Math.random() * presetColors.length)]
    form.templateKey = templates.value[Math.floor(Math.random() * templates.value.length)].key
    loading.value = false
    showMessage('success', t('admin.appearanceSettingsForm.brandAssets.logo.magicSuccess') || 'Magic identity applied.')
  }, 1000)
}

function updateForm(data: any) {
  if (!data) return
  form.name = data.name || ''
  form.slug = data.slug || ''
  form.logoUrl = data.logoUrl || null
  form.faviconUrl = data.faviconUrl || null
  form.primaryColor = data.primaryColor || '#C6F432'
  form.templateKey = data.templateKey || 'classic'
  initialFormString.value = JSON.stringify(form)
}

async function fetchSettings() {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/store-settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    updateForm(data)
  } catch (e) {
    console.error('Failed to load settings', e)
    showMessage('error', t('admin.appearanceSettingsForm.messages.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  message.text = ''
  try {
    const updated = await $fetch('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        name: form.name,
        slug: form.slug,
        primaryColor: form.primaryColor,
        templateKey: form.templateKey,
        logoUrl: form.logoUrl,
        faviconUrl: form.faviconUrl
      }
    })
    useState<any>('storeSettings').value = updated
    updateForm(updated)
    showMessage('success', t('admin.appearanceSettingsForm.messages.saved'))
  } catch (e: any) {
    console.error('Failed to save settings', e)
    showMessage('error', e.data?.statusMessage || t('admin.appearanceSettingsForm.messages.saveFailed'))
  } finally {
    saving.value = false
  }
}

function reset() {
  if (confirm(t('admin.appearanceSettingsForm.confirm.discard'))) {
    fetchSettings()
  }
}
</script>

<style scoped>
.appearance-form {
  padding-bottom: 120px;
}

/* Header actions */
.header-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid var(--surface-border);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.header-action-secondary {
  background: var(--surface-2);
  color: var(--text-secondary);
}

.header-action-secondary:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.header-action-magic {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(217, 70, 239, 0.18));
  border-color: rgba(168, 85, 247, 0.32);
  color: #c084fc;
}

.header-action-magic:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(217, 70, 239, 0.3));
  color: #e9d5ff;
}

.header-action-magic:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Status toast */
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

.appearance-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Fields */
.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

@media (max-width: 720px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: -0.005em;
}

.field-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  color: var(--text-primary);
  font-size: 13.5px;
  transition: all 0.15s ease;
}

.field-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(var(--brand-rgb) / 0.18);
}

.field-input-group {
  display: flex;
}

.field-input-group-main {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none;
}

.field-input-group-suffix {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  background: var(--surface-3);
  border: 1px solid var(--surface-border);
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
  font-size: 13px;
  color: var(--text-tertiary);
  font-family: ui-monospace, monospace;
}

.field-hint {
  font-size: 11.5px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

/* Brand rows */
.brand-rows {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.brand-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18px;
  align-items: stretch;
}

.brand-row-main {
  min-width: 0;
}

.brand-row-aside {
  width: 280px;
  flex-shrink: 0;
}

@media (max-width: 760px) {
  .brand-row {
    grid-template-columns: 1fr;
  }
  .brand-row-aside {
    width: 100%;
  }
}

.brand-color-row {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  background: var(--surface-1);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
}

.brand-color-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.brand-field-label-inline {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.005em;
}

.brand-field-hint-inline {
  font-size: 11.5px;
  color: var(--text-tertiary);
}

/* Color controls */
.color-controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.color-swatch {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--surface-border);
  cursor: pointer;
  overflow: hidden;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.color-swatch:hover {
  transform: translateY(-1px);
}

.color-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.color-swatch-icon {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 18px;
  height: 18px;
  color: white;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
  opacity: 0;
  transition: opacity 0.15s ease;
}

.color-swatch:hover .color-swatch-icon {
  opacity: 1;
}

.color-hex-input {
  width: 140px;
  flex-shrink: 0;
  font-family: ui-monospace, monospace;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.color-presets-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding-left: 8px;
  margin-left: 8px;
  border-left: 1px solid var(--surface-border);
}

.color-preset {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--surface-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.color-preset:hover {
  transform: scale(1.15);
}

.color-preset.is-active {
  box-shadow: 0 0 0 2px var(--surface-1), 0 0 0 4px var(--brand);
}

/* Templates */
.template-search {
  position: relative;
  display: flex;
  align-items: center;
  width: 240px;
  max-width: 100%;
}

.template-search-icon {
  position: absolute;
  left: 10px;
  width: 14px;
  height: 14px;
  color: var(--text-muted);
  pointer-events: none;
}

.template-search-input {
  width: 100%;
  padding: 8px 10px 8px 32px;
  font-size: 12.5px;
  border-radius: 9px;
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  color: var(--text-primary);
  transition: all 0.15s ease;
}

.template-search-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(var(--brand-rgb) / 0.16);
}

.template-filters {
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.template-filter {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 999px;
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.template-filter:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.template-filter.is-active {
  background: var(--text-primary);
  color: var(--surface-1);
  border-color: var(--text-primary);
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.template-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--surface-1);
  border: 2px solid var(--surface-border);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-family: inherit;
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
  border-color: color-mix(in srgb, var(--surface-border) 50%, var(--text-muted));
}

.template-card.is-selected {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(var(--brand-rgb) / 0.16), 0 12px 32px rgba(0, 0, 0, 0.22);
}

.template-card-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 5;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--brand);
  color: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(var(--brand-rgb) / 0.4);
}

.template-card-preview {
  position: relative;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.template-card-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent);
}

.template-card-mockup {
  width: 132px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}

.template-card-mockup-img {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}

.template-card-mockup-body {
  padding: 8px 9px 9px;
}

.template-card-mockup-name {
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-card-mockup-price {
  font-size: 10px;
  font-weight: 700;
  margin-top: 2px;
}

.template-card-mockup-cta {
  display: block;
  text-align: center;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 4px 0;
  margin-top: 6px;
}

.template-card-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.template-card:hover .template-card-overlay {
  opacity: 1;
}

.template-card-preview-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: white;
  color: #0a0a0a;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  transform: translateY(6px);
  transition: transform 0.2s ease;
}

.template-card:hover .template-card-preview-btn {
  transform: translateY(0);
}

.template-card-meta {
  padding: 12px 14px;
  background: var(--surface-2);
  border-top: 1px solid var(--surface-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.template-card-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.template-card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.template-card-category {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.template-card-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-card-pills {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.template-card-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 500;
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  color: var(--text-secondary);
  font-family: ui-monospace, monospace;
}

.template-card-pill-color {
  background: color-mix(in srgb, var(--c) 12%, transparent);
  border-color: color-mix(in srgb, var(--c) 32%, transparent);
  color: var(--c);
}

.template-card-pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.template-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--text-tertiary);
  font-size: 13px;
}

.template-empty-icon {
  width: 32px;
  height: 32px;
  color: var(--text-muted);
}

/* Quick view modal */
.quick-view-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(8px);
}

.quick-view-panel {
  width: 100%;
  max-width: 1100px;
  height: 90vh;
  background: var(--surface-2);
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}

.quick-view-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-1);
}

.quick-view-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.quick-view-close {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--surface-border);
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.quick-view-close:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.quick-view-body {
  flex: 1;
  position: relative;
  background: var(--surface-3);
}

.quick-view-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-tertiary);
}

.quick-view-spinner {
  width: 28px;
  height: 28px;
  animation: spin 0.9s linear infinite;
  color: var(--text-muted);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.quick-view-iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .quick-view-panel,
.modal-leave-to .quick-view-panel {
  transform: scale(0.96);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .quick-view-panel,
.modal-leave-active .quick-view-panel {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
