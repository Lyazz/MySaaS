<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200">
    <div class="p-6 border-b border-slate-200">
      <h2 class="text-xl font-bold text-slate-800">
        Store Appearance & Settings
      </h2>
      <p class="text-slate-600 mt-1">
        Customize how your store looks and manages core commerce features.
      </p>
    </div>

    <form
      class="p-6 space-y-8"
      @submit.prevent="save"
    >
      <!-- Logo Section -->
      <section>
        <div class="md:grid md:grid-cols-3 md:gap-6">
          <div class="md:col-span-1">
            <h3 class="text-lg font-medium leading-6 text-slate-900">
              Brand Logo
            </h3>
            <p class="mt-1 text-sm text-slate-500">
              This logo will appear on your storefront header and invoices.
            </p>
          </div>
          <div class="mt-5 md:mt-0 md:col-span-2">
            <SingleImageUploader
              v-model="form.logoUrl"
              label="Store Logo"
              hint="Recommended size: 200x60px. PNG or SVG preferred."
            />
          </div>
        </div>
      </section>

      <div class="border-t border-slate-200" />

      <!-- Brand Colors -->
      <section>
        <div class="md:grid md:grid-cols-3 md:gap-6">
          <div class="md:col-span-1">
            <h3 class="text-lg font-medium leading-6 text-slate-900">
              Brand Colors
            </h3>
            <p class="mt-1 text-sm text-slate-500">
              Choose a primary color for buttons, links, and highlights.
            </p>
          </div>
          <div class="mt-5 md:mt-0 md:col-span-2 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Primary Color</label>
                <div class="flex items-center gap-3">
                  <input
                    v-model="form.primaryColor"
                    type="color"
                    class="h-10 w-14 rounded border border-slate-300 bg-white p-1 cursor-pointer"
                  >
                  <input
                    v-model="form.primaryColor"
                    type="text"
                    pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                    class="block w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    placeholder="#4F46E5"
                  >
                </div>
              </div>
            </div>
            
            <!-- Preview -->
            <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span class="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-3">Live Preview</span>
              <div class="flex gap-3">
                <button
                  type="button"
                  class="px-4 py-2 rounded-lg text-white font-medium shadow-sm transition-opacity hover:opacity-90"
                  :style="{ backgroundColor: form.primaryColor }"
                >
                  Button
                </button>
                <button
                  type="button"
                  class="px-4 py-2 rounded-lg border font-medium shadow-sm bg-white"
                  :style="{ borderColor: form.primaryColor, color: form.primaryColor }"
                >
                  Outline
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="border-t border-slate-200" />

      <!-- Store Features -->
      <section>
        <div class="md:grid md:grid-cols-3 md:gap-6">
          <div class="md:col-span-1">
            <h3 class="text-lg font-medium leading-6 text-slate-900">
              Store Features
            </h3>
            <p class="mt-1 text-sm text-slate-500">
              Toggle core commerce flows for your storefront.
            </p>
          </div>
          <div class="mt-5 md:mt-0 md:col-span-2 space-y-3">
            <div
              class="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div class="h-10 w-10 flex items-center justify-center rounded-full bg-teal-50 text-teal-600">
                <Icon name="lucide:shopping-cart" class="w-5 h-5" />
              </div>
              <div class="flex-1">
                <p class="font-semibold text-slate-900">
                  Cart & Checkout
                </p>
                <p class="text-sm text-slate-500">
                  Allow customers to add items to cart and complete checkout.
                </p>
              </div>
              <button
                type="button"
                :class="form.cartEnabled ? 'bg-teal-600' : 'bg-slate-200'"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                @click="form.cartEnabled = !form.cartEnabled"
              >
                <span
                  aria-hidden="true"
                  :class="form.cartEnabled ? 'translate-x-5' : 'translate-x-0'"
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition"
                />
              </button>
            </div>

            <div
              class="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div class="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="lucide:banknote" class="w-5 h-5" />
              </div>
              <div class="flex-1">
                <p class="font-semibold text-slate-900">
                  COD on Product Page
                </p>
                <p class="text-sm text-slate-500">
                  Show the one-click cash-on-delivery form directly on product landing pages.
                </p>
              </div>
              <button
                type="button"
                :class="form.codEnabled ? 'bg-emerald-600' : 'bg-slate-200'"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                @click="form.codEnabled = !form.codEnabled"
              >
                <span
                  aria-hidden="true"
                  :class="form.codEnabled ? 'translate-x-5' : 'translate-x-0'"
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition"
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div class="border-t border-slate-200" />

      <!-- Currency -->
      <section>
        <div class="md:grid md:grid-cols-3 md:gap-6">
          <div class="md:col-span-1">
            <h3 class="text-lg font-medium leading-6 text-slate-900">
              Store Currency
            </h3>
            <p class="mt-1 text-sm text-slate-500">
              Choose the currency shown on product prices. Symbols and formatting will follow this choice.
            </p>
          </div>
          <div class="mt-5 md:mt-0 md:col-span-2 space-y-3">
            <label class="block text-sm font-medium text-slate-700 mb-1">Currency</label>
            <div class="relative">
              <select
                v-model="form.currencyCode"
                class="block w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm pl-11"
                @change="onCurrencyChange"
              >
                <option
                  v-for="c in currencies"
                  :key="c.code"
                  :value="c.code"
                >
                  {{ c.label }}
                </option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <span class="text-xl">{{ selectedCurrency?.flag || '🌍' }}</span>
              </div>
            </div>
            <p class="text-xs text-slate-500">
              Currency code: {{ form.currencyCode }} · Country: {{ form.currencyCountry }}
            </p>
          </div>
        </div>
      </section>

      <div class="border-t border-slate-200" />

      <!-- Template Selection -->
      <section>
        <div class="md:grid md:grid-cols-3 md:gap-6">
          <div class="md:col-span-1">
            <h3 class="text-lg font-medium leading-6 text-slate-900">
              Store Template
            </h3>
            <p class="mt-1 text-sm text-slate-500">
              Select the layout structure for your storefront.
            </p>
          </div>
          <div class="mt-5 md:mt-0 md:col-span-2">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="t in templates"
                :key="t.key"
                class="cursor-pointer relative rounded-xl border p-4 shadow-sm flex flex-col transition-all hover:border-teal-300"
                :class="form.templateKey === t.key ? 'border-teal-500 ring-2 ring-teal-500 ring-opacity-50 bg-teal-50' : 'border-slate-200 bg-white'"
                @click="form.templateKey = t.key"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="font-semibold text-slate-900">{{ t.label }}</span>
                  <span
                    v-if="form.templateKey === t.key"
                    class="h-2 w-2 rounded-full bg-teal-600"
                  />
                </div>
                <p class="text-sm text-slate-500 mb-3">
                  {{ t.description }}
                </p>
                <div
                  class="mt-auto pt-2 flex items-center text-xs font-medium"
                  :class="form.templateKey === t.key ? 'text-teal-700' : 'text-slate-500'"
                >
                  {{ form.templateKey === t.key ? 'Selected' : 'Select' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="border-t border-slate-200" />

      <!-- Localization -->
      <section>
        <div class="md:grid md:grid-cols-3 md:gap-6">
          <div class="md:col-span-1">
            <h3 class="text-lg font-medium leading-6 text-slate-900">
              Localization
            </h3>
            <p class="mt-1 text-sm text-slate-500">
              Set the default language for your store. Translations will be added later.
            </p>
          </div>
          <div class="mt-5 md:mt-0 md:col-span-2">
            <div class="max-w-xs">
              <label class="block text-sm font-medium text-slate-700 mb-1">Default Language</label>
              <select
                v-model="form.language"
                class="block w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
              >
                <option
                  v-for="l in languages"
                  :key="l.key"
                  :value="l.key"
                >
                  {{ l.label }}
                </option>
              </select>
              <p
                v-if="form.language === 'ar'"
                class="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200"
              >
                Note: Selecting Arabic will enable Right-to-Left (RTL) layout automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Actions -->
      <div class="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
        <div
          v-if="successMessage"
          class="text-sm text-emerald-600 font-medium mr-auto animate-fadeIn"
        >
          {{ successMessage }}
        </div>
        <div
          v-if="errorMessage"
          class="text-sm text-red-600 font-medium mr-auto animate-fadeIn"
        >
          {{ errorMessage }}
        </div>

        <button
          type="button"
          class="px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          :disabled="loading || saving"
          @click="reset"
        >
          Reset
        </button>
        <button
          type="submit"
          class="inline-flex justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading || saving"
        >
          <Icon
            v-if="saving"
            name="lucide:loader-2"
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
          />
          {{ saving ? 'Saving Changes...' : 'Save Changes' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SingleImageUploader from './SingleImageUploader.vue'

const props = defineProps<{
  initialSettings?: any
}>()

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const form = reactive({
  logoUrl: null as string | null,
  primaryColor: '#4F46E5',
  templateKey: 'classic',
  language: 'en',
  cartEnabled: true,
  codEnabled: true,
  currencyCode: 'DZD',
  currencyCountry: 'DZ'
})

const templates = [
  { key: 'classic', label: 'Classic Shop', description: 'Traditional e-commerce layout with a focus on products.' },
  { key: 'modern', label: 'Modern Minimal', description: 'Clean, spacious design with bold typography and large images.' }
]

const languages = [
  { key: 'en', label: 'English (EN)' },
  { key: 'fr', label: 'Français (FR)' },
  { key: 'ar', label: 'العربية (AR)' }
]

const currencies = [
  { code: 'DZD', country: 'DZ', flag: '🇩🇿', label: '🇩🇿 Algeria — DZD' },
  { code: 'EUR', country: 'FR', flag: '🇫🇷', label: '🇫🇷 France — EUR' },
  { code: 'USD', country: 'US', flag: '🇺🇸', label: '🇺🇸 United States — USD' }
]

const selectedCurrency = computed(() => currencies.find((c) => c.code === form.currencyCode))

// Initialize form from props if available, or fetch
const init = async () => {
  if (props.initialSettings) {
    updateForm(props.initialSettings)
  } else {
    await fetchSettings()
  }
}

const updateForm = (data: any) => {
  if (!data) return
  form.logoUrl = data.logoUrl || null
  form.primaryColor = data.primaryColor || '#4F46E5'
  form.templateKey = data.templateKey || 'classic'
  form.language = data.language || 'en'
  form.cartEnabled = data.cartEnabled ?? true
  form.codEnabled = data.codEnabled ?? true
  form.currencyCode = data.currencyCode || 'DZD'
  form.currencyCountry = data.currencyCountry || 'DZ'
}

const fetchSettings = async () => {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/admin/store-settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    updateForm(data)
  } catch (e) {
    console.error('Failed to load settings', e)
    // Keep defaults
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  successMessage.value = ''
  errorMessage.value = ''
  
  try {
    const updated = await $fetch<any>('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        ...form
      }
    })
    
    // Update global state if used
    useState<any>('storeSettings').value = updated
    
    successMessage.value = 'Store settings saved successfully!'
    setTimeout(() => { successMessage.value = '' }, 3000)
    
  } catch (e: any) {
    console.error('Failed to save settings', e)
    errorMessage.value = e.data?.statusMessage || 'Failed to save settings. Please try again.'
  } finally {
    saving.value = false
  }
}

const reset = () => {
  if (confirm('Are you sure you want to discard your changes and reload saved settings?')) {
    fetchSettings()
  }
}

const onCurrencyChange = () => {
  const cur = currencies.find((c) => c.code === form.currencyCode)
  if (cur) {
    form.currencyCountry = cur.country
  }
}

onMounted(() => {
  init()
})
</script>
