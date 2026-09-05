<template>
  <div class="template-builder-page">
    <header class="builder-header">
      <div>
        <p class="builder-kicker">
          Test screen
        </p>
        <h1>Store template builder</h1>
        <p>
          Select any registered storefront template, customize the shared style layer, and preview the real storefront components without saving changes.
        </p>
      </div>

      <div class="builder-header-actions">
        <button
          type="button"
          class="builder-icon-button"
          aria-label="Reset builder"
          @click="resetBuilder"
        >
          <Icon
            name="lucide:rotate-ccw"
            class="h-4 w-4"
          />
        </button>
        <button
          type="button"
          class="builder-primary-action"
          @click="copyConfig"
        >
          <Icon
            name="lucide:copy"
            class="h-4 w-4"
          />
          <span>{{ copied ? 'Copied' : 'Copy config' }}</span>
        </button>
      </div>
    </header>

    <div class="builder-grid">
      <aside class="builder-sidebar">
        <section class="builder-panel">
          <div class="panel-head">
            <div>
              <h2>Templates</h2>
              <p>Using the real storefront registry.</p>
            </div>
            <span>{{ templateCatalog.length }}</span>
          </div>

          <div class="template-list">
            <button
              v-for="template in templateCatalog"
              :key="template.key"
              type="button"
              class="template-option"
              :class="{ 'is-active': settings.templateKey === template.key }"
              @click="selectTemplate(template)"
            >
              <span
                class="template-mark"
                :style="{ '--template-color': template.primary, '--template-bg': template.bg }"
              >
                {{ template.short }}
              </span>
              <span class="template-copy">
                <strong>{{ template.name }}</strong>
                <small>{{ template.fit }}</small>
              </span>
              <Icon
                v-if="settings.templateKey === template.key"
                name="lucide:check"
                class="h-4 w-4"
              />
            </button>
          </div>
        </section>

        <section class="builder-panel">
          <div class="panel-head compact">
            <div>
              <h2>Customize</h2>
              <p>Common layer over every template.</p>
            </div>
          </div>

          <div class="control-section">
            <div class="section-title">
              <Icon
                name="lucide:palette"
                class="h-4 w-4"
              />
              <span>Brand colors</span>
            </div>
            <div class="color-row">
              <label>
                <span>Primary</span>
                <input
                  v-model="settings.primary"
                  type="color"
                >
              </label>
              <label>
                <span>Accent</span>
                <input
                  v-model="settings.accent"
                  type="color"
                >
              </label>
            </div>
          </div>

          <div class="control-section">
            <div class="section-title">
              <Icon
                name="lucide:type"
                class="h-4 w-4"
              />
              <span>Font override</span>
            </div>
            <div class="choice-grid two">
              <button
                v-for="font in fontOptions"
                :key="font.value"
                type="button"
                class="choice-button"
                :class="{ 'is-active': settings.font === font.value }"
                :style="{ fontFamily: font.stack }"
                @click="settings.font = font.value"
              >
                {{ font.label }}
              </button>
            </div>
          </div>

          <div class="control-section">
            <div class="section-title">
              <Icon
                name="lucide:corner-down-right"
                class="h-4 w-4"
              />
              <span>Roundness</span>
            </div>
            <label class="range-field">
              <span>Buttons <strong>{{ settings.buttonRadius }}px</strong></span>
              <input
                v-model.number="settings.buttonRadius"
                type="range"
                min="0"
                max="32"
                step="2"
              >
            </label>
            <label class="range-field">
              <span>Cards <strong>{{ settings.cardRadius }}px</strong></span>
              <input
                v-model.number="settings.cardRadius"
                type="range"
                min="0"
                max="44"
                step="2"
              >
            </label>
          </div>

          <div class="control-section">
            <div class="section-title">
              <Icon
                name="lucide:panel-top"
                class="h-4 w-4"
              />
              <span>Header style</span>
            </div>
            <div class="segmented">
              <button
                v-for="option in headerOptions"
                :key="option.value"
                type="button"
                :class="{ 'is-active': settings.headerStyle === option.value }"
                @click="settings.headerStyle = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="control-section">
            <div class="section-title">
              <Icon
                name="lucide:shopping-bag"
                class="h-4 w-4"
              />
              <span>Product card style</span>
            </div>
            <div class="segmented">
              <button
                v-for="option in productViewOptions"
                :key="option.value"
                type="button"
                :class="{ 'is-active': settings.productView === option.value }"
                @click="settings.productView = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="control-section">
            <div class="section-title">
              <Icon
                name="lucide:paintbrush"
                class="h-4 w-4"
              />
              <span>Background style</span>
            </div>
            <div class="choice-grid">
              <button
                v-for="option in backgroundOptions"
                :key="option.value"
                type="button"
                class="choice-button"
                :class="{ 'is-active': settings.backgroundStyle === option.value }"
                @click="settings.backgroundStyle = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </section>
      </aside>

      <main class="preview-panel">
        <div class="preview-toolbar">
          <div>
            <h2>{{ activeTemplate.name }} live preview</h2>
            <p>{{ activeTemplate.fit }} · {{ surfaceLabel }}</p>
          </div>

          <div class="toolbar-controls">
            <div class="segmented compact">
              <button
                v-for="surface in surfaceOptions"
                :key="surface.value"
                type="button"
                :class="{ 'is-active': settings.surface === surface.value }"
                @click="settings.surface = surface.value"
              >
                {{ surface.label }}
              </button>
            </div>

            <div class="device-toggle">
              <button
                v-for="mode in previewModes"
                :key="mode.value"
                type="button"
                :class="{ 'is-active': settings.previewMode === mode.value }"
                :aria-label="mode.label"
                @click="settings.previewMode = mode.value"
              >
                <Icon
                  :name="mode.icon"
                  class="h-4 w-4"
                />
              </button>
            </div>
          </div>
        </div>

        <div class="preview-stage">
          <div
            class="device-frame"
            :class="`is-${settings.previewMode}`"
          >
            <iframe
              :key="previewUrl"
              :src="previewUrl"
              title="Store template live preview"
              class="preview-iframe"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>

        <div class="builder-notes">
          <div>
            <strong>Rendered components</strong>
            <span>StoreShell, Home, Shop, ThemeProvider, and ProductCard from the existing registry.</span>
          </div>
          <div>
            <strong>Persistence</strong>
            <span>None. This route only passes query params into an isolated preview iframe.</span>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TemplateKey } from '~/components/storefront/templates/registry'

type Surface = 'home' | 'shop' | 'cards' | 'shell'
type PreviewMode = 'desktop' | 'tablet' | 'mobile'
type HeaderStyle = 'full' | 'quiet' | 'minimal'
type ProductView = 'grid' | 'list' | 'promo'
type BackgroundStyle = 'theme' | 'plain' | 'contrast'

interface TemplateMeta {
  key: TemplateKey
  name: string
  short: string
  fit: string
  primary: string
  accent: string
  bg: string
}

interface BuilderSettings {
  templateKey: TemplateKey
  surface: Surface
  previewMode: PreviewMode
  primary: string
  accent: string
  font: string
  buttonRadius: number
  cardRadius: number
  headerStyle: HeaderStyle
  productView: ProductView
  backgroundStyle: BackgroundStyle
}

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Template Builder'
})

const templateCatalog: TemplateMeta[] = [
  { key: 'classic', name: 'Classic', short: 'CL', fit: 'Elegant catalogs and premium basics', primary: '#0f172a', accent: '#f8fafc', bg: '#f8fafc' },
  { key: 'modern', name: 'Modern', short: 'MO', fit: 'Clean fashion, electronics, and general retail', primary: '#0D9488', accent: '#99F6E4', bg: '#f8fafc' },
  { key: 'interior', name: 'Interior', short: 'IN', fit: 'Home and interior-decor stores wanting a soft emerald accent', primary: '#65A30D', accent: '#D9F99D', bg: '#f8fafc' },
  { key: 'minimal', name: 'Minimal', short: 'MI', fit: 'General retail wanting the plainest possible layout', primary: '#65A30D', accent: '#D9F99D', bg: '#f8fafc' },
  { key: 'street', name: 'Street', short: 'ST', fit: 'Streetwear, drops, bold youth brands', primary: '#FACC15', accent: '#000000', bg: '#ffffff' },
  { key: 'cozy', name: 'Cozy', short: 'CZ', fit: 'Home goods, handmade, soft lifestyle', primary: '#A4C3B2', accent: '#F5F2EA', bg: '#F5F2EA' },
  { key: 'cyber', name: 'Cyber', short: 'CY', fit: 'Gaming, tech, electronics, gadgets', primary: '#F43F5E', accent: '#A855F7', bg: '#0d0515' },
  { key: 'stationnery', name: 'Stationery', short: 'PA', fit: 'Books, paper, gifts, editorial stores', primary: '#334155', accent: '#fdfbf7', bg: '#fdfbf7' },
  { key: 'food', name: 'Food', short: 'FD', fit: 'Restaurants, grocery, artisanal food', primary: '#ea580c', accent: '#fed7aa', bg: '#f5f5f4' },
  { key: 'wellness', name: 'Wellness', short: 'WE', fit: 'Beauty, natural products, calm retail', primary: '#84CC16', accent: '#ECFCCB', bg: '#f8fafc' },
  { key: 'playful', name: 'Playful', short: 'PL', fit: 'Kids, toys, colorful gift shops', primary: '#ED5A96', accent: '#FFDD8A', bg: '#FFF6FA' },
  { key: 'activewear', name: 'Activewear', short: 'AW', fit: 'Sports, performance, sharp drops', primary: '#EAB308', accent: '#000000', bg: '#000000' },
  { key: 'chrono', name: 'Chrono Luxe', short: 'CH', fit: 'Watches, jewelry, luxury accessories', primary: '#A67C52', accent: '#E8E0D5', bg: '#0E1117' },
  { key: 'maison', name: 'Pistachio', short: 'PI', fit: 'Premium food, nuts, refined retail', primary: '#0B4A25', accent: '#B38335', bg: '#FAF2E3' },
  { key: 'arena', name: 'Arena', short: 'AR', fit: 'Gaming gear, peripherals, esports and dark tech storefronts', primary: '#00B8FC', accent: '#050B12', bg: '#030508' },
  { key: 'nour', name: 'Nour Élégance', short: 'NO', fit: 'Abayas, hijabs, kaftans, modest fashion', primary: '#7A3B46', accent: '#C9A24B', bg: '#FAF3EA' },
  { key: 'embellir', name: 'Embellir', short: 'EM', fit: 'Skincare, cosmetics, bath and body, wellness', primary: '#0E3F3A', accent: '#DFA254', bg: '#F2ECE1' }
]

const fontOptions = [
  { value: 'template', label: 'Template', stack: 'inherit' },
  { value: 'sans', label: 'Sans', stack: "'DM Sans', system-ui, sans-serif" },
  { value: 'editorial', label: 'Editorial', stack: "'Playfair Display', Georgia, serif" },
  { value: 'rounded-lg', label: 'Rounded', stack: "'Nunito', system-ui, sans-serif" }
]

const surfaceOptions = [
  { value: 'home' as const, label: 'Home' },
  { value: 'shop' as const, label: 'Shop' },
  { value: 'cards' as const, label: 'Cards' },
  { value: 'shell' as const, label: 'Shell' }
]

const previewModes = [
  { value: 'desktop' as const, label: 'Desktop preview', icon: 'lucide:monitor' },
  { value: 'tablet' as const, label: 'Tablet preview', icon: 'lucide:tablet' },
  { value: 'mobile' as const, label: 'Mobile preview', icon: 'lucide:smartphone' }
]

const headerOptions = [
  { value: 'full' as const, label: 'Full' },
  { value: 'quiet' as const, label: 'No bar' },
  { value: 'minimal' as const, label: 'No nav' }
]

const productViewOptions = [
  { value: 'grid' as const, label: 'Grid' },
  { value: 'list' as const, label: 'List' },
  { value: 'promo' as const, label: 'Promo' }
]

const backgroundOptions = [
  { value: 'theme' as const, label: 'Template default' },
  { value: 'plain' as const, label: 'Plain white' },
  { value: 'contrast' as const, label: 'Contrast stage' }
]

const defaultTemplate = templateCatalog.find((template) => template.key === 'modern') || templateCatalog[0]

const settings = reactive<BuilderSettings>({
  templateKey: defaultTemplate.key,
  surface: 'home',
  previewMode: 'desktop',
  primary: defaultTemplate.primary,
  accent: defaultTemplate.accent,
  font: 'template',
  buttonRadius: 12,
  cardRadius: 22,
  headerStyle: 'full',
  productView: 'grid',
  backgroundStyle: 'theme'
})

const copied = ref(false)

const activeTemplate = computed(() => templateCatalog.find((template) => template.key === settings.templateKey) || defaultTemplate)
const surfaceLabel = computed(() => surfaceOptions.find((surface) => surface.value === settings.surface)?.label || 'Home')

const previewUrl = computed(() => {
  const query = new URLSearchParams({
    template: settings.templateKey,
    surface: settings.surface,
    primary: settings.primary,
    accent: settings.accent,
    font: settings.font,
    buttonRadius: String(settings.buttonRadius),
    cardRadius: String(settings.cardRadius),
    header: settings.headerStyle,
    productView: settings.productView,
    background: settings.backgroundStyle
  })

  return `/admin/template-builder-preview?${query.toString()}`
})

function selectTemplate(template: TemplateMeta) {
  settings.templateKey = template.key
  settings.primary = template.primary
  settings.accent = template.accent
}

function resetBuilder() {
  Object.assign(settings, {
    templateKey: defaultTemplate.key,
    surface: 'home',
    previewMode: 'desktop',
    primary: defaultTemplate.primary,
    accent: defaultTemplate.accent,
    font: 'template',
    buttonRadius: 12,
    cardRadius: 22,
    headerStyle: 'full',
    productView: 'grid',
    backgroundStyle: 'theme'
  } satisfies BuilderSettings)
}

async function copyConfig() {
  const payload = JSON.stringify({ ...settings }, null, 2)

  try {
    await navigator.clipboard?.writeText(payload)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1400)
  } catch {
    copied.value = false
  }
}
</script>

<style scoped>
.template-builder-page {
  color: var(--text-primary);
}

.builder-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--surface-border);
}

.builder-kicker {
  margin-bottom: 8px;
  color: var(--brand);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.builder-header h1 {
  font-size: 28px;
  font-weight: 750;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.builder-header p:last-child {
  max-width: 70ch;
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.55;
}

.builder-header-actions,
.toolbar-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.builder-icon-button,
.builder-primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 38px;
  border-radius: 11px;
  border: 1px solid var(--surface-border);
  background: var(--surface-2);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 750;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.builder-icon-button {
  width: 38px;
}

.builder-primary-action {
  padding: 0 14px;
  background: var(--brand);
  color: var(--brand-contrast);
  border-color: transparent;
}

.builder-icon-button:hover,
.builder-primary-action:hover {
  transform: translateY(-1px);
}

.builder-grid {
  display: grid;
  grid-template-columns: minmax(310px, 380px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.builder-sidebar {
  display: grid;
  gap: 14px;
  position: sticky;
  top: 10px;
  max-height: calc(100vh - 112px);
  overflow: auto;
  scrollbar-width: thin;
}

.builder-panel,
.preview-panel {
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface-2) 94%, transparent);
  box-shadow: var(--card-shadow);
}

.builder-panel {
  padding: 16px;
}

.panel-head,
.preview-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.panel-head {
  margin-bottom: 14px;
}

.panel-head.compact {
  margin-bottom: 6px;
}

.panel-head h2,
.preview-toolbar h2 {
  font-size: 15px;
  font-weight: 750;
  letter-spacing: -0.01em;
}

.panel-head p,
.preview-toolbar p {
  margin-top: 4px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.panel-head > span {
  border-radius: 999px;
  padding: 5px 9px;
  background: rgba(var(--brand-rgb) / 0.12);
  color: var(--brand);
  font-size: 11px;
  font-weight: 850;
}

.template-list {
  display: grid;
  gap: 7px;
}

.template-option {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 10px;
  min-height: 54px;
  padding: 8px 10px;
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  background: var(--surface-1);
  color: var(--text-secondary);
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.template-option:hover,
.template-option.is-active {
  transform: translateY(-1px);
  border-color: rgba(var(--brand-rgb) / 0.34);
  background: rgba(var(--brand-rgb) / 0.08);
}

.template-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--template-color), var(--template-bg));
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  font-size: 11px;
  font-weight: 900;
}

.template-copy {
  min-width: 0;
}

.template-copy strong,
.template-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-copy strong {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
}

.template-copy small {
  margin-top: 2px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.control-section {
  padding: 14px 0;
  border-top: 1px solid var(--surface-border);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 850;
}

.section-title svg {
  color: var(--text-tertiary);
}

.color-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.color-row label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  padding: 9px 10px;
  background: var(--surface-1);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 750;
}

.color-row input {
  width: 34px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
}

.choice-grid {
  display: grid;
  gap: 8px;
}

.choice-grid.two {
  grid-template-columns: 1fr 1fr;
}

.choice-button,
.segmented button {
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 750;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.choice-button {
  min-height: 38px;
  border-radius: 12px;
  padding: 0 12px;
  text-align: left;
}

.choice-button:hover,
.segmented button:hover {
  color: var(--text-primary);
  border-color: var(--surface-border-hover);
}

.choice-button.is-active,
.segmented button.is-active {
  background: rgba(var(--brand-rgb) / 0.11);
  border-color: rgba(var(--brand-rgb) / 0.36);
  color: var(--text-primary);
}

.range-field {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.range-field span {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 750;
}

.range-field strong {
  color: var(--text-primary);
}

.range-field input {
  accent-color: var(--brand);
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  border: 1px solid var(--surface-border);
  border-radius: 13px;
  padding: 4px;
  background: var(--surface-1);
}

.segmented.compact {
  min-width: 260px;
}

.segmented button {
  min-height: 34px;
  border-radius: 9px;
  border-color: transparent;
}

.preview-panel {
  overflow: hidden;
}

.preview-toolbar {
  padding: 16px 18px;
  border-bottom: 1px solid var(--surface-border);
}

.device-toggle {
  display: flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  background: var(--surface-1);
}

.device-toggle button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 30px;
  border-radius: 9px;
  color: var(--text-tertiary);
  transition: background 0.16s ease, color 0.16s ease;
}

.device-toggle button.is-active {
  background: var(--surface-3);
  color: var(--text-primary);
}

.preview-stage {
  min-height: 720px;
  padding: 26px;
  background:
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 26px 26px;
  overflow: auto;
}

.device-frame {
  position: relative;
  width: min(100%, 1180px);
  height: 680px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 24px;
  background: #fff;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.34);
  transition: width 0.22s ease, height 0.22s ease, border-radius 0.22s ease;
}

.device-frame.is-tablet {
  width: min(100%, 760px);
  height: 760px;
}

.device-frame.is-mobile {
  width: min(100%, 390px);
  height: 780px;
  border-radius: 34px;
}

.preview-iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}

.builder-notes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-border);
}

.builder-notes div {
  padding: 13px 16px;
  background: var(--surface-2);
}

.builder-notes strong,
.builder-notes span {
  display: block;
}

.builder-notes strong {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 850;
}

.builder-notes span {
  margin-top: 3px;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.45;
}

@media (max-width: 1180px) {
  .builder-grid {
    grid-template-columns: 1fr;
  }

  .builder-sidebar {
    position: static;
    max-height: none;
  }
}

@media (max-width: 760px) {
  .builder-header,
  .preview-toolbar {
    flex-direction: column;
  }

  .builder-header-actions,
  .toolbar-controls,
  .builder-primary-action {
    width: 100%;
  }

  .builder-primary-action {
    flex: 1;
  }

  .segmented.compact {
    width: 100%;
    min-width: 0;
  }

  .preview-stage {
    padding: 14px;
  }

  .builder-notes {
    grid-template-columns: 1fr;
  }
}
</style>
