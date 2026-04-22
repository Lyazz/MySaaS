<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="ui-card overflow-hidden">
      <div class="p-6 md:p-8 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold" style="color: var(--text-primary)">
            {{ t('admin.pages.settings.functional.title') }}
          </h2>
          <p style="color: var(--text-secondary)" class="mt-2 max-w-2xl">
            {{ t('admin.pages.settings.functional.subtitle') }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="ui-btn ui-btn--secondary"
            :disabled="loading || saving"
            @click="reset"
          >
            {{ t('admin.common.reset') }}
          </button>
          <button
            type="button"
            class="px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
            :class="saving ? 'opacity-50 cursor-not-allowed' : ''"
            :disabled="loading || saving"
            @click="save"
          >
            <Icon v-if="saving" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
            {{ t('admin.common.saveChanges') }}
          </button>
        </div>
      </div>
    </div>

    <form @submit.prevent="save" class="space-y-6">
      
      <!-- Store Features -->
      <div class="ui-card overflow-hidden">
        <div class="p-6 md:p-8 md:grid md:grid-cols-3 md:gap-8">
          <div class="md:col-span-1">
            <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
              {{ t('admin.functionalSettingsForm.features.title') }}
            </h3>
            <p class="mt-2 text-sm leading-relaxed" style="color: var(--text-tertiary)">
              {{ t('admin.functionalSettingsForm.features.subtitle') }}
            </p>
          </div>
          
          <div class="mt-6 md:mt-0 md:col-span-2 space-y-4">
            <!-- Cart Toggle -->
            <div class="flex items-start md:items-center justify-between p-4 rounded-xl transition-all duration-200" style="border: 1px solid var(--surface-border); background: var(--surface-2)">
              <div class="flex-1 pr-4">
                <h4 class="text-sm font-semibold flex items-center gap-2" style="color: var(--text-primary)">
                  <Icon name="lucide:handbag" class="w-4 h-4 [color:var(--brand)]" />
                  {{ t('admin.functionalSettingsForm.features.cart.title') }}
                </h4>
                <p class="text-sm mt-1" style="color: var(--text-tertiary)">
                  {{ t('admin.functionalSettingsForm.features.cart.subtitle') }}
                </p>
              </div>
              <BaseToggle v-model="form.cartEnabled" :sr-label="t('admin.functionalSettingsForm.features.cart.toggle')" />
            </div>

            <!-- COD Toggle -->
            <div class="flex items-start md:items-center justify-between p-4 rounded-xl transition-all duration-200" style="border: 1px solid var(--surface-border); background: var(--surface-2)">
              <div class="flex-1 pr-4">
                <h4 class="text-sm font-semibold flex items-center gap-2" style="color: var(--text-primary)">
                  <Icon name="lucide:banknote" class="w-4 h-4 [color:var(--brand)]" />
                  {{ t('admin.functionalSettingsForm.features.cod.title') }}
                </h4>
                <p class="text-sm mt-1" style="color: var(--text-tertiary)">
                  {{ t('admin.functionalSettingsForm.features.cod.subtitle') }}
                </p>
              </div>
              <BaseToggle v-model="form.codEnabled" :sr-label="t('admin.functionalSettingsForm.features.cod.toggle')" />
            </div>
          </div>
        </div>
      </div>

      <!-- Announcement Bar -->
      <div class="ui-card overflow-hidden">
        <div class="p-6 md:p-8 md:grid md:grid-cols-3 md:gap-8">
          <div class="md:col-span-1">
            <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
              {{ t('admin.appearanceSettingsForm.announcement.title') }}
            </h3>
            <p class="mt-2 text-sm leading-relaxed" style="color: var(--text-tertiary)">
              {{ t('admin.appearanceSettingsForm.announcement.subtitle') }}
            </p>
          </div>
          
          <div class="mt-6 md:mt-0 md:col-span-2 space-y-4">
            <!-- Announcement Bar -->
            <div class="flex items-center justify-between p-4 rounded-xl transition-all duration-200" style="border: 1px solid var(--surface-border); background: var(--surface-2)">
              <div class="flex-1 pr-4">
                <h4 class="text-sm font-semibold flex items-center gap-2" style="color: var(--text-primary)">
                  <Icon name="lucide:megaphone" class="w-4 h-4 [color:var(--brand)]" />
                  {{ t('admin.appearanceSettingsForm.announcement.marquee') }}
                </h4>
              </div>
              <BaseToggle v-model="form.announcementScrolling" :sr-label="t('admin.appearanceSettingsForm.announcement.marquee')" />
            </div>

            <div v-if="form.announcementScrolling" class="animate-fadeIn mt-4">
               <label class="ui-label mb-1.5 block">{{ t('admin.appearanceSettingsForm.announcement.message.label') }}</label>
                <input
                  v-model="form.announcementText"
                  type="text"
                  class="ui-input block w-full rounded-lg shadow-sm focus:[border-color:var(--brand)] focus:[--tw-ring-color:var(--brand)] sm:text-sm"
                  :placeholder="t('admin.appearanceSettingsForm.announcement.message.placeholder')"
                >
            </div>

            <!-- Future Option Placeholder -->
            <div class="flex items-center justify-between p-4 rounded-xl transition-all duration-200 opacity-60" style="border: 1px solid var(--surface-border); background: var(--surface-2)">
              <div class="flex-1 pr-4">
                <h4 class="text-sm font-semibold flex items-center gap-2" style="color: var(--text-primary)">
                  <Icon name="lucide:search" class="w-4 h-4 [color:var(--brand)]" />
                  {{ t('admin.functionalSettingsForm.storefrontSearch.title') }}
                </h4>
                <p class="text-sm mt-1" style="color: var(--text-tertiary)">
                  {{ t('admin.functionalSettingsForm.storefrontSearch.subtitle') }}
                </p>
              </div>
              <BaseToggle :model-value="false" disabled :sr-label="t('admin.functionalSettingsForm.storefrontSearch.title')" />
            </div>
          </div>
        </div>
      </div>

      <!-- Currency -->
      <div class="ui-card overflow-hidden">
        <div class="p-6 md:p-8 md:grid md:grid-cols-3 md:gap-8">
          <div class="md:col-span-1">
            <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
              {{ t('admin.functionalSettingsForm.currency.title') }}
            </h3>
            <p class="mt-2 text-sm leading-relaxed" style="color: var(--text-tertiary)">
              {{ t('admin.functionalSettingsForm.currency.subtitle') }}
            </p>
          </div>
          
          <div class="mt-6 md:mt-0 md:col-span-2">
            <label class="ui-label mb-2 block">{{ t('admin.functionalSettingsForm.currency.selectLabel') }}</label>
            <BaseSelect
                v-model="form.currencyCountry"
                :disabled="loadingCurrencies"
                @change="onCountryChange"
            >
                <option v-if="loadingCurrencies" value="" disabled>{{ t('admin.functionalSettingsForm.currency.loadingCurrencies') }}</option>
                <option
                  v-for="c in currencies"
                  :key="c.country"
                  :value="c.country"
                >
                  {{ c.label }}
                </option>
            </BaseSelect>
            <p class="mt-2 text-xs" style="color: var(--text-tertiary)">
              {{ t('admin.functionalSettingsForm.currency.note') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Localization -->
      <div class="ui-card overflow-hidden">
        <div class="p-6 md:p-8 md:grid md:grid-cols-3 md:gap-8">
          <div class="md:col-span-1">
            <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
              {{ t('admin.functionalSettingsForm.localization.title') }}
            </h3>
            <p class="mt-2 text-sm leading-relaxed" style="color: var(--text-tertiary)">
              {{ t('admin.functionalSettingsForm.localization.subtitle') }}
            </p>
          </div>
          
          <div class="mt-6 md:mt-0 md:col-span-2">
            <label class="ui-label mb-2 block">{{ t('admin.functionalSettingsForm.localization.defaultLanguage') }}</label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div 
                v-for="l in languages" 
                :key="l.key"
                class="cursor-pointer relative rounded-xl border p-3 flex flex-col items-center justify-center text-center transition-all hover:[border-color:rgba(var(--brand-rgb)/0.4)]"
                :class="form.language === l.key ? '[border-color:var(--brand)] [background:rgba(var(--brand-rgb)/0.08)]/50 ring-1 [--tw-ring-color:var(--brand)]' : ''"
                :style="form.language !== l.key ? 'background: var(--surface-1); border-color: var(--surface-border)' : ''"
                @click="form.language = l.key"
              >
                 <span class="text-2xl mb-2">{{ l.flag }}</span>
                 <span class="text-sm font-medium" :class="form.language === l.key ? '[color:var(--brand)]' : ''" :style="form.language !== l.key ? 'color: var(--text-secondary)' : ''">{{ l.label }}</span>
                 <Icon v-if="form.language === l.key" name="lucide:check-circle-2" class="w-4 h-4 [color:var(--brand)] absolute top-2 right-2" />
              </div>
            </div>

            <div
              v-if="form.language === 'ar'"
              class="mt-4 flex items-start gap-3 rounded-lg border p-3"
              style="background: var(--accent-soft); border-color: var(--accent-border)"
            >
               <Icon name="lucide:languages" class="mt-0.5 h-5 w-5 shrink-0" style="color: var(--accent)" />
               <div>
                 <p class="text-sm font-medium" style="color: var(--accent)">{{ t('admin.functionalSettingsForm.localization.rtl.title') }}</p>
                 <p class="mt-0.5 text-xs" style="color: color-mix(in srgb, var(--accent) 78%, white 22%)">
                   {{ t('admin.functionalSettingsForm.localization.rtl.subtitle') }}
                 </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="fixed bottom-6 right-6 md:static md:flex md:justify-end">
         <div class="md:bg-transparent p-2 md:p-0 rounded-full shadow-lg md:shadow-none md:border-none flex items-center gap-3" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
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
              class="hidden md:inline-flex ui-btn ui-btn--secondary"
              :disabled="loading || saving"
              @click="reset"
            >
              {{ t('admin.functionalSettingsForm.actions.discardChanges') }}
            </button>
            
            <button
              type="submit"
              class="inline-flex px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2 justify-center"
              :class="saving ? 'opacity-50 cursor-not-allowed' : ''"
              :disabled="loading || saving"
            >
              <Icon v-if="saving" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
              {{ saving ? t('admin.common.saving') : t('admin.common.saveChanges') }}
            </button>
         </div>
      </div>
      
      <!-- Mobile Notifications (Toast style) -->
      <div v-if="successMessage || errorMessage" class="md:hidden fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4">
        <div class="text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between" style="background: var(--surface-3)">
           <span class="text-sm font-medium">{{ successMessage || errorMessage }}</span>
           <button @click="successMessage = ''; errorMessage = ''" class="ml-4 hover:text-white" style="color: var(--text-muted)">
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
const { t } = useI18n({ useScope: 'global' })
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
  language: 'en',
  announcementText: '',
  announcementScrolling: false
})

const languages = computed(() => [
  { key: 'en', label: t('i18n.locales.en'), flag: '🇬🇧' },
  { key: 'fr', label: t('i18n.locales.fr'), flag: '🇫🇷' },
  { key: 'ar', label: t('i18n.locales.ar'), flag: '🇩🇿' }
])

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
    errorMessage.value = t('admin.functionalSettingsForm.messages.loadFailed')
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  successMessage.value = ''
  errorMessage.value = ''
  try {
    const updated = await $fetch('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        cartEnabled: form.cartEnabled,
        codEnabled: form.codEnabled,
        currencyCode: form.currencyCode,
        currencyCountry: form.currencyCountry,
        language: form.language,
        announcementText: form.announcementText,
        announcementScrolling: form.announcementScrolling
      }
    })
    useState<any>('storeSettings').value = updated
    successMessage.value = t('admin.functionalSettingsForm.messages.saved')
    setTimeout(() => (successMessage.value = ''), 4000)
  } catch (e: any) {
    console.error('Failed to save settings', e)
    errorMessage.value = e.data?.statusMessage || t('admin.functionalSettingsForm.messages.saveFailed')
    setTimeout(() => (errorMessage.value = ''), 4000)
  } finally {
    saving.value = false
  }
}

const reset = () => {
  if (confirm(t('admin.functionalSettingsForm.confirm.discard'))) {
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
