<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200">
    <div class="p-6 border-b border-slate-200">
      <h2 class="text-xl font-bold text-slate-800">
        Functional Settings
      </h2>
      <p class="text-slate-600 mt-1">
        Commerce features, COD on product page, and currency.
      </p>
    </div>

    <form
      class="p-6 space-y-8"
      @submit.prevent="save"
    >
      <!-- Store Features -->
      <section>
        <div class="md:grid md:grid-cols-3 md:gap-6">
          <div class="md:col-span-1">
            <h3 class="text-lg font-medium leading-6 text-slate-900">
              Store Features
            </h3>
            <p class="mt-1 text-sm text-slate-500">
              Toggle core commerce flows.
            </p>
          </div>
          <div class="mt-5 md:mt-0 md:col-span-2 space-y-3">
            <div class="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-brand-200 hover:shadow-md">
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="text-sm font-semibold text-slate-900">
                      Cart & Checkout
                    </h4>
                    <p class="text-sm text-slate-500 mt-0.5">
                      Allow multi-product purchases and access to checkout.
                    </p>
                  </div>
                  <BaseToggle v-model="form.cartEnabled" sr-label="Enable shopping cart" class="ml-4" />
                </div>
              </div>
            </div>

            <div class="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-brand-200 hover:shadow-md">
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="text-sm font-semibold text-slate-900">
                      COD on Product Page
                    </h4>
                    <p class="text-sm text-slate-500 mt-0.5">
                      Show the one-click cash-on-delivery form on product landing pages.
                    </p>
                  </div>
                  <BaseToggle v-model="form.codEnabled" sr-label="Enable COD form" class="ml-4" />
                </div>
              </div>
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
              Currency shown on product prices.
            </p>
          </div>
          <div class="mt-5 md:mt-0 md:col-span-2 space-y-3">
            <label class="block text-sm font-medium text-slate-700 mb-1">Currency</label>
            <div>
              <select
                v-model="form.currencyCountry"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                :disabled="loadingCurrencies"
                @change="onCountryChange"
              >
                <option v-if="loadingCurrencies" value="" disabled>Loading countries...</option>
                <option
                  v-for="c in currencies"
                  :key="c.country"
                  :value="c.country"
                >
                  {{ c.label }}
                </option>
              </select>
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
              Default language for your store. Translations will be added later.
            </p>
          </div>
          <div class="mt-5 md:mt-0 md:col-span-2 space-y-3">
            <label class="block text-sm font-medium text-slate-700 mb-1">Default Language</label>
            <div>
              <select
                v-model="form.language"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                Arabic will enable RTL layout automatically.
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
          class="px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          :disabled="loading || saving"
          @click="reset"
        >
          Reset
        </button>
        <button
          type="submit"
          class="inline-flex justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading || saving"
        >
          <svg
            v-if="saving"
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {{ saving ? 'Saving…' : 'Save functionality' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseToggle from '~/components/ui/BaseToggle.vue'

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const loadingCurrencies = ref(false)

const form = reactive({
  cartEnabled: true,
  codEnabled: true,
  currencyCode: 'DZD',
  currencyCountry: 'DZ',
  language: 'en'
})

const languages = [
  { key: 'en', label: 'English (EN)' },
  { key: 'fr', label: 'Français (FR)' },
  { key: 'ar', label: 'العربية (AR)' }
]

interface CurrencyOption {
  code: string
  country: string
  flag: string
  label: string
}

const currencies = ref<CurrencyOption[]>([])

const fetchCurrencies = async () => {
  loadingCurrencies.value = true
  try {
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,currencies,cca2,flag')
    if (!response.ok) throw new Error('Failed to fetch countries')
    const data = await response.json()
    
    const formatted: CurrencyOption[] = data
      .filter((c: any) => c.currencies && Object.keys(c.currencies).length > 0)
      .map((c: any) => {
        const currencyCode = Object.keys(c.currencies)[0]
        return {
          code: currencyCode,
          country: c.cca2,
          flag: c.flag,
          label: `${c.flag} ${c.name.common} (${currencyCode})`
        }
      })
      .sort((a: CurrencyOption, b: CurrencyOption) => a.label.localeCompare(b.label))
      
    currencies.value = formatted
    
    // If current selected currency isn't in list (rare case or initial load race), it's fine,
    // but if form has no currency set, maybe default to something? 
    // For now we trust the backend value or the default 'DZD'.
    
  } catch (e) {
    console.error('Failed to load currencies', e)
    // Fallback or error state could go here, but we'll stick to a basic list or empty for graceful degradation
    // Maybe keep the original simple list as fallback?
    currencies.value = [
       { code: 'DZD', country: 'DZ', flag: '🇩🇿', label: '🇩🇿 Algeria (DZD)' },
       { code: 'USD', country: 'US', flag: '🇺🇸', label: '🇺🇸 United States (USD)' },
       { code: 'EUR', country: 'FR', flag: '🇪🇺', label: '🇪🇺 Euro (EUR)' },
    ]
  } finally {
    loadingCurrencies.value = false
  }
}


const updateForm = (data: any) => {
  if (!data) return
  form.cartEnabled = data.cartEnabled ?? true
  form.codEnabled = data.codEnabled ?? true
  form.currencyCode = data.currencyCode || 'DZD'
  form.currencyCountry = data.currencyCountry || 'DZ'
  form.language = data.language || 'en'
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
        cartEnabled: form.cartEnabled,
        codEnabled: form.codEnabled,
        currencyCode: form.currencyCode,
        currencyCountry: form.currencyCountry,
        language: form.language
      }
    })
    useState<any>('storeSettings').value = updated
    successMessage.value = 'Functional settings saved!'
    setTimeout(() => (successMessage.value = ''), 3000)
  } catch (e: any) {
    console.error('Failed to save settings', e)
    errorMessage.value = e.data?.statusMessage || 'Failed to save. Please try again.'
  } finally {
    saving.value = false
  }
}

const reset = () => fetchSettings()

const onCountryChange = () => {
  const cur = currencies.value.find((c) => c.country === form.currencyCountry)
  if (cur) {
    form.currencyCode = cur.code
  }
}

onMounted(() => {
  fetchCurrencies()
  fetchSettings()
})
</script>
