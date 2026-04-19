<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-8">
      <h2 class="text-2xl font-bold" style="color: var(--text-primary)">
        {{ t('admin.pages.onboarding.title') }}
      </h2>
      <p class="mt-1" style="color: var(--text-secondary)">
        {{ t('admin.pages.onboarding.subtitle') }}
      </p>
    </div>

    <div
      v-if="loading"
      class="rounded-xl p-8" style="background: var(--surface-1); border: 1px solid var(--surface-border)"
    >
      <div class="flex items-center gap-3" style="color: var(--text-secondary)">
        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 [border-color:var(--brand)]" />
        <span>{{ t('admin.pages.onboarding.loadingSettings') }}</span>
      </div>
    </div>

    <div
      v-else
      class="space-y-6"
    >
      <!-- Progress -->
      <div class="rounded-xl p-6" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-medium" style="color: var(--text-secondary)">
            {{ t('admin.pages.onboarding.progress.stepOf', { current: step + 1, total: steps.length }) }}
          </p>
          <p class="text-sm" style="color: var(--text-tertiary)">
            {{ steps[step] }}
          </p>
        </div>
        <div class="h-2 rounded-full overflow-hidden" style="background: var(--surface-3)">
          <div
            class="h-2 [background:var(--brand)] transition-all"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>

      <!-- Step content -->
      <div class="rounded-xl p-6" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <!-- Brand -->
        <div
          v-if="step === 0"
          class="space-y-4"
        >
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.onboarding.brand.title') }}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.brand.pickColor') }}</label>
              <input
                v-model="form.primaryColor"
                type="color"
                class="h-12 w-full rounded-lg"
                style="border: 1px solid var(--surface-border); background: var(--surface-2)"
              >
            </div>
            <div>
              <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.brand.hexValue') }}</label>
              <input
                v-model="form.primaryColor"
                type="text"
                placeholder="#4F46E5"
                class="ui-input w-full px-3 py-2"
              >
              <p class="mt-1 text-xs" style="color: var(--text-muted)">
                {{ t('admin.pages.onboarding.brand.example', { value: '#4F46E5' }) }}
              </p>
            </div>
          </div>
          <div class="rounded-lg p-4" style="border: 1px solid var(--surface-border)">
            <p class="text-sm mb-2" style="color: var(--text-secondary)">
              {{ t('admin.pages.onboarding.brand.preview') }}
            </p>
            <button
              type="button"
              class="px-4 py-2 rounded-lg text-white font-medium"
              :style="{ backgroundColor: form.primaryColor }"
            >
              {{ t('admin.pages.onboarding.brand.primaryButton') }}
            </button>
          </div>
        </div>

        <!-- Template -->
        <div
          v-else-if="step === 1"
          class="space-y-4"
        >
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.onboarding.template.title') }}
          </h3>
          <p class="text-sm" style="color: var(--text-tertiary)">
            Sélectionnez le template à appliquer à votre boutique.
          </p>

           <!-- Thumbnails Grid -->
           <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <div
                v-for="tpl in templates"
                :key="tpl.key"
                class="group relative rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col overflow-hidden"
                :class="form.templateKey === tpl.key ? '[border-color:var(--brand)] ring-4 [--tw-ring-color:var(--brand)]/20 shadow-md' : ''"
                :style="form.templateKey !== tpl.key ? 'background: var(--surface-2); border-color: var(--surface-border)' : 'background: var(--surface-2)'"
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
                       class="pointer-events-auto py-2 px-4 backdrop-blur-sm font-medium text-sm rounded-lg shadow flex items-center justify-center gap-2 transform translate-y-3 group-hover:translate-y-0 transition-all duration-300" style="background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--surface-border)"
                       @click.stop
                     >
                       <Icon name="lucide:external-link" class="w-4 h-4" />
                       Prévisualiser
                     </NuxtLink>
                   </div>
                 </div>

                 <!-- Template Identity Footer -->
                 <div class="p-3 flex flex-col gap-2" style="background: var(--surface-3); border-top: 1px solid var(--surface-border)">
                   <div class="flex items-center justify-between">
                     <span class="font-bold text-sm" :class="tpl.fontClass" style="color: var(--text-primary)">{{ tpl.label }}</span>
                     <div v-if="form.templateKey === tpl.key" class="[color:rgba(var(--brand-rgb)/0.85)]">
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
                     <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style="background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-tertiary)">
                       <Icon name="lucide:type" class="w-2.5 h-2.5" />
                       {{ tpl.fontName }}
                     </span>
                   </div>
                 </div>
              </div>
           </div>
        </div>

        <!-- Language + Font -->
        <div
          v-else-if="step === 2"
          class="space-y-4"
        >
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.onboarding.language.title') }}
          </h3>
          <div>
            <label class="ui-label block mb-1">{{ t('admin.pages.onboarding.language.label') }}</label>
            <BaseSelect
              v-model="form.language"
            >
              <option
                v-for="l in languages"
                :key="l.key"
                :value="l.key"
              >
                {{ l.label }}
              </option>
            </BaseSelect>
            <p class="mt-1 text-xs" style="color: var(--text-muted)">
              {{ t('admin.pages.onboarding.language.rtlHint') }}
            </p>
          </div>
        </div>

        <!-- Summary -->
        <div
          v-else
          class="space-y-4"
        >
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.onboarding.summary.title') }}
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="rounded-xl p-4" style="border: 1px solid var(--surface-border)">
              <p class="text-sm" style="color: var(--text-tertiary)">
                {{ t('admin.pages.onboarding.summary.cards.template') }}
              </p>
              <p class="font-semibold" style="color: var(--text-primary)">
                {{ form.templateKey }}
              </p>
            </div>
            <div class="rounded-xl p-4" style="border: 1px solid var(--surface-border)">
              <p class="text-sm" style="color: var(--text-tertiary)">
                {{ t('admin.pages.onboarding.summary.cards.primaryColor') }}
              </p>
              <div class="flex items-center gap-3">
                <div
                  class="h-6 w-6 rounded"
                  :style="{ backgroundColor: form.primaryColor }"
                />
                <p class="font-semibold" style="color: var(--text-primary)">
                  {{ form.primaryColor }}
                </p>
              </div>
            </div>
            <div class="rounded-xl p-4" style="border: 1px solid var(--surface-border)">
              <p class="text-sm" style="color: var(--text-tertiary)">
                {{ t('admin.pages.onboarding.summary.cards.language') }}
              </p>
              <p class="font-semibold" style="color: var(--text-primary)">
                {{ form.language }}
              </p>
            </div>
          </div>

          <div class="rounded-xl p-4" style="border: 1px solid var(--surface-border)">
            <div class="flex items-center justify-between gap-3 mb-3">
              <p class="font-medium" style="color: var(--text-primary)">
                {{ t('admin.pages.onboarding.summary.aiTitle') }}
              </p>
              <button
                type="button"
                class="ui-btn ui-btn--secondary px-3 py-1.5 text-sm"
                :disabled="summaryLoading"
                @click="loadSummary"
              >
                {{ summaryLoading ? t('admin.pages.onboarding.summary.generating') : t('admin.pages.onboarding.summary.generate') }}
              </button>
            </div>
            <textarea
              v-model="summaryMarkdown"
              rows="10"
              class="ui-input w-full font-mono text-xs p-3"
              :placeholder="t('admin.pages.onboarding.summary.placeholder')"
            />
            <div class="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                class="px-3 py-2 rounded-lg text-sm font-medium [background:var(--brand)] hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] text-white disabled:opacity-50"
                :disabled="!summaryMarkdown"
                @click="copySummary"
              >
                {{ t('admin.common.copy') }}
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="error"
          class="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800"
        >
          {{ error }}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="ui-btn ui-btn--secondary px-4 py-2 disabled:opacity-50"
          :disabled="step === 0 || saving"
          @click="step--"
        >
          {{ t('admin.common.back') }}
        </button>

        <div class="flex items-center gap-3">
          <button
            v-if="step < steps.length - 1"
            type="button"
            class="px-4 py-2 rounded-lg [background:var(--brand)] hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] text-white font-medium disabled:opacity-50"
            :disabled="saving"
            @click="nextStep"
          >
            {{ t('admin.common.next') }}
          </button>

          <button
            v-else
            type="button"
            class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
            :disabled="saving"
            @click="finish"
          >
            {{ saving ? t('admin.common.saving') : t('admin.pages.onboarding.saveFinish') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseSelect from '~/components/ui/BaseSelect.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.onboarding.metaTitle'
})

const authStore = useAuthStore()
const { t, setLocale } = useI18n({ useScope: 'global' })

const loading = ref(true)
const saving = ref(false)
const error = ref('')

const step = ref(0)
const steps = computed(() => ([
  t('admin.pages.onboarding.steps.brand'),
  t('admin.pages.onboarding.steps.template'),
  t('admin.pages.onboarding.steps.language'),
  t('admin.pages.onboarding.steps.summary')
]))
const progressPercent = computed(() => Math.round(((step.value + 1) / steps.value.length) * 100))

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
    color: '#9333EA',
    bg: '#faf5ff',
    cardBg: '#ffffff',
    imgBg: 'linear-gradient(135deg,#f3e8ff,#e9d5ff)',
    border: '#e9d5ff',
    textColor: '#334155',
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
    color: '#EAB308',
    bg: '#000000',
    cardBg: '#111111',
    imgBg: 'linear-gradient(135deg,#1f2937,#000000)',
    border: '#333333',
    textColor: '#d1d5db',
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
    color: '#A67C52',
    bg: '#0E1117',
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
const languages = computed(() => ([
  { key: 'ar', label: `${t('i18n.locales.ar')} (AR)` },
  { key: 'fr', label: `${t('i18n.locales.fr')} (FR)` },
  { key: 'en', label: `${t('i18n.locales.en')} (EN)` }
]))


const form = reactive({
  primaryColor: '#0d9488',
  templateKey: 'classic',
  language: 'fr'
})

const summaryLoading = ref(false)
const summaryMarkdown = ref('')

async function loadSettings() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<any>('/api/admin/store-settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })

    form.primaryColor = data.primaryColor || form.primaryColor
    form.templateKey = data.templateKey || form.templateKey
    form.language = data.language || form.language
    await setLocale(form.language as any)
  } catch (e: any) {
    error.value = e.data?.statusMessage || t('admin.pages.onboarding.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

async function save(partial?: { isCompleted?: boolean }) {
  saving.value = true
  error.value = ''
  try {
    const payload: any = {
      primaryColor: form.primaryColor,
      templateKey: form.templateKey,
      language: form.language,
      ...partial
    }

    const updated = await $fetch<any>('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: payload
    })

    useState<any>('storeSettings').value = updated
    return true
  } catch (e: any) {
    error.value = e.data?.statusMessage || t('admin.pages.onboarding.errors.saveFailed')
    return false
  } finally {
    saving.value = false
  }
}

async function nextStep() {
  const ok = await save()
  if (!ok) return
  step.value++
}

async function finish() {
  const ok = await save({ isCompleted: true })
  if (!ok) return
  await navigateTo('/admin')
}

async function loadSummary() {
  summaryLoading.value = true
  try {
    const data = await $fetch<any>('/api/admin/store-settings/agent-summary', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    summaryMarkdown.value = data.markdown || ''
  } catch (e: any) {
    error.value = e.data?.statusMessage || t('admin.pages.onboarding.errors.summaryFailed')
  } finally {
    summaryLoading.value = false
  }
}

watch(
  () => form.language,
  async (next) => {
    try {
      await setLocale(next as any)
    } catch (e) {
      console.error('Failed to switch locale from onboarding', e)
    }
  }
)

async function copySummary() {
  if (!summaryMarkdown.value) return
  try {
    await navigator.clipboard.writeText(summaryMarkdown.value)
  } catch {
    // ignore
  }
}

onMounted(() => {
  loadSettings()
})
</script>
