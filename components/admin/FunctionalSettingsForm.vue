<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="p-6 md:p-8">
        <h2 class="text-xl font-bold text-slate-900">
          Functional Settings
        </h2>
        <p class="text-slate-600 mt-2 max-w-2xl">
          Configure how your store behaves. Manage core features, checkout options, and localization preferences.
        </p>
      </div>
    </div>

    <form @submit.prevent="save" class="space-y-6">
      
      <!-- Store Features -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6 md:p-8 md:grid md:grid-cols-3 md:gap-8">
          <div class="md:col-span-1">
            <h3 class="text-lg font-semibold text-slate-900">
              Store Features
            </h3>
            <p class="mt-2 text-sm text-slate-500 leading-relaxed">
              Enable or disable core functionality for your storefront.
            </p>
          </div>
          
          <div class="mt-6 md:mt-0 md:col-span-2 space-y-4">
            <!-- Cart Toggle -->
            <div class="flex items-start md:items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-200 hover:shadow-sm transition-all duration-200">
              <div class="flex-1 pr-4">
                <h4 class="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Icon name="lucide:handbag" class="w-4 h-4 text-teal-600" />
                  Cart & Checkout
                </h4>
                <p class="text-sm text-slate-500 mt-1">
                  Allow customers to add multiple items to a cart and proceed to checkout.
                </p>
              </div>
              <BaseToggle v-model="form.cartEnabled" sr-label="Enable shopping cart" />
            </div>

            <!-- COD Toggle -->
            <div class="flex items-start md:items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-200 hover:shadow-sm transition-all duration-200">
              <div class="flex-1 pr-4">
                <h4 class="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Icon name="lucide:banknote" class="w-4 h-4 text-teal-600" />
                  Cash on Delivery (COD)
                </h4>
                <p class="text-sm text-slate-500 mt-1">
                  Show a 'Buy Now with COD' form directly on product pages for faster conversion.
                </p>
              </div>
              <BaseToggle v-model="form.codEnabled" sr-label="Enable COD form" />
            </div>
          </div>
        </div>
      </div>

      <!-- Currency -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6 md:p-8 md:grid md:grid-cols-3 md:gap-8">
          <div class="md:col-span-1">
            <h3 class="text-lg font-semibold text-slate-900">
              Store Currency
            </h3>
            <p class="mt-2 text-sm text-slate-500 leading-relaxed">
              Set the primary currency for your product prices and transactions.
            </p>
          </div>
          
          <div class="mt-6 md:mt-0 md:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-2">Select Currency</label>
            <BaseSelect
                v-model="form.currencyCountry"
                :disabled="loadingCurrencies"
                @change="onCountryChange"
            >
                <option v-if="loadingCurrencies" value="" disabled>Loading currencies...</option>
                <option
                  v-for="c in currencies"
                  :key="c.country"
                  :value="c.country"
                >
                  {{ c.label }}
                </option>
            </BaseSelect>
            <p class="mt-2 text-xs text-slate-500">
              Note: Changing currency may not automatically convert existing product prices.
            </p>
          </div>
        </div>
      </div>

      <!-- Localization -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6 md:p-8 md:grid md:grid-cols-3 md:gap-8">
          <div class="md:col-span-1">
            <h3 class="text-lg font-semibold text-slate-900">
              Localization
            </h3>
            <p class="mt-2 text-sm text-slate-500 leading-relaxed">
              Choose the default language for your storefront.
            </p>
          </div>
          
          <div class="mt-6 md:mt-0 md:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-2">Default Language</label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div 
                v-for="l in languages" 
                :key="l.key"
                class="cursor-pointer relative rounded-xl border p-3 flex flex-col items-center justify-center text-center transition-all hover:border-teal-300"
                :class="form.language === l.key ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500' : 'border-slate-200 bg-white hover:bg-slate-50'"
                @click="form.language = l.key"
              >
                 <span class="text-2xl mb-2">{{ l.flag }}</span>
                 <span class="text-sm font-medium" :class="form.language === l.key ? 'text-teal-900' : 'text-slate-700'">{{ l.label }}</span>
                 <Icon v-if="form.language === l.key" name="lucide:check-circle-2" class="w-4 h-4 text-teal-600 absolute top-2 right-2" />
              </div>
            </div>

            <div v-if="form.language === 'ar'" class="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
               <Icon name="lucide:languages" class="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
               <div>
                 <p class="text-sm font-medium text-amber-800">RTL Support Enabled</p>
                 <p class="text-xs text-amber-700 mt-0.5">
                   Your storefront will automatically switch to Right-to-Left layout for Arabic.
                 </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="fixed bottom-6 right-6 md:static md:flex md:justify-end">
         <div class="bg-white md:bg-transparent p-2 md:p-0 rounded-full shadow-lg md:shadow-none border md:border-none border-slate-200 flex items-center gap-3">
            <div
              v-if="successMessage"
              class="hidden md:block text-sm text-emerald-600 font-medium animate-fadeIn px-3"
            >
              {{ successMessage }}
            </div>
            <div
              v-if="errorMessage"
              class="hidden md:block text-sm text-red-600 font-medium animate-fadeIn px-3"
            >
              {{ errorMessage }}
            </div>
            
            <button
              type="button"
              class="hidden md:px-5 md:py-2.5 border border-slate-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 md:inline-flex"
              :disabled="loading || saving"
              @click="reset"
            >
              Discard Changes
            </button>
            
            <button
              type="submit"
              class="inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
              :disabled="loading || saving"
            >
              <Icon
                v-if="saving"
                name="lucide:loader-2"
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              />
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
         </div>
      </div>
      
      <!-- Mobile Notifications (Toast style) -->
      <div v-if="successMessage || errorMessage" class="md:hidden fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4">
        <div class="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
           <span class="text-sm font-medium">{{ successMessage || errorMessage }}</span>
           <button @click="successMessage = ''; errorMessage = ''" class="ml-4 text-slate-400 hover:text-white">
             <Icon name="lucide:x" class="w-4 h-4" />
           </button>
        </div>
      </div>

    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseToggle from '~/components/ui/BaseToggle.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'

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
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'fr', label: 'Français', flag: '🇫🇷' },
  { key: 'ar', label: 'العربية', flag: '🇩🇿' }
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
    
  } catch (e) {
    console.error('Failed to load currencies', e)
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
    errorMessage.value = 'Failed to load settings.'
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
    successMessage.value = 'Functional settings saved successfully!'
    setTimeout(() => (successMessage.value = ''), 4000)
  } catch (e: any) {
    console.error('Failed to save settings', e)
    errorMessage.value = e.data?.statusMessage || 'Failed to save changes. Please try again.'
    setTimeout(() => (errorMessage.value = ''), 4000)
  } finally {
    saving.value = false
  }
}

const reset = () => {
  if (confirm('Are you sure you want to discard your unsaved changes?')) {
    fetchSettings()
  }
}

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
