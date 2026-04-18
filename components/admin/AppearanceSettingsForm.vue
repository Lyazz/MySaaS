<template>
  <div class="max-w-4xl mx-auto space-y-8 pb-24">
    <!-- Header -->
    <div class="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold" style="color: var(--text-primary)">{{ t('admin.pages.settings.appearance.title') || "Appearance Settings" }}</h2>
        <p style="color: var(--text-secondary)" class="mt-1">{{ t('admin.pages.settings.appearance.subtitle') || "Manage your store's look and feel" }}</p>
      </div>
    </div>

    <div class="space-y-6">
      
      <!-- Store Identity -->
      <section class="rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
        <div class="p-6 md:p-8">
          <h3 class="text-xl font-bold mb-1" style="color: var(--text-primary)">{{ t('admin.appearanceSettingsForm.identity.title') }}</h3>
          <p class="text-[13px] mb-8" style="color: var(--text-tertiary)">{{ t('admin.appearanceSettingsForm.identity.subtitle') }}</p>
          
          <div class="space-y-5">
            <div>
              <label class="ui-label mb-1.5 block">{{ t('admin.appearanceSettingsForm.identity.storeName.label') }}</label>
              <input
                v-model="form.name"
                type="text"
                required
                class="ui-input block w-full rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm transition-shadow"
                :placeholder="t('admin.appearanceSettingsForm.identity.storeName.placeholder')"
              >
            </div>

            <div>
              <label class="ui-label mb-1.5 block">{{ t('admin.appearanceSettingsForm.identity.slug.label') }}</label>
              <div class="flex rounded-lg shadow-sm">
                <input
                  v-model="form.slug"
                  type="text"
                  required
                  pattern="^[a-z0-9-]+$"
                  class="ui-input flex-1 block w-full rounded-none rounded-l-lg focus:border-teal-500 focus:ring-teal-500 sm:text-sm text-right"
                  :placeholder="t('admin.appearanceSettingsForm.identity.slug.placeholder')"
                  @input="handleSlugInput"
                >
                <span class="inline-flex items-center px-3 rounded-r-lg border border-l-0 sm:text-sm" style="border-color: var(--surface-border); background: var(--surface-3); color: var(--text-tertiary)">
                  .{{ baseDomain }}
                </span>
              </div>
              <p class="mt-1.5 text-xs" style="color: var(--text-tertiary)">
                {{ t('admin.appearanceSettingsForm.identity.slug.hint') }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Brand Assets -->
      <section class="rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
        <div class="p-6 md:p-8">
          <h3 class="text-xl font-bold mb-1" style="color: var(--text-primary)">{{ t('admin.appearanceSettingsForm.brandAssets.title') }}</h3>
          <p class="text-[13px] mb-8" style="color: var(--text-tertiary)">{{ t('admin.appearanceSettingsForm.brandAssets.subtitle') }}</p>

          <div class="grid md:grid-cols-2 gap-10">
            <!-- Logo Upload -->
             <div>
                <div class="flex items-center justify-between mb-3">
                   <label class="ui-label">{{ t('admin.appearanceSettingsForm.brandAssets.logo.label') }}</label>
                   <button type="button" @click="mockAiGenerate" class="text-xs font-bold px-2.5 py-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-700 rounded-lg hover:from-violet-200 hover:to-fuchsia-200 transition-colors flex items-center gap-1.5 border border-violet-200 shadow-sm">
                     <Icon name="lucide:sparkles" class="w-3.5 h-3.5" />
                     Magic Identity
                   </button>
                </div>
                <div class="w-full rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden group" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
                  <div class="absolute top-0 left-0 w-full h-1.5" :style="{ background: form.primaryColor }"></div>
                  <SingleImageUploader
                    v-model="form.logoUrl"
                    mode="logo"
                    :label="t('admin.appearanceSettingsForm.brandAssets.logo.upload')"
                    :hint="t('admin.appearanceSettingsForm.brandAssets.logo.hint')"
                    class="w-full relative z-10"
                  />
                </div>
             </div>
 
             <!-- Favicon Upload -->
             <div>
                <label class="ui-label mb-3 block">{{ t('admin.appearanceSettingsForm.brandAssets.favicon.label') || "Favicon" }}</label>
                <SingleImageUploader
                  v-model="form.faviconUrl"
                  mode="favicon"
                  :label="t('admin.appearanceSettingsForm.brandAssets.favicon.upload') || 'Upload Favicon'"
                  :hint="t('admin.appearanceSettingsForm.brandAssets.favicon.hint') || 'Square image (ICO, PNG), recommended size 32x32px'"
                  class="w-full"
                />
             </div>

            <!-- Color Picker -->
            <div>
              <label class="ui-label mb-3 block">{{ t('admin.appearanceSettingsForm.brandAssets.primaryColor.label') }}</label>
              <div class="space-y-4">
                 <div class="flex items-center gap-4">
                    <div class="relative overflow-hidden rounded-xl shadow-sm w-16 h-16 shrink-0 group cursor-pointer" style="border: 1px solid var(--surface-border)">
                      <input
                        v-model="form.primaryColor"
                        type="color"
                        class="absolute top-0 left-0 w-full h-full p-0 border-0 opacity-0 cursor-pointer z-10"
                      >
                      <div class="w-full h-full" :style="{ backgroundColor: form.primaryColor }"></div>
                      <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                         <Icon name="lucide:pipette" class="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div class="flex-1">
                      <input
                        v-model="form.primaryColor"
                        type="text"
                        pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                        class="ui-input block w-full rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm font-mono uppercase"
                        placeholder="#0F766E"
                      >
                      <p class="mt-1.5 text-xs" style="color: var(--text-tertiary)">
                        {{ t('admin.appearanceSettingsForm.brandAssets.primaryColor.hint') }}
                      </p>
                    </div>
                 </div>
                 
                 <!-- Preset Colors -->
                 <div class="mt-6">
                    <p class="text-xs font-semibold mb-3 uppercase tracking-wider" style="color: var(--text-tertiary)">Suggested Palettes</p>
                    <div class="flex flex-wrap gap-3">
                       <button 
                          v-for="color in presetColors" 
                          :key="color"
                          type="button"
                          class="w-10 h-10 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-all hover:scale-110 relative" style="border: 1px solid var(--surface-border)"
                          :style="{ backgroundColor: color }"
                          @click="form.primaryColor = color"
                       >
                          <Icon v-if="form.primaryColor === color" name="lucide:check" class="absolute inset-0 m-auto text-white drop-shadow-md w-5 h-5" />
                       </button>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <!-- Template Selection -->
      <section class="rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
        <div class="p-6 md:p-8">
           <h3 class="text-xl font-bold mb-1" style="color: var(--text-primary)">{{ t('admin.appearanceSettingsForm.templates.title') }}</h3>
           <p class="text-[13px] mb-8" style="color: var(--text-tertiary)">{{ t('admin.appearanceSettingsForm.templates.subtitle') }}</p>

           <div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                 <h4 class="text-base font-bold" style="color: var(--text-primary)">Sélectionner un modèle</h4>
                 <p class="text-[13px] mt-1" style="color: var(--text-tertiary)">Sélectionnez le template à appliquer à votre boutique.</p>
              </div>
              
              <!-- Filter Chips -->
              <div class="flex overflow-x-auto no-scrollbar gap-2 pb-2 md:pb-0">
                 <button 
                    v-for="cat in categories" 
                    :key="cat"
                    type="button"
                    class="whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all"
                    :class="selectedCategory === cat ? 'bg-slate-800 text-white shadow-md' : ''"
                    :style="selectedCategory !== cat ? 'background: var(--surface-3); color: var(--text-secondary)' : ''"
                    @click="selectedCategory = cat"
                 >
                    {{ cat }}
                 </button>
              </div>
           </div>

           <!-- Thumbnails Grid -->
           <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <div
                v-for="tpl in filteredTemplates"
                :key="tpl.key"
                class="group relative rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col overflow-hidden"
                :class="form.templateKey === tpl.key ? 'scale-[1.02] md:scale-[1.05] border-teal-500 ring-4 ring-teal-500/20 shadow-xl z-20' : 'shadow-sm hover:shadow'"
                :style="form.templateKey !== tpl.key ? 'background: var(--surface-1); border-color: var(--surface-border)' : 'background: var(--surface-1)'"
                @click="form.templateKey = tpl.key"
              >
                  <!-- Absolute Badge if Selected -->
                  <div v-if="form.templateKey === tpl.key" class="absolute top-3 right-3 z-30 bg-teal-500 text-white shadow-md rounded-full w-7 h-7 flex items-center justify-center animate-fadeIn">
                    <Icon name="lucide:check" class="w-4 h-4 font-bold" />
                  </div>
                 <!-- Style Swatch Preview -->
                 <div
                   class="relative w-full border-b overflow-hidden flex flex-col"
                   style="height: 200px;"
                   :style="{ background: tpl.bg, borderColor: tpl.border }"
                 >
                   <!-- Top accent strip -->
                   <div class="h-1 w-full shrink-0" :style="{ background: tpl.color }"></div>

                   <!-- Mock product card (centered) -->
                   <div class="flex-1 flex items-center justify-center p-4">
                     <div
                       class="w-full max-w-[140px] overflow-hidden shadow-sm"
                       :style="{ background: tpl.cardBg, borderRadius: tpl.radius, border: `1px solid ${tpl.border}` }"
                     >
                       <!-- Image zone -->
                       <div
                         class="w-full flex items-center justify-center text-3xl"
                         style="height: 80px;"
                         :style="{ background: tpl.imgBg }"
                       >
                         {{ tpl.emoji }}
                       </div>
                       <!-- Text body -->
                       <div class="px-2.5 py-2" :style="{ fontFamily: tpl.fontStyle }">
                         <p class="text-[11px] font-semibold leading-tight truncate" :style="{ color: tpl.textColor }">
                           {{ tpl.sampleDesc }}
                         </p>
                         <p class="text-[11px] mt-0.5 font-bold" :style="{ color: tpl.color }">
                           {{ tpl.samplePrice }}
                         </p>
                         <!-- Mini button -->
                         <div
                           class="mt-2 w-full text-center text-[9px] font-bold py-1 leading-none"
                           :style="{ background: tpl.color, color: tpl.btnText, borderRadius: tpl.radius }"
                         >
                           BUY
                         </div>
                       </div>
                     </div>
                   </div>
                    <!-- Hover overlay with Quick View button -->
                    <div class="absolute inset-0 z-20 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center backdrop-blur-[2px]">
                      <button
                        type="button"
                        class="py-2.5 px-6 font-bold text-sm rounded-full shadow-xl flex items-center justify-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-105" style="background: var(--surface-2); color: var(--text-primary)"
                        @click.stop="openQuickView(tpl.key)"
                      >
                        <Icon name="lucide:eye" class="w-4 h-4" />
                        Quick View
                      </button>
                    </div>
                 </div>

                 <!-- Template Identity Footer -->
                 <div class="p-3 flex flex-col gap-2" style="background: var(--surface-2); border-top: 1px solid var(--surface-border)">
                   <div class="flex items-center justify-between">
                     <span class="font-bold text-sm" :class="tpl.fontClass" style="color: var(--text-primary)">{{ tpl.label }}</span>
                     <div v-if="form.templateKey === tpl.key" class="text-brand-600">
                       <Icon name="lucide:check-circle-2" class="w-5 h-5" />
                     </div>
                   </div>
                   <div class="flex flex-col gap-0.5">
                     <p class="text-[11px] font-medium leading-snug" style="color: var(--text-secondary)">{{ tpl.storeTypes }}</p>
                     <p class="text-[11px] leading-snug" style="color: var(--text-tertiary)">{{ tpl.description }}</p>
                   </div>
                   <!-- Color + font pills -->
                   <div class="flex items-center gap-1.5 flex-wrap">
                     <span
                       class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
                       :style="{ borderColor: tpl.color + '40', background: tpl.color + '12', color: tpl.color }"
                     >
                       <span class="w-2 h-2 rounded-full inline-block" :style="{ background: tpl.color }"></span>
                       {{ tpl.color.toUpperCase() }}
                     </span>
                     <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style="background: var(--surface-3); border: 1px solid var(--surface-border); color: var(--text-secondary)">
                       <Icon name="lucide:type" class="w-2.5 h-2.5" />
                       {{ tpl.fontName }}
                     </span>
                   </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

    </div>

      <!-- Quick View Modal Overlay -->
      <transition name="fade">
        <div v-if="showQuickView" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div class="w-full max-w-6xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
            <div class="flex items-center justify-between px-6 py-4" style="border-bottom: 1px solid var(--surface-border); background: var(--surface-1)">
              <h3 class="font-bold flex items-center gap-2" style="color: var(--text-primary)">
                 <Icon name="lucide:monitor" class="w-5 h-5" style="color: var(--text-muted)" />
                 Prévisualisation Rapide
              </h3>
              <button @click="showQuickView = false" class="p-2 rounded-full transition-colors hover:bg-white/10" style="color: var(--text-muted)">
                <Icon name="lucide:x" class="w-5 h-5" />
              </button>
            </div>
            <div class="flex-1 w-full overflow-hidden relative" style="background: var(--surface-3)">
               <div v-if="!quickViewUrl" class="absolute inset-0 flex items-center justify-center flex-col gap-3">
                 <Icon name="lucide:loader-2" class="w-8 h-8 animate-spin" style="color: var(--text-muted)" />
                 <p class="text-sm" style="color: var(--text-tertiary)">Chargement de la preview...</p>
               </div>
               <iframe v-if="quickViewUrl" :src="quickViewUrl" class="w-full h-full border-0 relative z-10" />
            </div>
          </div>
        </div>
      </transition>

      <!-- Floating Action Bar for unsaved changes -->
      <transition name="slide-up">
        <div v-show="isDirty" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 backdrop-blur-md shadow-2xl rounded-full px-6 py-4 flex flex-col md:flex-row items-center gap-4 md:gap-8 transform origin-bottom min-w-max" style="background: rgba(22,25,31,0.95); border: 1px solid var(--surface-border)">
          <div class="flex flex-col items-center md:items-start">
            <span class="text-sm font-bold" style="color: var(--text-primary)">Modifications non enregistrées</span>
            <span class="text-xs" style="color: var(--text-tertiary)">N'oubliez pas de sauvegarder.</span>
          </div>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="ui-btn ui-btn--secondary text-sm rounded-xl"
              :disabled="loading || saving"
              @click="reset"
            >
              {{ t('admin.common.cancel') || 'Annuler' }}
            </button>
            <button
              @click="save"
              class="px-6 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-medium transition-all shadow-md hover:shadow-lg hover:shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              :class="saving ? 'opacity-50 cursor-not-allowed' : ''"
              :disabled="loading || saving"
            >
              <Icon v-if="saving" name="lucide:loader-2" class="w-5 h-5 animate-spin" />
              <Icon v-else name="lucide:save" class="w-4 h-4" />
              {{ saving ? (t('admin.common.saving') || 'Sauvegarde...') : (t('admin.common.saveChanges') || 'Enregistrer') }}
            </button>
          </div>
        </div>
      </transition>
    </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SingleImageUploader from './SingleImageUploader.vue'

// -- Types & Stores --
const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

// -- State --
const loading = ref(false)
const saving = ref(false)
const message = reactive({ type: '', text: '' })

// Default colors
const presetColors = [
  '#0F766E', // Teal (Default)
  '#0f172a', // Slate
  '#4F46E5', // Indigo
  '#F43F5E', // Rose
  '#EA580C', // Orange
  '#FACC15', // Yellow
  '#8A9A5B', // Moss Green
  '#7C3AED', // Violet
]

const form = reactive({
  name: '',
  slug: '',
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  primaryColor: '#0F766E',
  templateKey: 'classic'
})

const initialFormString = ref(JSON.stringify(form))
const isDirty = computed(() => initialFormString.value !== JSON.stringify(form))

const categories = ['All', 'Minimalist', 'Bold', 'Tech', 'Luxury', 'Classic']
const selectedCategory = ref('All')

const showQuickView = ref(false)
const quickViewUrl = ref('')

const baseDomain = ref('')

// -- Computed --
const previewUrl = computed(() => {
  if (!form.slug || !baseDomain.value) return null
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:'
  return `${protocol}//${form.slug}.${baseDomain.value}`
})

const getSelectedTemplateFont = computed(() => {
  const tpl = templates.value.find((tpl) => tpl.key === form.templateKey)
  return tpl ? tpl.fontClass : 'font-sans'
})

const filteredTemplates = computed(() => {
  if (selectedCategory.value === 'All') return templates.value
  return templates.value.filter(t => t.category === selectedCategory.value)
})

// -- Methods --


// -- Lifecycle --
onMounted(() => {
  if (typeof window !== 'undefined') {
    const host = window.location.host
    if (host.includes('localhost')) {
      baseDomain.value = 'localhost:3000'
    } else {
      const parts = host.split('.')
      if (parts.length > 2) {
         baseDomain.value = parts.slice(1).join('.')
      } else {
         baseDomain.value = host
      }
    }
  }
  fetchSettings()
})

// -- Templates Data --
const templates = computed(() => [
  { 
    key: 'classic',
    label: 'Classic',
    category: 'Classic',
    description: t('admin.appearanceSettingsForm.templates.options.classic.description'),
    storeTypes: t('admin.appearanceSettingsForm.templates.options.classic.storeTypes'),
    icon: 'lucide:layout-grid',
    fontClass: 'font-serif',
    fontName: 'Alice',
    fontStyle: "'Alice', serif",
    color: '#0f172a',
    bg: '#f8fafc',
    cardBg: '#ffffff',
    imgBg: 'linear-gradient(135deg,#e2e8f0,#cbd5e1)',
    border: '#e2e8f0',
    textColor: '#0f172a',
    subColor: '#64748b',
    btnText: '#ffffff',
    radius: '4px',
    emoji: '🖼️',
    sampleDesc: 'Élégant & intemporel',
    samplePrice: '189 €',
  },
  { 
    key: 'modern',
    label: 'Modern',
    category: 'Minimalist',
    description: t('admin.appearanceSettingsForm.templates.options.modern.description'),
    storeTypes: t('admin.appearanceSettingsForm.templates.options.modern.storeTypes'),
    icon: 'lucide:layout-template',
    fontClass: 'font-sans',
    fontName: 'Outfit',
    fontStyle: "'Outfit', ui-sans-serif, system-ui, sans-serif",
    color: '#0d9488',
    bg: '#f8fafc',
    cardBg: '#ffffff',
    imgBg: 'linear-gradient(135deg,#ccfbf1,#99f6e4)',
    border: '#e2e8f0',
    textColor: '#475569',
    subColor: '#64748b',
    btnText: '#ffffff',
    radius: '8px',
    emoji: '🛍️',
    sampleDesc: 'Minimaliste & moderne',
    samplePrice: '129 €',
  },
  { 
    key: 'street',
    label: 'Street',
    category: 'Bold',
    description: t('admin.appearanceSettingsForm.templates.options.street.description'),
    storeTypes: t('admin.appearanceSettingsForm.templates.options.street.storeTypes'),
    icon: 'lucide:zap',
    fontClass: 'font-street',
    fontName: 'Anton',
    fontStyle: "'Anton', sans-serif",
    color: '#FACC15',
    bg: '#ffffff',
    cardBg: '#ffffff',
    imgBg: 'linear-gradient(135deg,#fef9c3,#fde68a)',
    border: '#FACC15',
    textColor: '#000000',
    subColor: '#374151',
    btnText: '#000000',
    radius: '0px',
    emoji: '👟',
    sampleDesc: 'Limited drop',
    samplePrice: '99 €',
  },
  { 
    key: 'cozy',
    label: 'Cozy',
    category: 'Minimalist',
    description: t('admin.appearanceSettingsForm.templates.options.cozy.description'),
    storeTypes: t('admin.appearanceSettingsForm.templates.options.cozy.storeTypes'),
    icon: 'lucide:coffee',
    fontClass: 'font-cozy',
    fontName: 'Nunito',
    fontStyle: "'Nunito', sans-serif",
    color: '#A4C3B2',
    bg: '#F5F2EA',
    cardBg: '#F5F2EA',
    imgBg: 'linear-gradient(135deg,#d1fae5,#bbf7d0)',
    border: '#e8f0eb',
    textColor: '#475569',
    subColor: '#6b7280',
    btnText: '#ffffff',
    radius: '16px',
    emoji: '🕯️',
    sampleDesc: 'Doux & chaleureux',
    samplePrice: '24 €',
  },
  { 
    key: 'cyber',
    label: 'Cyber',
    category: 'Tech',
    description: t('admin.appearanceSettingsForm.templates.options.cyber.description'),
    storeTypes: t('admin.appearanceSettingsForm.templates.options.cyber.storeTypes'),
    icon: 'lucide:cpu',
    fontClass: 'font-cyber',
    fontName: 'Orbitron',
    fontStyle: "'Orbitron', sans-serif",
    color: '#F43F5E',
    bg: '#0d0515',
    cardBg: '#1a0a2e',
    imgBg: 'linear-gradient(135deg,#2d1b5e,#1a0a2e)',
    border: '#F43F5E',
    textColor: '#e9d5ff',
    subColor: '#c084fc',
    btnText: '#ffffff',
    radius: '4px',
    emoji: '🤖',
    sampleDesc: 'Next-gen tech',
    samplePrice: '499 €',
  },
  { 
    key: 'stationnery',
    label: 'Stationery',
    category: 'Minimalist',
    description: t('admin.appearanceSettingsForm.templates.options.stationnery.description'),
    storeTypes: t('admin.appearanceSettingsForm.templates.options.stationnery.storeTypes'),
    icon: 'lucide:pen-tool',
    fontClass: 'font-stationery',
    fontName: 'Merriweather',
    fontStyle: "'Merriweather', 'Playfair Display', serif",
    color: '#334155',
    bg: '#fdfbf7',
    cardBg: '#fdfbf7',
    imgBg: 'linear-gradient(135deg,#f8fafc,#e2e8f0)',
    border: '#cbd5e1',
    textColor: '#1e293b',
    subColor: '#64748b',
    btnText: '#fdfbf7',
    radius: '2px',
    emoji: '📓',
    sampleDesc: 'Élégance papeterie',
    samplePrice: '18 €',
  },
  { 
    key: 'food',
    label: 'Food',
    category: 'Bold',
    description: t('admin.appearanceSettingsForm.templates.options.food.description'),
    storeTypes: t('admin.appearanceSettingsForm.templates.options.food.storeTypes'),
    icon: 'lucide:utensils',
    fontClass: 'font-food',
    fontName: 'Nunito',
    fontStyle: "'Nunito', sans-serif",
    color: '#ea580c',
    bg: '#f5f5f4',
    cardBg: '#ffffff',
    imgBg: 'linear-gradient(135deg,#ffedd5,#fed7aa)',
    border: '#e7e5e4',
    textColor: '#292524',
    subColor: '#78716c',
    btnText: '#ffffff',
    radius: '12px',
    emoji: '🍕',
    sampleDesc: 'Saveurs artisanales',
    samplePrice: '14 €',
  },
  { 
    key: 'wellness',
    label: 'Wellness',
    category: 'Minimalist',
    description: t('admin.appearanceSettingsForm.templates.options.wellness.description'),
    storeTypes: t('admin.appearanceSettingsForm.templates.options.wellness.storeTypes'),
    icon: 'lucide:flower-2',
    fontClass: 'font-wellness',
    fontName: 'Solway',
    fontStyle: "'Solway', ui-serif, Georgia, serif",
    color: '#2A9D8F',
    bg: '#f8fafc',
    cardBg: '#ffffff',
    imgBg: 'linear-gradient(135deg,#ccfbf1,#a7f3d0)',
    border: '#ccfbf1',
    textColor: '#475569',
    subColor: '#64748b',
    btnText: '#ffffff',
    radius: '12px',
    emoji: '🌿',
    sampleDesc: 'Bio & naturel',
    samplePrice: '22 €',
  },
  { 
    key: 'playful',
    label: 'Playful',
    category: 'Bold',
    description: t('admin.appearanceSettingsForm.templates.options.playful.description'),
    storeTypes: t('admin.appearanceSettingsForm.templates.options.playful.storeTypes'),
    icon: 'lucide:smile',
    fontClass: 'font-sans',
    fontName: 'Nunito',
    fontStyle: "'Nunito', 'Quicksand', sans-serif",
    color: '#9333EA', // Purple 600 — matches ThemeProvider
    bg: '#faf5ff', // matches ThemeProvider bg-[#faf5ff]
    cardBg: '#ffffff',
    imgBg: 'linear-gradient(135deg,#f3e8ff,#e9d5ff)',
    border: '#e9d5ff',
    textColor: '#334155', // slate-700
    subColor: '#7c3aed',
    btnText: '#ffffff',
    radius: '20px',
    emoji: '🧸',
    sampleDesc: 'Toys & Fun',
    samplePrice: '15 €',
  },
  { 
    key: 'activewear',
    label: 'Activewear',
    category: 'Tech',
    description: t('admin.appearanceSettingsForm.templates.options.activewear.description'),
    storeTypes: t('admin.appearanceSettingsForm.templates.options.activewear.storeTypes'),
    icon: 'lucide:activity',
    fontClass: 'font-activewear',
    fontName: 'Teko',
    fontStyle: "'Teko', sans-serif",
    color: '#EAB308', // Electric Yellow — matches ThemeProvider
    bg: '#000000', // bg-black — matches ThemeProvider
    cardBg: '#111111',
    imgBg: 'linear-gradient(135deg,#1f2937,#000000)',
    border: '#333333',
    textColor: '#d1d5db', // gray-300 — matches ThemeProvider text-gray-300
    subColor: '#9ca3af',
    btnText: '#000000',
    radius: '0px',
    emoji: '⚡',
    sampleDesc: 'High Performance',
    samplePrice: '89 €',
  },
  { 
    key: 'chrono',
    label: 'Chrono Luxe',
    category: 'Luxury',
    description: t('admin.appearanceSettingsForm.templates.options.chrono.description'),
    storeTypes: t('admin.appearanceSettingsForm.templates.options.chrono.storeTypes'),
    icon: 'lucide:watch',
    fontClass: 'font-serif',
    fontName: 'Cormorant Garamond',
    fontStyle: "'Cormorant Garamond', serif",
    color: '#A67C52', // Warm Copper-Bronze
    bg: '#0E1117', // Midnight navy — softer than pure black
    cardBg: '#131720',
    imgBg: 'linear-gradient(135deg,#1A1F2E,#0B0E16)',
    border: 'rgba(212,197,169,0.18)',
    textColor: '#E8E0D5',
    subColor: '#8A8070',
    btnText: '#ffffff',
    radius: '2px',
    emoji: '⌚',
    sampleDesc: 'Luxury Accessories',
    samplePrice: '3,500 €',
  },
  {
    key: 'maison',
    label: 'Maison',
    category: 'Minimalist',
    description: 'Template éditorial chaleureux dédié à la décoration intérieure et aux accessoires maison. Typographie serif élégante, palette terracotta.',
    storeTypes: 'Déco, Maison, Art de vivre, Accessoires intérieur',
    icon: 'lucide:home',
    fontClass: 'font-serif',
    fontName: 'Cormorant Garamond',
    fontStyle: "'Cormorant Garamond', 'DM Sans', serif",
    color: '#C17B4E', // Terracotta
    bg: '#FAF8F5', // Warm cream
    cardBg: '#FFFFFF',
    imgBg: 'linear-gradient(135deg,#F5F0EA,#EDE4D8)',
    border: 'rgba(212,196,180,0.5)',
    textColor: '#2C2420',
    subColor: '#7A6558',
    btnText: '#ffffff',
    radius: '0px',
    emoji: '🏡',
    sampleDesc: 'Home & Déco',
    samplePrice: '2,800 DA',
  },
])

// -- Methods --
const handleSlugInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  form.slug = target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

const showMessage = (type: 'success' | 'error', text: string) => {
   message.type = type
   message.text = text
   setTimeout(() => { message.text = '' }, 4000)
}

const openQuickView = (key: string) => {
  quickViewUrl.value = previewUrl.value ? `${previewUrl.value}?template=${key}` : ''
  showQuickView.value = true
}

const mockAiGenerate = () => {
  if (!form.logoUrl) {
    showMessage('error', "Please upload a logo first to generate a brand identity.")
    return
  }
  loading.value = true
  setTimeout(() => {
    const color = presetColors[Math.floor(Math.random() * presetColors.length)]
    const tpl = templates.value[Math.floor(Math.random() * templates.value.length)]
    form.primaryColor = color
    form.templateKey = tpl.key
    loading.value = false
    showMessage('success', "Magic Identity applied successfully! ✨")
  }, 1200)
}

const updateForm = (data: any) => {
  if (!data) return
  form.name = data.name || ''
  form.slug = data.slug || ''
  form.logoUrl = data.logoUrl || null
  form.faviconUrl = data.faviconUrl || null
  form.primaryColor = data.primaryColor || '#0F766E'
  form.templateKey = data.templateKey || 'classic'
  
  initialFormString.value = JSON.stringify(form)
}

const fetchSettings = async () => {
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

const save = async () => {
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
    
    // Update global state if used elsewhere
    useState<any>('storeSettings').value = updated
    
    // Update local form
    updateForm(updated)
    
    showMessage('success', t('admin.appearanceSettingsForm.messages.saved'))
  } catch (e: any) {
    console.error('Failed to save settings', e)
    showMessage('error', e.data?.statusMessage || t('admin.appearanceSettingsForm.messages.saveFailed'))
  } finally {
    saving.value = false
  }
}

const reset = () => {
  if (confirm(t('admin.appearanceSettingsForm.confirm.discard'))) {
    fetchSettings()
  }
}
</script>

<style scoped>
/* No scrollbar utility */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.animate-marquee {
  display: flex;
  animation: marquee 15s linear infinite;
  min-width: 200%; /* Ensure content is wide enough */
}

.animate-fadeIn {
   animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
   from { opacity: 0; transform: translateY(5px); }
   to { opacity: 1; transform: translateY(0); }
}
</style>
