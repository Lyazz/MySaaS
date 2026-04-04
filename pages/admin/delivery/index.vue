<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">
          {{ t('admin.pages.delivery.title') }}
        </h2>
        <p class="text-gray-600 mt-1">
          {{ t('admin.pages.delivery.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Providers List -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div 
        v-for="provider in providers" 
        :key="provider.provider"
        class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
        :class="{'ring-2 ring-teal-500': selectedProvider?.provider === provider.provider}"
        @click="selectProvider(provider)"
      >
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center text-xl font-bold text-gray-600">
                {{ provider.provider[0] }}
              </div>
              <div>
                <h3 class="font-bold text-gray-900">
                  {{ provider.name }}
                </h3>
                <div class="mt-1 flex flex-wrap gap-2">
                  <span class="ui-badge ui-badge--slate">{{ provider.provider }}</span>
                  <span
                    v-if="provider.credentialFields.length === 0"
                    class="ui-badge ui-badge--indigo"
                  >{{ t('admin.pages.delivery.providers.noCredentials') }}</span>
                  <span
                    v-else-if="provider.account?.isActive"
                    class="ui-badge ui-badge--emerald"
                  >{{ t('admin.pages.delivery.providers.connected') }}</span>
                  <span
                    v-else
                    class="ui-badge ui-badge--amber"
                  >{{ t('admin.pages.delivery.providers.notConnected') }}</span>
                </div>
              </div>
            </div>
            <div @click.stop>
              <button 
                type="button" 
                class="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                :class="[provider.offered ? 'bg-green-500' : 'bg-gray-200']"
                role="switch" 
                :aria-checked="provider.offered"
                @click="toggleProvider(provider, $event)"
              >
                <span class="sr-only">{{ t('admin.pages.delivery.providers.toggleLabel') }}</span>
                <span 
                  aria-hidden="true" 
                  class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"
                  :class="[provider.offered ? 'translate-x-5' : 'translate-x-0']"
                />
              </button>
            </div>
          </div>

          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-500">{{ t('admin.pages.delivery.providers.wilayasSupported', { count: 58 }) }}</span>
            <span class="text-teal-600 font-medium">{{ t('admin.pages.delivery.providers.managePricing') }} &rarr;</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Provider Credentials -->
    <div
      v-if="selectedProvider"
      class="ui-card mb-8"
    >
      <div class="ui-card-header flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold text-slate-900">
            {{ t('admin.pages.delivery.credentials.title', { provider: selectedProvider.name }) }}
          </h3>
          <p class="text-sm text-slate-600">
            {{ t('admin.pages.delivery.credentials.hint') }}
          </p>
        </div>
        <button
          :disabled="savingAccount || selectedProvider.credentialFields.length === 0"
          class="ui-btn ui-btn--secondary ui-btn--md"
          @click="saveProviderAccount"
        >
          {{ savingAccount ? t('admin.common.saving') : t('admin.common.saveChanges') }}
        </button>
      </div>

      <div class="ui-card-body">
        <div class="flex flex-col gap-4">
          <div
            v-if="selectedProvider.credentialFields.length === 0"
            class="text-sm text-slate-600"
          >
            {{ t('admin.pages.delivery.credentials.noCredentials') }}
          </div>

          <div
            v-else
            class="flex flex-col gap-4"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-medium text-slate-900">
                  {{ t('admin.pages.delivery.credentials.enableLabel') }}
                </div>
                <div class="text-xs text-slate-500">
                  {{ t('admin.pages.delivery.credentials.enableHint') }}
                </div>
              </div>
              <button
                type="button"
                class="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                :class="[accountIsActive ? 'bg-green-500' : 'bg-gray-200']"
                role="switch"
                :aria-checked="accountIsActive"
                @click="accountIsActive = !accountIsActive"
              >
                <span class="sr-only">{{ t('admin.pages.delivery.credentials.enableLabel') }}</span>
                <span
                  aria-hidden="true"
                  class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"
                  :class="[accountIsActive ? 'translate-x-5' : 'translate-x-0']"
                />
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="field in selectedProvider.credentialFields"
                :key="field.key"
              >
                <label class="block text-sm font-medium text-slate-700">
                  {{ field.label }}
                  <span
                    v-if="field.required"
                    class="text-red-500"
                  >*</span>
                </label>
                <div class="mt-1 flex gap-2">
                  <input
                    v-model="accountConfigDraft[field.key]"
                    :type="field.secret ? 'password' : 'text'"
                    :placeholder="credentialPlaceholder(selectedProvider, field)"
                    class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500 transition-colors"
                  >
                  <button
                    v-if="field.secret && selectedProvider.account?.secrets?.[field.key]"
                    type="button"
                    class="ui-btn ui-btn--secondary ui-btn--sm"
                    @click="clearSecret(field.key)"
                  >
                    {{ t('admin.common.clear') }}
                  </button>
                </div>
                <p
                  v-if="field.secret"
                  class="mt-1 text-xs text-slate-500"
                >
                  {{
                    selectedProvider.account?.secrets?.[field.key]
                      ? t('admin.pages.delivery.credentials.secretSet')
                      : t('admin.pages.delivery.credentials.secretNotSet')
                  }}
                </p>
              </div>
            </div>
          </div>

          <p
            v-if="accountMessage"
            class="text-sm"
            :class="accountMessageKind === 'error' ? 'text-red-600' : 'text-emerald-700'"
          >
            {{ accountMessage }}
          </p>
        </div>
      </div>
    </div>

    <!-- Pricing Configuration -->
    <div
      v-if="selectedProvider"
      class="ui-card"
    >
      <div class="ui-card-header flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold text-slate-900">
            {{ t('admin.pages.delivery.pricing.title', { provider: selectedProvider.name }) }}
          </h3>
          <p class="text-sm text-slate-600">
            {{ t('admin.pages.delivery.pricing.hint') }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2 justify-end">
          <button
            :disabled="loadingCarrierRates || !canFetchCarrierRates"
            class="ui-btn ui-btn--secondary ui-btn--md"
            @click="fetchCarrierRates"
          >
            {{ loadingCarrierRates ? t('admin.pages.delivery.pricing.fetchingCarrierRates') : t('admin.pages.delivery.pricing.fetchCarrierRates') }}
          </button>

          <button 
            :disabled="saving" 
            class="ui-btn ui-btn--primary ui-btn--md"
            @click="saveRates"
          >
            {{ saving ? t('admin.common.saving') : t('admin.common.saveChanges') }}
          </button>
        </div>
      </div>

      <div class="px-6 pb-4 flex flex-col gap-3">
        <div class="flex flex-col md:flex-row md:items-center gap-3">
          <div class="flex-1">
            <input
              v-model="wilayaQuery"
              type="text"
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500 transition-colors"
              :placeholder="t('admin.pages.delivery.pricing.searchPlaceholder')"
            >
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              :class="wilayaFilter === 'all' ? 'ring-2 ring-teal-500' : ''"
              @click="wilayaFilter = 'all'"
            >
              {{ t('admin.pages.delivery.pricing.filters.all') }}
            </button>
            <button
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              :class="wilayaFilter === 'overrides' ? 'ring-2 ring-teal-500' : ''"
              @click="wilayaFilter = 'overrides'"
            >
              {{ t('admin.pages.delivery.pricing.filters.overrides') }}
            </button>
            <button
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              :class="wilayaFilter === 'no-overrides' ? 'ring-2 ring-teal-500' : ''"
              @click="wilayaFilter = 'no-overrides'"
            >
              {{ t('admin.pages.delivery.pricing.filters.noOverrides') }}
            </button>
            <button
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              :disabled="!carrierRatesFetched"
              :class="wilayaFilter === 'missing-carrier' ? 'ring-2 ring-teal-500' : ''"
              @click="wilayaFilter = 'missing-carrier'"
            >
              {{ t('admin.pages.delivery.pricing.filters.missingCarrier') }}
            </button>
          </div>
        </div>

        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm text-slate-600">
          <div>
            {{
              t('admin.pages.delivery.pricing.showingCount', {
                shown: pagedWilayas.length,
                total: filteredWilayas.length
              })
            }}
          </div>
          <div class="flex items-center gap-2 justify-end">
            <button
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              :disabled="page <= 1"
              @click="page = Math.max(1, page - 1)"
            >
              {{ t('admin.common.previous') }}
            </button>
            <div class="px-2">
              {{ t('admin.pages.delivery.pricing.pageOf', { page, pages: totalPages }) }}
            </div>
            <button
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              :disabled="page >= totalPages"
              @click="page = Math.min(totalPages, page + 1)"
            >
              {{ t('admin.common.next') }}
            </button>
          </div>
        </div>
      </div>
        
      <div
        v-if="loadingRates"
        class="p-12 text-center"
      >
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        <p class="mt-2 text-slate-500">
          {{ t('admin.pages.delivery.pricing.loading') }}
        </p>
      </div>

      <div
        v-else
        class="p-0"
      >
        <div class="max-h-[70vh] overflow-auto">
          <table class="ui-table">
            <thead class="ui-thead sticky top-0 z-10">
              <tr>
                <th
                  scope="col"
                  class="ui-th w-24 bg-white"
                  rowspan="2"
                >
                  {{ t('admin.pages.delivery.pricing.table.code') }}
                </th>
                <th
                  scope="col"
                  class="ui-th bg-white"
                  rowspan="2"
                >
                  {{ t('admin.pages.delivery.pricing.table.wilaya') }}
                </th>
                <th
                  scope="col"
                  class="ui-th bg-white text-center"
                  colspan="2"
                >
                  {{ t('admin.pages.delivery.pricing.modes.home') }}
                </th>
                <th
                  scope="col"
                  class="ui-th bg-white text-center"
                  colspan="2"
                >
                  {{ t('admin.pages.delivery.pricing.modes.office') }}
                </th>
              </tr>
              <tr>
                <th
                  scope="col"
                  class="ui-th w-40 bg-white"
                >
                  {{ t('admin.pages.delivery.pricing.table.carrierPrice') }}
                </th>
                <th
                  scope="col"
                  class="ui-th w-56 bg-white"
                >
                  {{ t('admin.pages.delivery.pricing.table.overridePrice') }}
                </th>
                <th
                  scope="col"
                  class="ui-th w-40 bg-white"
                >
                  {{ t('admin.pages.delivery.pricing.table.carrierPrice') }}
                </th>
                <th
                  scope="col"
                  class="ui-th w-56 bg-white"
                >
                  {{ t('admin.pages.delivery.pricing.table.overridePrice') }}
                </th>
              </tr>
            </thead>
            <tbody class="ui-tbody">
              <tr
                v-for="wilaya in pagedWilayas"
                :key="wilaya.code"
                class="ui-tr"
              >
                <td class="ui-td whitespace-nowrap text-sm text-slate-600 font-mono">
                  {{ wilaya.code }}
                </td>
                <td class="ui-td whitespace-nowrap text-sm font-medium text-slate-900">
                  {{ wilaya.name }}
                </td>
                <td class="ui-td whitespace-nowrap text-sm text-slate-600">
                  <div
                    v-if="carrierRates.home[wilaya.code] != null"
                    class="font-medium text-slate-900"
                  >
                    {{ Number(carrierRates.home[wilaya.code]).toFixed(0) }} DZD
                  </div>
                  <div
                    v-else
                    class="text-slate-400"
                  >
                    —
                  </div>
                </td>
                <td class="ui-td whitespace-nowrap text-sm text-slate-600">
                  <div class="relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span class="text-slate-500 sm:text-sm">DZD</span>
                    </div>
                    <input 
                      v-model="modelRates.home[wilaya.code]" 
                      type="number" 
                      class="focus:ring-teal-500 focus:border-teal-500 block w-full pl-12 sm:text-sm border-slate-300 rounded-md" 
                      :placeholder="t('admin.pages.delivery.pricing.overridePlaceholder')"
                    >
                  </div>
                </td>
                <td class="ui-td whitespace-nowrap text-sm text-slate-600">
                  <div
                    v-if="carrierRates.office[wilaya.code] != null"
                    class="font-medium text-slate-900"
                  >
                    {{ Number(carrierRates.office[wilaya.code]).toFixed(0) }} DZD
                  </div>
                  <div
                    v-else
                    class="text-slate-400"
                  >
                    —
                  </div>
                </td>
                <td class="ui-td whitespace-nowrap text-sm text-slate-600">
                  <div class="relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span class="text-slate-500 sm:text-sm">DZD</span>
                    </div>
                    <input 
                      v-model="modelRates.office[wilaya.code]" 
                      type="number" 
                      class="focus:ring-teal-500 focus:border-teal-500 block w-full pl-12 sm:text-sm border-slate-300 rounded-md" 
                      :placeholder="t('admin.pages.delivery.pricing.overridePlaceholder')"
                    >
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.delivery.metaTitle'
})

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

type ProviderCredentialField = {
  key: string
  label: string
  required: boolean
  secret: boolean
}

type DeliveryProviderAdminView = {
  provider: string
  name: string
  supports: {
    quote: boolean
    createShipment: boolean
    track: boolean
    webhooks: boolean
  }
  credentialFields: ProviderCredentialField[]
  offered: boolean
  account: null | {
    isActive: boolean
    updatedAt: string
    config: Record<string, unknown>
    secrets: Record<string, boolean>
  }
}

const providers = ref<DeliveryProviderAdminView[]>([])
const selectedProvider = ref<DeliveryProviderAdminView | null>(null)
const loadingRates = ref(false)
const saving = ref(false)
const savingAccount = ref(false)
const modelRates = reactive<{ home: Record<string, string>; office: Record<string, string> }>({ home: {}, office: {} })
const existingOverrideRates = reactive<{ home: Record<string, boolean>; office: Record<string, boolean> }>({ home: {}, office: {} })
const carrierRates = reactive<{ home: Record<string, number | null>; office: Record<string, number | null> }>({ home: {}, office: {} })
const loadingCarrierRates = ref(false)
const wilayaQuery = ref('')
const wilayaFilter = ref<'all' | 'overrides' | 'no-overrides' | 'missing-carrier'>('all')
const page = ref(1)
const pageSize = ref(15)

const accountIsActive = ref(false)
const accountConfigDraft = ref<Record<string, string>>({})
const clearSecrets = ref<Record<string, boolean>>({})
const accountMessage = ref<string | null>(null)
const accountMessageKind = ref<'success' | 'error'>('success')

// Static list of Wilayas
const wilayas = [
  { code: '01', name: 'Adrar' }, { code: '02', name: 'Chlef' }, { code: '03', name: 'Laghouat' }, { code: '04', name: 'Oum El Bouaghi' },
  { code: '05', name: 'Batna' }, { code: '06', name: 'Béjaïa' }, { code: '07', name: 'Biskra' }, { code: '08', name: 'Béchar' },
  { code: '09', name: 'Blida' }, { code: '10', name: 'Bouira' }, { code: '11', name: 'Tamanrasset' }, { code: '12', name: 'Tébessa' },
  { code: '13', name: 'Tlemcen' }, { code: '14', name: 'Tiaret' }, { code: '15', name: 'Tizi Ouzou' }, { code: '16', name: 'Alger' },
  { code: '17', name: 'Djelfa' }, { code: '18', name: 'Jijel' }, { code: '19', name: 'Sétif' }, { code: '20', name: 'Saïda' },
  { code: '21', name: 'Skikda' }, { code: '22', name: 'Sidi Bel Abbès' }, { code: '23', name: 'Annaba' }, { code: '24', name: 'Guelma' },
  { code: '25', name: 'Constantine' }, { code: '26', name: 'Médéa' }, { code: '27', name: 'Mostaganem' }, { code: '28', name: 'M\'Sila' },
  { code: '29', name: 'Mascara' }, { code: '30', name: 'Ouargla' }, { code: '31', name: 'Oran' }, { code: '32', name: 'El Bayadh' },
  { code: '33', name: 'Illizi' }, { code: '34', name: 'Bordj Bou Arréridj' }, { code: '35', name: 'Boumerdès' }, { code: '36', name: 'El Tarf' },
  { code: '37', name: 'Tindouf' }, { code: '38', name: 'Tissemsilt' }, { code: '39', name: 'El Oued' }, { code: '40', name: 'Khenchela' },
  { code: '41', name: 'Souk Ahras' }, { code: '42', name: 'Tipaza' }, { code: '43', name: 'Mila' }, { code: '44', name: 'Aïn Defla' },
  { code: '45', name: 'Naâma' }, { code: '46', name: 'Aïn Témouchent' }, { code: '47', name: 'Ghardaïa' }, { code: '48', name: 'Relizane' },
  { code: '49', name: 'Timimoun' }, { code: '50', name: 'Bordj Badji Mokhtar' }, { code: '51', name: 'Ouled Djellal' }, { code: '52', name: 'Béni Abbès' },
  { code: '53', name: 'In Salah' }, { code: '54', name: 'In Guezzam' }, { code: '55', name: 'Touggourt' }, { code: '56', name: 'Djanet' },
  { code: '57', name: 'El M\'Ghair' }, { code: '58', name: 'El Meniaa' }
]

onMounted(async () => {
  await loadProviders()
})

watch([wilayaQuery, wilayaFilter], () => {
  page.value = 1
})

const carrierRatesFetched = computed(() => Object.keys(carrierRates.home).length > 0 || Object.keys(carrierRates.office).length > 0)

const filteredWilayas = computed(() => {
  const q = wilayaQuery.value.trim().toLowerCase()
  const filter = wilayaFilter.value

  return wilayas.filter((w) => {
    if (q) {
      const hay = `${w.code} ${w.name}`.toLowerCase()
      if (!hay.includes(q)) return false
    }

    const draftHome = (modelRates.home[w.code] || '').trim().length > 0
    const draftOffice = (modelRates.office[w.code] || '').trim().length > 0
    const hasOverride =
      draftHome ||
      draftOffice ||
      !!existingOverrideRates.home[w.code] ||
      !!existingOverrideRates.office[w.code]

    if (filter === 'overrides') return hasOverride
    if (filter === 'no-overrides') return !hasOverride
    if (filter === 'missing-carrier') {
      if (!carrierRatesFetched.value) return false
      return carrierRates.home[w.code] == null || carrierRates.office[w.code] == null
    }
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredWilayas.value.length / pageSize.value)))

watch(totalPages, (tp) => {
  if (page.value > tp) page.value = tp
})

const pagedWilayas = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredWilayas.value.slice(start, start + pageSize.value)
})

const updateProviderInState = (updated: DeliveryProviderAdminView) => {
  const idx = providers.value.findIndex((p) => p.provider === updated.provider)
  if (idx !== -1) providers.value[idx] = updated
  if (selectedProvider.value?.provider === updated.provider) {
    selectedProvider.value = updated
    initAccountDraft(updated)
  }
}

async function loadProviders() {
  try {
    const list = await $fetch<DeliveryProviderAdminView[]>('/api/admin/delivery/providers', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    providers.value = list
  } catch (e) {
    console.error('Failed to load delivery providers', e)
  }
}

async function toggleProvider(provider: DeliveryProviderAdminView, event: Event) {
  event.stopPropagation() // Prevent card click
  // Optimistic update
  provider.offered = !provider.offered

  try {
    const updated = await $fetch<DeliveryProviderAdminView>(
      `/api/admin/delivery/providers/${provider.provider}/account`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authStore.token}` },
        body: { offered: provider.offered }
      }
    )
    updateProviderInState(updated)
    if (updated.offered) {
      await selectProvider(updated)
    }
  } catch (e) {
    // Revert on error
    provider.offered = !provider.offered
    console.error('Failed to update provider status', e)
    alert(t('admin.pages.delivery.errors.updateProviderFailed'))
  }
}

const initAccountDraft = (provider: DeliveryProviderAdminView) => {
  accountMessage.value = null
  accountIsActive.value = provider.account?.isActive ?? false
  accountConfigDraft.value = {}
  clearSecrets.value = {}

  provider.credentialFields.forEach((f) => {
    if (f.secret) {
      accountConfigDraft.value[f.key] = ''
      return
    }

    const rawValue = provider.account?.config?.[f.key]
    accountConfigDraft.value[f.key] = typeof rawValue === 'string' ? rawValue : rawValue == null ? '' : String(rawValue)
  })
}

const credentialPlaceholder = (provider: DeliveryProviderAdminView, field: ProviderCredentialField): string => {
  if (!field.secret) return ''
  return provider.account?.secrets?.[field.key]
    ? t('admin.pages.delivery.credentials.secretPlaceholderSet')
    : t('admin.pages.delivery.credentials.secretPlaceholderNotSet')
}

const clearSecret = (key: string) => {
  clearSecrets.value[key] = true
  accountConfigDraft.value[key] = ''
}

async function saveProviderAccount() {
  if (!selectedProvider.value) return
  savingAccount.value = true
  accountMessage.value = null

  const provider = selectedProvider.value
  const configPatch: Record<string, string> = {}

  for (const field of provider.credentialFields) {
    const value = accountConfigDraft.value[field.key]

    if (field.secret) {
      if (clearSecrets.value[field.key]) {
        configPatch[field.key] = ''
      } else if (typeof value === 'string' && value.trim().length > 0) {
        configPatch[field.key] = value.trim()
      }
      continue
    }

    configPatch[field.key] = typeof value === 'string' ? value.trim() : ''
  }

  try {
    const updated = await $fetch<DeliveryProviderAdminView>(`/api/admin/delivery/providers/${provider.provider}/account`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        offered: provider.offered,
        isActive: accountIsActive.value,
        ...(Object.keys(configPatch).length > 0 ? { config: configPatch } : {})
      }
    })
    accountMessageKind.value = 'success'
    accountMessage.value = t('admin.common.saved')
    updateProviderInState(updated)
  } catch (e: any) {
    console.error('Failed to save delivery provider credentials', e)
    accountMessageKind.value = 'error'
    accountMessage.value = e?.data?.statusMessage || t('admin.pages.delivery.credentials.errors.saveFailed')
  } finally {
    savingAccount.value = false
  }
}

async function selectProvider(provider: DeliveryProviderAdminView) {
    selectedProvider.value = provider
    initAccountDraft(provider)
    for (const w of wilayas) {
      delete carrierRates.home[w.code]
      delete carrierRates.office[w.code]
    }
    await fetchRates(provider.provider)
}

async function fetchRates(providerKey: string) {
    loadingRates.value = true
    for (const w of wilayas) {
      existingOverrideRates.home[w.code] = false
      existingOverrideRates.office[w.code] = false
      modelRates.home[w.code] = ''
      modelRates.office[w.code] = ''
    }
    
    try {
        const rates = await $fetch<any[]>(`/api/rates/${providerKey}`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        
        // Map backend rates to model (active per-mode overrides)
        rates.forEach((r: any) => {
            if (!r?.wilayaCode) return
            if (r.isActive === false) return
            const rateServiceLevel =
              typeof r.serviceLevel === 'string' && r.serviceLevel.trim().length > 0 ? r.serviceLevel.trim() : null
            if (rateServiceLevel !== 'home' && rateServiceLevel !== 'office') return

            modelRates[rateServiceLevel][r.wilayaCode] = String(Number(r.price))
            existingOverrideRates[rateServiceLevel][r.wilayaCode] = true
        })
    } catch (e) {
        console.error('Failed to load rates', e)
    } finally {
        loadingRates.value = false
    }
}

const canFetchCarrierRates = computed(() => {
  const provider = selectedProvider.value
  if (!provider) return false
  if (!provider.supports.quote) return false
  if (!provider.account?.isActive) return false
  const requiredSecretKeys = provider.credentialFields
    .filter((f) => f.required && f.secret)
    .map((f) => f.key)
  return requiredSecretKeys.every((key) => provider.account?.secrets?.[key])
})

async function fetchCarrierRates() {
  if (!selectedProvider.value) return
  if (!canFetchCarrierRates.value) return

  loadingCarrierRates.value = true
  try {
    const [homeRates, officeRates] = await Promise.all([
      $fetch<Array<{ wilayaCode: string; carrierPrice: number | null }>>(
        `/api/admin/delivery/providers/${selectedProvider.value.provider}/live-rates?deliveryMode=home`,
        { headers: { Authorization: `Bearer ${authStore.token}` } }
      ),
      $fetch<Array<{ wilayaCode: string; carrierPrice: number | null }>>(
        `/api/admin/delivery/providers/${selectedProvider.value.provider}/live-rates?deliveryMode=office`,
        { headers: { Authorization: `Bearer ${authStore.token}` } }
      )
    ])

    homeRates.forEach((r) => {
      if (!r?.wilayaCode) return
      carrierRates.home[r.wilayaCode] = r.carrierPrice == null ? null : Number(r.carrierPrice)
    })
    officeRates.forEach((r) => {
      if (!r?.wilayaCode) return
      carrierRates.office[r.wilayaCode] = r.carrierPrice == null ? null : Number(r.carrierPrice)
    })
  } catch (e) {
    console.error('Failed to fetch carrier rates', e)
    alert(t('admin.pages.delivery.errors.fetchCarrierRatesFailed'))
  } finally {
    loadingCarrierRates.value = false
  }
}

async function saveRates() {
    if (!selectedProvider.value) return
    saving.value = true
    
    const payload = {
        rates: wilayas.flatMap((wilaya) => {
          const out: any[] = []
          for (const mode of ['home', 'office'] as const) {
            const raw = modelRates[mode][wilaya.code]
            const trimmed = typeof raw === 'string' ? raw.trim() : ''

            if (trimmed.length === 0) {
              if (!existingOverrideRates[mode][wilaya.code]) continue
              out.push({
                wilayaCode: wilaya.code,
                price: 0,
                communeCode: '',
                serviceLevel: mode,
                isActive: false
              })
              continue
            }

            const price = Number(trimmed)
            if (!Number.isFinite(price)) continue

            out.push({
              wilayaCode: wilaya.code,
              price,
              communeCode: '',
              serviceLevel: mode,
              isActive: true
            })
          }
          return out
        })
    }

    try {
        await $fetch(`/api/rates/${selectedProvider.value.provider}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: payload
        })
        await fetchRates(selectedProvider.value.provider)
        // Show success notification (optional, maybe simple alert for now)
    } catch (e) {
        console.error('Failed to save rates', e)
        alert(t('admin.pages.delivery.errors.saveFailed'))
    } finally {
        saving.value = false
    }
}
</script>
