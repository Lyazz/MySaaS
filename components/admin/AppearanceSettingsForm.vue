<template>
  <div class="appearance-form">
    <SettingsPageHeader
      data-tour="settings-appearance-tab"
      :title="t('admin.pages.settings.appearance.title') || 'Appearance'"
      :subtitle="t('admin.pages.settings.appearance.subtitle') || 'Manage your store identity, brand assets, and storefront template.'"
    >
      <template #actions>
        <a
          v-if="previewUrl"
          :href="previewUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="header-action"
        >
          <Icon
            name="lucide:external-link"
            class="w-3.5 h-3.5"
          />
          <span>{{ t('admin.actions.viewStore') || 'View store' }}</span>
        </a>
        <button
          type="button"
          class="header-action header-action-magic"
          :disabled="loading"
          @click="mockAiGenerate"
        >
          <Icon
            name="lucide:sparkles"
            class="w-3.5 h-3.5"
          />
          <span>{{ t('admin.appearanceSettingsForm.brandAssets.logo.magicIdentity') || 'Magic identity' }}</span>
        </button>
      </template>
    </SettingsPageHeader>

    <SettingsStatus
      :message="message.text"
      :type="message.type || 'success'"
    />

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
            <p class="field-hint">
              {{ t('admin.appearanceSettingsForm.identity.slug.hint') }}
            </p>
          </div>
        </div>
      </SettingsSection>

      <!-- Brand -->
      <SettingsSection
        data-tour="settings-color"
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
              <p class="brand-field-label-inline">
                {{ t('admin.appearanceSettingsForm.brandAssets.primaryColor.label') }}
              </p>
              <p class="brand-field-hint-inline">
                {{ t('admin.appearanceSettingsForm.brandAssets.primaryColor.hint') }}
              </p>
            </div>
            <div class="color-controls">
              <label
                class="color-swatch"
                :style="{ background: form.primaryColor }"
              >
                <input
                  :value="form.primaryColor"
                  type="color"
                  class="color-input"
                  @input="handlePrimaryColorInput"
                >
                <Icon
                  name="lucide:pipette"
                  class="color-swatch-icon"
                />
              </label>
              <input
                :value="form.primaryColor"
                type="text"
                pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                class="field-input color-hex-input"
                placeholder="#C6F432"
                @input="handlePrimaryColorInput"
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
                  @click="setPrimaryColor(color)"
                >
                  <Icon
                    v-if="form.primaryColor === color"
                    name="lucide:check"
                    class="w-3.5 h-3.5"
                  />
                </button>
              </div>
            </div>
            <label class="brand-color-toggle">
              <input
                v-model="form.useBrandColor"
                type="checkbox"
                class="brand-color-toggle-input"
              >
              <span class="brand-color-toggle-track">
                <span class="brand-color-toggle-thumb" />
              </span>
              <span class="brand-color-toggle-copy">
                <span>{{ t('admin.appearanceSettingsForm.brandAssets.primaryColor.overrideLabel') }}</span>
                <small>{{ t('admin.appearanceSettingsForm.brandAssets.primaryColor.overrideHint') }}</small>
              </span>
            </label>
          </div>
        </div>
      </SettingsSection>

      <!-- Templates -->
      <SettingsSection
        data-tour="settings-template"
        anchor-id="templates"
        icon="lucide:layout-template"
        :title="t('admin.appearanceSettingsForm.templates.title')"
        :subtitle="t('admin.appearanceSettingsForm.templates.subtitle')"
      >
        <template #aside>
          <div class="tpl-search">
            <Icon
              name="lucide:search"
              class="tpl-search-icon"
            />
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="t('admin.appearanceSettingsForm.templates.searchPlaceholder')"
              :aria-label="t('admin.appearanceSettingsForm.templates.searchPlaceholder')"
              class="tpl-search-input"
            >
          </div>
        </template>

        <!--
          What is published right now, stated plainly. Merchants switch template
          and forget they never saved; this strip is where they find out, and it
          carries the one link to the real storefront (the old preview button
          only appeared on hover, so touch users never saw it at all).
        -->
        <div class="tpl-live">
          <span
            class="tpl-live-chip"
            :style="plateVars(liveTemplate)"
          >
            <span
              class="tpl-live-chip-letter"
              :style="{ fontFamily: liveTemplate.display }"
            >{{ brandInitial }}</span>
          </span>
          <div class="tpl-live-text">
            <p class="tpl-live-label">
              {{ t('admin.appearanceSettingsForm.templates.liveNow') }}
            </p>
            <p class="tpl-live-name">
              {{ templateLabel(liveTemplate) }}
            </p>
          </div>
          <p
            v-if="pendingTemplate"
            class="tpl-live-pending"
          >
            <Icon
              name="lucide:arrow-right"
              class="tpl-live-pending-arrow"
            />
            {{ t('admin.appearanceSettingsForm.templates.pending', { name: templateLabel(pendingTemplate) }) }}
          </p>
          <button
            type="button"
            class="settings-btn tpl-live-action"
            :disabled="!previewUrl"
            :title="previewUrl ? undefined : t('admin.appearanceSettingsForm.templates.previewNeedsSlug')"
            @click="openQuickView(form.templateKey)"
          >
            <Icon
              name="lucide:monitor-play"
              class="w-4 h-4"
            />
            {{ t('admin.appearanceSettingsForm.templates.previewStore') }}
          </button>
        </div>

        <div class="tpl-filters">
          <button
            v-for="cat in categories"
            :key="cat.value"
            type="button"
            class="tpl-filter"
            :class="{ 'is-active': selectedCategory === cat.value }"
            :aria-pressed="selectedCategory === cat.value"
            @click="selectedCategory = cat.value"
          >
            {{ cat.label }}
            <span class="tpl-filter-count">{{ cat.count }}</span>
          </button>
        </div>

        <!--
          A radiogroup, not a row of buttons: picking a template is one exclusive
          choice, and arrow keys have to walk the grid for keyboard users.
        -->
        <div
          v-if="filteredTemplates.length"
          class="tpl-grid"
          role="radiogroup"
          :aria-label="t('admin.appearanceSettingsForm.templates.title')"
        >
          <div
            v-for="(tpl, index) in filteredTemplates"
            :key="tpl.key"
            :ref="el => setCardRef(el, index)"
            role="radio"
            :aria-checked="form.templateKey === tpl.key"
            :tabindex="cardTabIndex(tpl, index)"
            class="tpl-card"
            :class="{ 'is-selected': form.templateKey === tpl.key }"
            @click="form.templateKey = tpl.key"
            @keydown="onCardKeydown($event, index)"
          >
            <!--
              The specimen: the merchant's own store name set in the template's
              real display face, over the template's real surfaces, with the
              shelf drawn at its real corner radius. Every value here comes from
              the template's own tokens — nothing is invented for the thumbnail.
            -->
            <div
              class="tpl-plate"
              :style="plateVars(tpl)"
              aria-hidden="true"
            >
              <div class="tpl-plate-bar">
                <span class="tpl-plate-mark" />
                <span class="tpl-plate-links">
                  <i /><i /><i />
                </span>
              </div>

              <div class="tpl-plate-hero">
                <p
                  class="tpl-plate-brand"
                  :style="brandStyle(tpl)"
                >
                  {{ brandName }}
                </p>
                <p class="tpl-plate-tagline">
                  {{ t('admin.appearanceSettingsForm.templates.sampleTagline') }}
                </p>
              </div>

              <div class="tpl-plate-shelf">
                <span
                  v-for="i in 3"
                  :key="i"
                  class="tpl-plate-tile"
                />
              </div>
              <span class="tpl-plate-cta" />
            </div>

            <div class="tpl-body">
              <div class="tpl-body-head">
                <p class="tpl-name">
                  {{ templateLabel(tpl) }}
                </p>
                <span
                  v-if="form.templateKey === tpl.key"
                  class="tpl-check"
                >
                  <Icon
                    name="lucide:check"
                    class="w-3 h-3"
                  />
                  {{ tpl.key === savedTemplateKey
                    ? t('admin.appearanceSettingsForm.templates.liveNow')
                    : t('admin.appearanceSettingsForm.templates.selected') }}
                </span>
              </div>

              <p class="tpl-desc">
                {{ templateText(tpl, 'description') }}
              </p>

              <p class="tpl-fit">
                <span class="tpl-fit-label">{{ t('admin.appearanceSettingsForm.templates.bestFor') }}</span>
                {{ templateText(tpl, 'storeTypes') }}
              </p>

              <div class="tpl-foot">
                <div class="tpl-traits">
                  <span class="tpl-trait">{{ t('admin.appearanceSettingsForm.templates.moods.' + tpl.mood) }}</span>
                  <span class="tpl-trait">{{ t('admin.appearanceSettingsForm.templates.voices.' + tpl.voice) }}</span>
                </div>
                <button
                  type="button"
                  class="tpl-preview-btn"
                  :disabled="!previewUrl"
                  :title="previewUrl ? undefined : t('admin.appearanceSettingsForm.templates.previewNeedsSlug')"
                  @click.stop="openQuickView(tpl.key)"
                >
                  <Icon
                    name="lucide:eye"
                    class="w-3.5 h-3.5"
                  />
                  {{ t('admin.appearanceSettingsForm.templates.quickView') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="tpl-empty"
        >
          <Icon
            name="lucide:search-x"
            class="tpl-empty-icon"
          />
          <p class="tpl-empty-title">
            {{ t('admin.appearanceSettingsForm.templates.emptyTitle') }}
          </p>
          <button
            type="button"
            class="settings-btn"
            @click="clearFilters"
          >
            {{ t('admin.appearanceSettingsForm.templates.emptyAction') }}
          </button>
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
        <div
          v-if="showQuickView"
          class="quick-view-modal"
          @click.self="showQuickView = false"
        >
          <div class="quick-view-panel">
            <header class="quick-view-head">
              <div class="quick-view-head-left">
                <Icon
                  name="lucide:monitor"
                  class="w-4 h-4"
                  style="color: var(--text-muted)"
                />
                <h3>{{ quickViewTemplateName }}</h3>
              </div>
              <button
                class="quick-view-close"
                :aria-label="t('admin.common.close') || 'Close'"
                @click="showQuickView = false"
              >
                <Icon
                  name="lucide:x"
                  class="w-4 h-4"
                />
              </button>
            </header>
            <div class="quick-view-body">
              <div
                v-if="!quickViewUrl"
                class="quick-view-loading"
              >
                <Icon
                  name="lucide:loader-2"
                  class="quick-view-spinner"
                />
                <p>{{ t('admin.common.loading') || 'Loading preview…' }}</p>
              </div>
              <iframe
                v-if="quickViewUrl"
                :src="quickViewUrl"
                class="quick-view-iframe"
              />
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
import SettingsStatus from './settings/SettingsStatus.vue'
import BrandImageField from './settings/BrandImageField.vue'
import { normalizeHexColor } from '~/shared/storefront/template-brand'

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
  useBrandColor: false,
  templateKey: 'classic'
})

const initialFormString = ref(JSON.stringify(form))
const isDirty = computed(() => initialFormString.value !== JSON.stringify(form))

/*
 * The storefront themes, described by the tokens the picker actually paints
 * with: surfaces, ink, accent, corner radius and the real display face. The
 * thumbnails are drawn from these values rather than from screenshots, so a
 * theme can never drift away from the way it is advertised here.
 *
 * `mood` and `voice` are the two things a merchant can reason about at a
 * glance (is it dark? is it a serif?) and drive the trait tags.
 */
type StoreTemplate = {
  key: string
  category: string
  mood: 'dark' | 'light'
  voice: 'serif' | 'sans' | 'display'
  display: string
  color: string
  bg: string
  surface: string
  border: string
  ink: string
  inkSoft: string
  radius: string
}

const templates: StoreTemplate[] = [
  { key: 'classic', category: 'classic', mood: 'light', voice: 'serif', display: "'Alice', serif", color: '#0f172a', bg: '#f8fafc', surface: '#ffffff', border: '#e2e8f0', ink: '#0f172a', inkSoft: '#64748b', radius: '4px' },
  { key: 'modern', category: 'minimalist', mood: 'light', voice: 'sans', display: "'Outfit', system-ui, sans-serif", color: '#0d9488', bg: '#f8fafc', surface: '#ffffff', border: '#e2e8f0', ink: '#0f172a', inkSoft: '#64748b', radius: '8px' },
  { key: 'street', category: 'bold', mood: 'light', voice: 'display', display: "'Anton', sans-serif", color: '#facc15', bg: '#ffffff', surface: '#ffffff', border: '#111111', ink: '#000000', inkSoft: '#52525b', radius: '0px' },
  { key: 'cozy', category: 'minimalist', mood: 'light', voice: 'sans', display: "'Nunito', sans-serif", color: '#a4c3b2', bg: '#f5f2ea', surface: '#fffdf8', border: '#e0dccf', ink: '#3f3a33', inkSoft: '#736a5e', radius: '16px' },
  { key: 'cyber', category: 'tech', mood: 'dark', voice: 'display', display: "'Orbitron', sans-serif", color: '#f43f5e', bg: '#0d0515', surface: '#1a0a2e', border: '#3b1d63', ink: '#f5e9ff', inkSoft: '#a78bd0', radius: '4px' },
  { key: 'stationnery', category: 'minimalist', mood: 'light', voice: 'serif', display: "'Merriweather', serif", color: '#334155', bg: '#fdfbf7', surface: '#ffffff', border: '#d9d2c5', ink: '#1e293b', inkSoft: '#7c7365', radius: '2px' },
  { key: 'food', category: 'bold', mood: 'light', voice: 'sans', display: "'Nunito', sans-serif", color: '#ea580c', bg: '#f5f5f4', surface: '#ffffff', border: '#e7e5e4', ink: '#292524', inkSoft: '#66605b', radius: '12px' },
  { key: 'wellness', category: 'minimalist', mood: 'light', voice: 'serif', display: "'Fraunces', serif", color: '#84cc16', bg: '#f1f2ec', surface: '#fcfcf9', border: '#d4d5cb', ink: '#1b1a16', inkSoft: '#6b6c61', radius: '0px' },
  { key: 'playful', category: 'bold', mood: 'light', voice: 'sans', display: "'Nunito', sans-serif", color: '#9333ea', bg: '#faf5ff', surface: '#ffffff', border: '#e9d5ff', ink: '#3b0764', inkSoft: '#7e5aa6', radius: '20px' },
  { key: 'activewear', category: 'tech', mood: 'dark', voice: 'display', display: "'Teko', sans-serif", color: '#eab308', bg: '#000000', surface: '#111111', border: '#2a2a2a', ink: '#f5f5f5', inkSoft: '#9ca3af', radius: '0px' },
  { key: 'arena', category: 'tech', mood: 'dark', voice: 'sans', display: "'Outfit', system-ui, sans-serif", color: '#00b8fc', bg: '#030508', surface: '#0b0f14', border: '#133246', ink: '#e2e8f0', inkSoft: '#7d93a6', radius: '6px' },
  { key: 'chrono', category: 'luxury', mood: 'dark', voice: 'serif', display: "'Cormorant Garamond', serif", color: '#a67c52', bg: '#0e1117', surface: '#131720', border: 'rgba(212,197,169,0.22)', ink: '#e8e0d5', inkSoft: '#9a9082', radius: '2px' },
  { key: 'maison', category: 'luxury', mood: 'light', voice: 'serif', display: "'Fraunces', serif", color: '#0b4a25', bg: '#fbf3e6', surface: '#fff9ea', border: 'rgba(196,163,105,0.55)', ink: '#1d2419', inkSoft: '#5f6555', radius: '28px' },
  { key: 'nour', category: 'elegant', mood: 'light', voice: 'serif', display: "'Marcellus', serif", color: '#7a3b46', bg: '#faf3ea', surface: '#fffdf9', border: 'rgba(201,162,75,0.4)', ink: '#2e1e20', inkSoft: '#725d57', radius: '20px' },
  { key: 'embellir', category: 'elegant', mood: 'light', voice: 'serif', display: "'Bodoni Moda', Didot, serif", color: '#0e3f3a', bg: '#f2ece1', surface: '#fdfaf4', border: '#cbbdab', ink: '#16211e', inkSoft: '#5a6763', radius: '2px' }
]

/*
 * Four of the display faces (Teko, Cormorant, Marcellus, Bodoni Moda) only ship inside the
 * storefront themes that use them, so the admin has to ask for them itself —
 * otherwise those specimens silently fall back and misrepresent the theme.
 */
useHead({
  link: [{
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500&family=Cormorant+Garamond:wght@400;500;600&family=Marcellus&family=Teko:wght@400;500;600&display=swap'
  }]
})

const selectedCategory = ref('all')
const searchQuery = ref('')

/*
 * Derived from the templates themselves. The old hard-coded list was missing
 * `Elegant`, which left Nour unreachable behind every filter but "All".
 */
const categories = computed(() => {
  const seen: string[] = []
  for (const tpl of templates) {
    if (!seen.includes(tpl.category)) seen.push(tpl.category)
  }
  return [
    { value: 'all', label: t('admin.appearanceSettingsForm.templates.categories.all'), count: templates.length },
    ...seen.map(value => ({
      value,
      label: t('admin.appearanceSettingsForm.templates.categories.' + value),
      count: templates.filter(tpl => tpl.category === value).length
    }))
  ]
})

function templateText(tpl: StoreTemplate, field: 'label' | 'description' | 'storeTypes') {
  return t('admin.appearanceSettingsForm.templates.options.' + tpl.key + '.' + field)
}

function templateLabel(tpl: StoreTemplate) {
  return templateText(tpl, 'label')
}

const filteredTemplates = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return templates.filter((tpl) => {
    if (selectedCategory.value !== 'all' && tpl.category !== selectedCategory.value) return false
    if (!q) return true
    return [
      templateLabel(tpl),
      templateText(tpl, 'description'),
      templateText(tpl, 'storeTypes'),
      t('admin.appearanceSettingsForm.templates.categories.' + tpl.category)
    ].some(value => value.toLowerCase().includes(q))
  })
})


const filteredHasSelection = computed(() =>
  filteredTemplates.value.some(tpl => tpl.key === form.templateKey)
)

function clearFilters() {
  selectedCategory.value = 'all'
  searchQuery.value = ''
}

/* What is published (savedTemplateKey) versus what is merely picked (form). */
const savedTemplateKey = ref('classic')

function templateByKey(key: string) {
  return templates.find(tpl => tpl.key === key) || templates[0]
}

const liveTemplate = computed(() => templateByKey(savedTemplateKey.value))

const quickViewTemplateName = computed(() =>
  quickViewKey.value
    ? templateLabel(templateByKey(quickViewKey.value))
    : t('admin.appearanceSettingsForm.templates.quickView')
)

const pendingTemplate = computed(() =>
  form.templateKey === savedTemplateKey.value ? null : templateByKey(form.templateKey)
)

/* The store's own name is the specimen text; fall back before settings load. */
const brandName = computed(() =>
  form.name.trim() || t('admin.appearanceSettingsForm.templates.sampleBrand')
)

const brandInitial = computed(() => Array.from(brandName.value)[0] || 'S')

function plateVars(tpl: StoreTemplate) {
  return {
    '--tpl-bg': tpl.bg,
    '--tpl-surface': tpl.surface,
    '--tpl-border': tpl.border,
    '--tpl-ink': tpl.ink,
    '--tpl-ink-soft': tpl.inkSoft,
    '--tpl-accent': templateAccent(tpl),
    '--tpl-radius': tpl.radius
  }
}

/* Long store names shrink rather than truncate — the whole name is the point. */
function brandStyle(tpl: StoreTemplate) {
  const length = brandName.value.length
  const size = length > 22 ? 14 : length > 16 ? 17 : length > 10 ? 20 : 24
  return { fontFamily: tpl.display, '--tpl-brand-size': size + 'px' }
}

/* ── Radiogroup keyboard handling ───────────────────────────────────── */

const cardRefs = ref<HTMLElement[]>([])

function setCardRef(el: unknown, index: number) {
  if (el instanceof HTMLElement) cardRefs.value[index] = el
}

/*
 * Exactly one card is in the tab order. Normally that is the selected one, but
 * when a filter hides it the group would become unreachable, so the first card
 * takes over.
 */
function cardTabIndex(tpl: StoreTemplate, index: number) {
  if (form.templateKey === tpl.key) return 0
  return index === 0 && !filteredHasSelection.value ? 0 : -1
}

function onCardKeydown(event: KeyboardEvent, index: number) {
  const list = filteredTemplates.value
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    form.templateKey = list[index].key
    return
  }
  /* Horizontal arrows follow reading order, so they flip under Arabic. */
  const inline = typeof document !== 'undefined' && document.dir === 'rtl' ? -1 : 1
  let step = 0
  if (event.key === 'ArrowDown') step = 1
  else if (event.key === 'ArrowUp') step = -1
  else if (event.key === 'ArrowRight') step = inline
  else if (event.key === 'ArrowLeft') step = -inline
  if (!step) return
  event.preventDefault()
  const next = (index + step + list.length) % list.length
  form.templateKey = list[next].key
  nextTick(() => cardRefs.value[next]?.focus())
}

const showQuickView = ref(false)
const quickViewUrl = ref('')
const quickViewKey = ref('')
const baseDomain = ref('')

const previewUrl = computed(() => {
  if (!form.slug || !baseDomain.value) return null
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:'
  return `${protocol}//${form.slug}.${baseDomain.value}`
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
})


function handleSlugInput(e: Event) {
  const target = e.target as HTMLInputElement
  form.slug = target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

function setPrimaryColor(color: string) {
  form.primaryColor = color
  form.useBrandColor = true
}

function handlePrimaryColorInput(e: Event) {
  const target = e.target as HTMLInputElement
  setPrimaryColor(target.value)
}

function templateAccent(tpl: { color: string }) {
  return form.useBrandColor ? (normalizeHexColor(form.primaryColor) || tpl.color) : tpl.color
}

function showMessage(type: 'success' | 'error', text: string) {
  message.type = type
  message.text = text
  setTimeout(() => { message.text = '' }, 4000)
}

function openQuickView(key: string) {
  if (!previewUrl.value) {
    showMessage('error', t('admin.appearanceSettingsForm.templates.previewNeedsSlug'))
    return
  }
  quickViewKey.value = key
  quickViewUrl.value = `${previewUrl.value}?template=${key}`
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
    form.templateKey = templates[Math.floor(Math.random() * templates.length)].key
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
  form.useBrandColor = data.useBrandColor === true
  form.templateKey = data.templateKey || 'classic'
  savedTemplateKey.value = form.templateKey
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
        useBrandColor: form.useBrandColor,
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
  fetchSettings()
}
</script>

<style scoped>

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

.appearance-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Brand rows */
.brand-rows {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.brand-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: stretch;
}

.brand-row-main {
  flex: 2 1 320px;
  min-width: 0;
}

.brand-row-aside {
  flex: 1 1 260px;
  min-width: 220px;
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

.brand-color-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--surface-border);
  border-radius: 10px;
  background: var(--surface-2);
  cursor: pointer;
}

.brand-color-toggle-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.brand-color-toggle-track {
  width: 42px;
  height: 24px;
  padding: 2px;
  border-radius: 999px;
  background: var(--surface-3);
  border: 1px solid var(--surface-border);
  transition: background 0.15s ease, border-color 0.15s ease;
  flex-shrink: 0;
}

.brand-color-toggle-thumb {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--text-muted);
  transition: transform 0.15s ease, background 0.15s ease;
}

.brand-color-toggle-input:checked + .brand-color-toggle-track {
  background: rgba(var(--brand-rgb) / 0.18);
  border-color: rgba(var(--brand-rgb) / 0.38);
}

.brand-color-toggle-input:checked + .brand-color-toggle-track .brand-color-toggle-thumb {
  transform: translateX(18px);
  background: var(--brand);
}

.brand-color-toggle-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.brand-color-toggle-copy span {
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 700;
}

.brand-color-toggle-copy small {
  color: var(--text-tertiary);
  font-size: 11.5px;
  line-height: 1.45;
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

/* ── Template picker ───────────────────────────────────────────────────
 *
 * Fourteen storefront themes, each with its own palette and typeface, laid out
 * inside a dark admin. The frame is therefore kept deliberately quiet — hairline
 * borders, one neutral surface, no shadows of its own — so the only saturated
 * colour on screen is the templates' and the lime selection ring. Every plate
 * paints itself from --tpl-* custom properties set inline from the template's
 * real design tokens.
 */

.tpl-search {
  position: relative;
  width: min(260px, 100%);
}

.tpl-search-icon {
  position: absolute;
  inset-inline-start: 11px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  color: var(--text-muted);
  pointer-events: none;
}

.tpl-search-input {
  width: 100%;
  padding: 9px 12px;
  padding-inline-start: 34px;
  border-radius: 10px;
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.tpl-search-input::placeholder {
  color: var(--text-muted);
}

.tpl-search-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(var(--brand-rgb) / 0.18);
}

/* ── Live strip ─────────────────────────────────────────────────────── */

.tpl-live {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 12px 14px;
  margin-block-end: 20px;
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  background: var(--surface-1);
}

/* A one-letter specimen of the published theme: same trick as the cards. */
.tpl-live-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  border: 1px solid var(--tpl-border);
  background: var(--tpl-bg);
  overflow: hidden;
}

.tpl-live-chip-letter {
  font-size: 19px;
  line-height: 1;
  color: var(--tpl-accent);
}

.tpl-live-text {
  min-width: 0;
}

.tpl-live-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.tpl-live-name {
  margin-block-start: 2px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.tpl-live-pending {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.tpl-live-pending-arrow {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--text-muted);
}

[dir='rtl'] .tpl-live-pending-arrow {
  transform: scaleX(-1);
}

.tpl-live-action {
  margin-inline-start: auto;
}

/* ── Filters ────────────────────────────────────────────────────────── */

.tpl-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-block-end: 18px;
}

.tpl-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 6px 12px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  border-radius: 999px;
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.tpl-filter:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.tpl-filter.is-active {
  background: var(--text-primary);
  border-color: var(--text-primary);
  color: var(--surface-1);
}

.tpl-filter-count {
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--text-tertiary);
}

.tpl-filter.is-active .tpl-filter-count {
  background: rgba(0, 0, 0, 0.16);
  color: inherit;
}

/* ── Grid + card ────────────────────────────────────────────────────── */

.tpl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(268px, 100%), 1fr));
  gap: 16px;
}

.tpl-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  background: var(--surface-1);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.tpl-card:hover {
  border-color: var(--surface-border-hover);
  transform: translateY(-2px);
}

.tpl-card.is-selected {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(var(--brand-rgb) / 0.28);
}

/* ── The specimen plate ─────────────────────────────────────────────── */

.tpl-plate {
  position: relative;
  height: 176px;
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  background: var(--tpl-bg);
  border-block-end: 1px solid var(--surface-border);
  overflow: hidden;
}

.tpl-plate-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-block-end: 9px;
  border-block-end: 1px solid var(--tpl-border);
}

.tpl-plate-mark {
  width: 14px;
  height: 5px;
  border-radius: 999px;
  background: var(--tpl-accent);
}

.tpl-plate-links {
  display: flex;
  gap: 5px;
}

.tpl-plate-links i {
  width: 12px;
  height: 3px;
  border-radius: 999px;
  background: var(--tpl-ink-soft);
  opacity: 0.5;
}

.tpl-plate-hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  text-align: center;
  padding-block: 4px;
}

/*
 * The signature. The merchant's own store name, in the template's real display
 * face — 14 cards become 14 readings of their brand rather than 14 tinted
 * rectangles. Size is set inline and shrinks with the name's length.
 */
.tpl-plate-brand {
  max-width: 100%;
  font-size: var(--tpl-brand-size, 22px);
  line-height: 1.1;
  color: var(--tpl-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tpl-plate-tagline {
  font-size: 8.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--tpl-ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/*
 * The shelf shows the two things a still image can honestly show about layout:
 * the template's corner radius and how heavy its card borders are.
 */
.tpl-plate-shelf {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.tpl-plate-tile {
  height: 30px;
  border-radius: var(--tpl-radius);
  border: 1px solid var(--tpl-border);
  background: var(--tpl-surface);
}

.tpl-plate-cta {
  height: 8px;
  width: 46%;
  margin-block-start: 7px;
  margin-inline: auto;
  border-radius: var(--tpl-radius);
  background: var(--tpl-accent);
}

/* ── Card body ──────────────────────────────────────────────────────── */

.tpl-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 13px 14px 14px;
}

.tpl-body-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tpl-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpl-check {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--brand);
  color: var(--brand-contrast);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.tpl-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tpl-fit {
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tpl-fit-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.tpl-fit-label::after {
  content: ' · ';
}

.tpl-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-block-start: auto;
  padding-block-start: 11px;
  border-block-start: 1px solid var(--surface-border);
}

.tpl-traits {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.tpl-trait {
  padding: 2.5px 8px;
  border-radius: 999px;
  border: 1px solid var(--surface-border);
  font-size: 10.5px;
  font-weight: 500;
  color: var(--text-secondary);
}

.tpl-preview-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.tpl-preview-btn:hover:not(:disabled) {
  background: var(--nav-hover-bg);
  border-color: var(--surface-border);
  color: var(--text-primary);
}

.tpl-preview-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Empty state ────────────────────────────────────────────────────── */

.tpl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 20px;
  border: 1px dashed var(--surface-border);
  border-radius: 14px;
  text-align: center;
}

.tpl-empty-icon {
  width: 26px;
  height: 26px;
  color: var(--text-muted);
}

.tpl-empty-title {
  font-size: 13px;
  color: var(--text-secondary);
}

@media (pointer: coarse) {
  .tpl-preview-btn {
    min-height: 44px;
    padding: 10px 12px;
  }

  .tpl-filter {
    min-height: 44px;
  }
}

/* Narrow: the strip stacks, so the action stops hugging the inline end. */
@media (max-width: 520px) {
  .tpl-live-action {
    margin-inline-start: 0;
    width: 100%;
  }

  .tpl-live-pending {
    width: 100%;
  }
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
