<template>
  <div class="max-w-4xl mx-auto space-y-8 pb-24">
    <!-- Header with Action Bar -->
    <div class="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-800">{{ t('admin.pages.settings.appearance.title') || "Appearance Settings" }}</h2>
        <p class="text-slate-600 mt-1">{{ t('admin.pages.settings.appearance.subtitle') || "Manage your store's look and feel" }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          :disabled="loading || saving"
          @click="reset"
        >
          {{ t('admin.common.reset') || 'Reset' }}
        </button>
        <button
          type="button"
          class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          :class="saving ? 'opacity-50 cursor-not-allowed' : ''"
          :disabled="loading || saving"
          @click="save"
        >
          <Icon v-if="saving" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
          {{ t('admin.common.saveChanges') || 'Save Changes' }}
        </button>
      </div>
    </div>

    <div class="space-y-6">
      
      <!-- Store Identity -->
      <section class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-slate-900 mb-1">{{ t('admin.appearanceSettingsForm.identity.title') }}</h3>
          <p class="text-sm text-slate-500 mb-6">{{ t('admin.appearanceSettingsForm.identity.subtitle') }}</p>
          
          <div class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">{{ t('admin.appearanceSettingsForm.identity.storeName.label') }}</label>
              <input
                v-model="form.name"
                type="text"
                required
                class="block w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm transition-shadow"
                :placeholder="t('admin.appearanceSettingsForm.identity.storeName.placeholder')"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">{{ t('admin.appearanceSettingsForm.identity.slug.label') }}</label>
              <div class="flex rounded-lg shadow-sm">
                <input
                  v-model="form.slug"
                  type="text"
                  required
                  pattern="^[a-z0-9-]+$"
                  class="flex-1 block w-full rounded-none rounded-l-lg border-slate-300 focus:border-teal-500 focus:ring-teal-500 sm:text-sm text-right"
                  :placeholder="t('admin.appearanceSettingsForm.identity.slug.placeholder')"
                  @input="handleSlugInput"
                >
                <span class="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 text-slate-500 sm:text-sm">
                  .{{ baseDomain }}
                </span>
              </div>
              <p class="mt-1.5 text-xs text-slate-500">
                {{ t('admin.appearanceSettingsForm.identity.slug.hint') }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Brand Assets -->
      <section class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-slate-900 mb-1">{{ t('admin.appearanceSettingsForm.brandAssets.title') }}</h3>
          <p class="text-sm text-slate-500 mb-6">{{ t('admin.appearanceSettingsForm.brandAssets.subtitle') }}</p>

          <div class="grid md:grid-cols-2 gap-8">
            <!-- Logo Upload -->
             <div>
                <label class="block text-sm font-medium text-slate-700 mb-3">{{ t('admin.appearanceSettingsForm.brandAssets.logo.label') }}</label>
                <SingleImageUploader
                  v-model="form.logoUrl"
                  :label="t('admin.appearanceSettingsForm.brandAssets.logo.upload')"
                  :hint="t('admin.appearanceSettingsForm.brandAssets.logo.hint')"
                  class="w-full"
                />
             </div>
 
             <!-- Favicon Upload -->
             <div>
                <label class="block text-sm font-medium text-slate-700 mb-3">{{ t('admin.appearanceSettingsForm.brandAssets.favicon.label') || "Favicon" }}</label>
                <SingleImageUploader
                  v-model="form.faviconUrl"
                  :label="t('admin.appearanceSettingsForm.brandAssets.favicon.upload') || 'Upload Favicon'"
                  :hint="t('admin.appearanceSettingsForm.brandAssets.favicon.hint') || 'Square image (ICO, PNG), recommended size 32x32px'"
                  class="w-full"
                />
             </div>

            <!-- Color Picker -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-3">{{ t('admin.appearanceSettingsForm.brandAssets.primaryColor.label') }}</label>
              <div class="space-y-4">
                 <div class="flex items-center gap-4">
                    <div class="relative overflow-hidden rounded-xl border border-slate-200 shadow-sm w-16 h-16 shrink-0 group cursor-pointer">
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
                        class="block w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm font-mono uppercase"
                        placeholder="#0F766E"
                      >
                      <p class="mt-1.5 text-xs text-slate-500">
                        {{ t('admin.appearanceSettingsForm.brandAssets.primaryColor.hint') }}
                      </p>
                    </div>
                 </div>
                 
                 <!-- Preset Colors -->
                 <div class="flex flex-wrap gap-2">
                    <button 
                       v-for="color in presetColors" 
                       :key="color"
                       type="button"
                       class="w-6 h-6 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 transition-transform hover:scale-110"
                       :style="{ backgroundColor: color }"
                       @click="form.primaryColor = color"
                    ></button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Announcement Bar -->
       <section class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-lg font-semibold text-slate-900 mb-1">{{ t('admin.appearanceSettingsForm.announcement.title') }}</h3>
              <p class="text-sm text-slate-500">{{ t('admin.appearanceSettingsForm.announcement.subtitle') }}</p>
            </div>
            <div class="flex items-center">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="form.announcementScrolling" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                <span class="ml-3 text-sm font-medium text-slate-700">{{ t('admin.appearanceSettingsForm.announcement.marquee') }}</span>
              </label>
            </div>
          </div>

          <div>
             <label class="block text-sm font-medium text-slate-700 mb-1.5">{{ t('admin.appearanceSettingsForm.announcement.message.label') }}</label>
              <input
                v-model="form.announcementText"
                type="text"
                class="block w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                :placeholder="t('admin.appearanceSettingsForm.announcement.message.placeholder')"
              >
          </div>
        </div>
      </section>

      <!-- Template Selection -->
      <section class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6">
           <h3 class="text-lg font-semibold text-slate-900 mb-1">{{ t('admin.appearanceSettingsForm.templates.title') }}</h3>
           <p class="text-sm text-slate-500 mb-6">{{ t('admin.appearanceSettingsForm.templates.subtitle') }}</p>

           <div class="mb-4 flex items-center justify-between">
              <h4 class="text-base font-bold text-slate-800">Sélectionner un modèle</h4>
              <p class="text-sm text-slate-500">Sélectionnez le template à appliquer à votre boutique.</p>
           </div>

           <!-- Thumbnails Grid -->
           <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <div
                v-for="tpl in templates"
                :key="tpl.key"
                class="group relative rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col overflow-hidden bg-white"
                :class="form.templateKey === tpl.key ? 'border-brand-600 ring-4 ring-brand-600/20 shadow-md' : 'border-slate-200 hover:border-brand-300 shadow-sm hover:shadow'"
                @click="form.templateKey = tpl.key"
              >
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

                   <!-- Hover overlay with Prévisualiser button -->
                   <div class="absolute inset-0 z-10 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-end p-3">
                     <NuxtLink
                       :to="`/admin/preview?template=${tpl.key}`"
                       target="_blank"
                       class="pointer-events-auto py-2 px-4 bg-white/95 hover:bg-white backdrop-blur-sm text-slate-900 font-medium text-sm rounded-lg shadow border border-slate-200 flex items-center justify-center gap-2 transform translate-y-3 group-hover:translate-y-0 transition-all duration-300"
                       @click.stop
                     >
                       <Icon name="lucide:external-link" class="w-4 h-4" />
                       Prévisualiser
                     </NuxtLink>
                   </div>
                 </div>

                 <!-- Template Identity Footer -->
                 <div class="p-3 bg-white flex flex-col gap-2">
                   <div class="flex items-center justify-between">
                     <span class="font-bold text-slate-800 text-sm" :class="tpl.fontClass">{{ tpl.label }}</span>
                     <div v-if="form.templateKey === tpl.key" class="text-brand-600">
                       <Icon name="lucide:check-circle-2" class="w-5 h-5" />
                     </div>
                   </div>
                   <div class="flex flex-col gap-0.5">
                     <p class="text-[11px] font-medium text-slate-600 leading-snug">{{ tpl.storeTypes }}</p>
                     <p class="text-[11px] text-slate-500 leading-snug">{{ tpl.description }}</p>
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
                     <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-600">
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

      <!-- Form Actions -->
      <div class="pt-4 flex items-center justify-end gap-6">
         <div 
           v-if="message.text" 
           class="px-3 py-1.5 rounded-full text-sm font-medium animate-fadeIn"
           :class="message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
         >
           {{ message.text }}
         </div>

         <div class="flex items-center gap-3">
           <button
             type="button"
             class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
             :disabled="loading || saving"
             @click="reset"
           >
             {{ t('admin.common.cancel') }}
           </button>
           
           <button
             @click="save"
             class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             :class="saving ? 'opacity-50 cursor-not-allowed' : ''"
             :disabled="loading || saving"
           >
             <Icon v-if="saving" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
             {{ saving ? t('admin.common.saving') : t('admin.common.saveChanges') }}
           </button>
         </div>
      </div>
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
  templateKey: 'classic',
  announcementText: '',
  announcementScrolling: false
})

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

const updateForm = (data: any) => {
  if (!data) return
  form.name = data.name || ''
  form.slug = data.slug || ''
  form.logoUrl = data.logoUrl || null
  form.faviconUrl = data.faviconUrl || null
  form.primaryColor = data.primaryColor || '#0F766E'
  form.templateKey = data.templateKey || 'classic'
  form.announcementText = data.announcementText || ''
  form.announcementScrolling = data.announcementScrolling || false
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
        faviconUrl: form.faviconUrl,
        announcementText: form.announcementText,
        announcementScrolling: form.announcementScrolling
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
