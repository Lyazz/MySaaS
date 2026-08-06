<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold" style="color: var(--text-primary)">
          {{ t('admin.pages.delivery.title') }}
        </h2>
        <p class="mt-1" style="color: var(--text-secondary)">
          {{ t('admin.pages.delivery.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Store Pickup Toggle -->
    <div class="ui-card mb-8">
      <div class="ui-card-header flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.delivery.storePickup.title', 'Store pickup') }}
          </h3>
          <p class="text-sm" style="color: var(--text-secondary)">
            {{ t('admin.pages.delivery.storePickup.hint', 'Enable/disable “pickup at store” as a checkout delivery option.') }}
          </p>
        </div>
        <button
          type="button"
          class="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:[--tw-ring-color:var(--brand)] disabled:opacity-60"
          :class="[storePickupEnabled ? 'bg-green-500' : 'bg-white/10']"
          role="switch"
          :aria-checked="storePickupEnabled"
          :disabled="storePickupSaving"
          @click="toggleStorePickup"
        >
          <span class="sr-only">{{ t('admin.pages.delivery.storePickup.toggleLabel', 'Toggle store pickup') }}</span>
          <span
            aria-hidden="true"
            class="pointer-events-none inline-block h-5 w-5 rounded-full shadow transform ring-0 transition ease-in-out duration-200" style="background: var(--surface-1)"
            :class="[storePickupEnabled ? 'translate-x-5' : 'translate-x-0']"
          />
        </button>
      </div>
      <div v-if="storePickupMessage" class="ui-card-body pt-0">
        <p class="text-sm" :class="storePickupMessageKind === 'error' ? 'text-red-600' : 'text-emerald-700'">
          {{ storePickupMessage }}
        </p>
      </div>
    </div>

    <!-- Providers List -->
    <div data-tour="delivery-providers" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div 
        v-for="provider in providers" 
        :key="provider.provider"
        class="rounded-lg transition-shadow cursor-pointer overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)"
        :class="{'ring-2 [--tw-ring-color:var(--brand)]': selectedProvider?.provider === provider.provider}"
        @click="selectProvider(provider)"
      >
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold" style="background: var(--surface-3); color: var(--text-secondary)">
                {{ provider.provider[0] }}
              </div>
              <div>
                <h3 class="font-bold" style="color: var(--text-primary)">
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
                class="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:[--tw-ring-color:var(--brand)]"
                :class="[provider.offered ? 'bg-green-500' : 'bg-white/10']"
                role="switch" 
                :aria-checked="provider.offered"
                @click="toggleProvider(provider, $event)"
              >
                <span class="sr-only">{{ t('admin.pages.delivery.providers.toggleLabel') }}</span>
                <span 
                  aria-hidden="true" 
                  class="pointer-events-none inline-block h-5 w-5 rounded-full shadow transform ring-0 transition ease-in-out duration-200" style="background: var(--surface-1)"
                  :class="[provider.offered ? 'translate-x-5' : 'translate-x-0']"
                />
              </button>
            </div>
          </div>

          <div class="flex justify-between items-center text-sm">
            <span style="color: var(--text-tertiary)">{{ t('admin.pages.delivery.providers.wilayasSupported', { count: 58 }) }}</span>
            <span class="[color:var(--brand)] font-medium">{{ t('admin.pages.delivery.providers.managePricing') }} &rarr;</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Provider Credentials -->
    <div
      v-if="selectedProvider"
      data-tour="delivery-config"
      class="ui-card mb-8"
    >
      <div class="ui-card-header flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.delivery.credentials.title', { provider: selectedProvider.name }) }}
          </h3>
          <p class="text-sm" style="color: var(--text-secondary)">
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
            class="text-sm" style="color: var(--text-secondary)"
          >
            {{ t('admin.pages.delivery.credentials.noCredentials') }}
          </div>

          <div
            v-else
            class="flex flex-col gap-4"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-medium" style="color: var(--text-primary)">
                  {{ t('admin.pages.delivery.credentials.enableLabel') }}
                </div>
                <div class="text-xs" style="color: var(--text-muted)">
                  {{ t('admin.pages.delivery.credentials.enableHint') }}
                </div>
              </div>
              <button
                type="button"
                class="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:[--tw-ring-color:var(--brand)]"
                :class="[accountIsActive ? 'bg-green-500' : 'bg-white/10']"
                role="switch"
                :aria-checked="accountIsActive"
                @click="accountIsActive = !accountIsActive"
              >
                <span class="sr-only">{{ t('admin.pages.delivery.credentials.enableLabel') }}</span>
                <span
                  aria-hidden="true"
                  class="pointer-events-none inline-block h-5 w-5 rounded-full shadow transform ring-0 transition ease-in-out duration-200" style="background: var(--surface-1)"
                  :class="[accountIsActive ? 'translate-x-5' : 'translate-x-0']"
                />
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="field in selectedProvider.credentialFields"
                :key="field.key"
              >
                <label class="ui-label block">
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
                    class="ui-input w-full px-3 py-2 text-sm"
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
                  class="mt-1 text-xs" style="color: var(--text-muted)"
                >
                  {{
                    selectedProvider.account?.secrets?.[field.key]
                      ? t('admin.pages.delivery.credentials.secretSet')
                      : t('admin.pages.delivery.credentials.secretNotSet')
                  }}
                </p>
              </div>
            </div>

            <div
              v-if="selectedProvider.provider === 'YALIDINE'"
              class="rounded-xl p-4 space-y-4"
              style="background: var(--surface-2); border: 1px solid var(--surface-border)"
            >
              <div>
                <h4 class="text-sm font-semibold" style="color: var(--text-primary)">
                  Yalidine webhook setup
                </h4>
                <p class="mt-1 text-sm" style="color: var(--text-secondary)">
                  Use this URL in the Yalidine Webhooks Dashboard so order delivery statuses update automatically in your store.
                </p>
              </div>

              <div>
                <label class="ui-label block mb-1">Webhook URL to give Yalidine</label>
                <div class="flex flex-col md:flex-row gap-2">
                  <input
                    class="ui-input flex-1 px-3 py-2 text-sm font-mono"
                    readonly
                    :value="yalidineWebhookUrl"
                  >
                  <button
                    type="button"
                    class="ui-btn ui-btn--secondary ui-btn--sm"
                    @click="copyYalidineWebhookUrl"
                  >
                    Copy URL
                  </button>
                </div>
                <p class="mt-1 text-xs" style="color: var(--text-muted)">
                  This must be a public HTTPS tenant domain. If your store uses a custom domain, replace the domain before adding it to Yalidine.
                </p>
                <p
                  v-if="isLocalWebhookOrigin"
                  class="mt-1 text-xs text-amber-600"
                >
                  Localhost cannot receive Yalidine webhooks, so this page shows your production tenant URL instead.
                </p>
                <p
                  v-if="yalidineWebhookCopyMessage"
                  class="mt-1 text-xs text-emerald-600"
                >
                  {{ yalidineWebhookCopyMessage }}
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div class="font-medium mb-2" style="color: var(--text-primary)">
                    In Yalidine dashboard
                  </div>
                  <ol class="list-decimal list-inside space-y-1" style="color: var(--text-secondary)">
                    <li>Open Webhooks Dashboard.</li>
                    <li>Add a webhook and paste the URL above.</li>
                    <li>Set the same secret in Yalidine and in the Webhook Secret field here.</li>
                    <li>Test the webhook, then activate it.</li>
                  </ol>
                </div>
                <div>
                  <div class="font-medium mb-2" style="color: var(--text-primary)">
                    Select these events
                  </div>
                  <ul class="space-y-1 font-mono text-xs" style="color: var(--text-secondary)">
                    <li>parcel_created</li>
                    <li>parcel_edited</li>
                    <li>parcel_deleted</li>
                    <li>parcel_status_updated</li>
                    <li>parcel_payment_updated</li>
                  </ul>
                </div>
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
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.delivery.pricing.title', { provider: selectedProvider.name }) }}
          </h3>
          <p class="text-sm" style="color: var(--text-secondary)">
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
        <!-- Maystro: test exact commune price -->
        <div
          v-if="selectedProvider?.provider === 'MAYSTRO'"
          class="rounded-lg p-4" style="background: var(--surface-2); border: 1px solid var(--surface-border)"
        >
          <div class="flex flex-col md:flex-row md:items-end gap-3">
            <div class="flex-1">
              <label class="ui-label text-xs mb-1 block">Wilaya</label>
              <select
                v-model="maystroTest.wilayaCode"
                class="ui-input w-full px-3 py-2 text-sm"
              >
                <option v-for="w in wilayas" :key="w.code" :value="w.code">{{ w.code }} - {{ w.name }}</option>
              </select>
            </div>
            <div class="flex-1">
              <label class="ui-label text-xs mb-1 block">Commune (Maystro)</label>
              <select
                v-model="maystroTest.communeId"
                class="ui-input w-full px-3 py-2 text-sm"
                :disabled="maystroTest.loadingCommunes || maystroTest.communes.length === 0"
              >
                <option value="" disabled>
                  {{ maystroTest.loadingCommunes ? 'Loading communes...' : maystroTest.communes.length ? 'Select commune' : 'No communes' }}
                </option>
                <option
                  v-for="c in maystroTest.communes"
                  :key="c.id"
                  :value="String(c.id)"
                >
                  {{ c.id }} - {{ c.name }}
                </option>
              </select>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                class="ui-btn ui-btn--secondary ui-btn--md"
                :disabled="maystroTest.loadingPrices || !maystroTest.communeId"
                @click="fetchMaystroCommunePrices"
              >
                {{ maystroTest.loadingPrices ? 'Fetching…' : 'Test prix commune' }}
              </button>
            </div>
          </div>

          <div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div class="rounded-md px-3 py-2" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
              <div style="color: var(--text-tertiary)">Home (delivery_type=1)</div>
              <div class="font-semibold" style="color: var(--text-primary)">
                {{ maystroTest.priceHome == null ? '—' : `${maystroTest.priceHome} DZD` }}
              </div>
            </div>
            <div class="rounded-md px-3 py-2" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
              <div style="color: var(--text-tertiary)">Office (delivery_type=2)</div>
              <div class="font-semibold" style="color: var(--text-primary)">
                {{ maystroTest.priceOffice == null ? '—' : `${maystroTest.priceOffice} DZD` }}
              </div>
            </div>
            <div
              v-if="maystroTest.error"
              class="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-rose-800"
            >
              {{ maystroTest.error }}
            </div>
          </div>

          <p class="mt-2 text-xs" style="color: var(--text-muted)">
            Note: les “tarifs transporteur” du tableau sont calculés par wilaya (commune échantillon). Pour un prix exact, tester une commune ici.
          </p>
        </div>

        <div class="flex flex-col md:flex-row md:items-center gap-3">
          <div class="flex-1">
            <input
              v-model="wilayaQuery"
              type="text"
              class="ui-input w-full px-3 py-2 text-sm"
              :placeholder="t('admin.pages.delivery.pricing.searchPlaceholder')"
            >
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              :class="wilayaFilter === 'all' ? 'ring-2 [--tw-ring-color:var(--brand)]' : ''"
              @click="wilayaFilter = 'all'"
            >
              {{ t('admin.pages.delivery.pricing.filters.all') }}
            </button>
            <button
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              :class="wilayaFilter === 'overrides' ? 'ring-2 [--tw-ring-color:var(--brand)]' : ''"
              @click="wilayaFilter = 'overrides'"
            >
              {{ t('admin.pages.delivery.pricing.filters.overrides') }}
            </button>
            <button
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              :class="wilayaFilter === 'no-overrides' ? 'ring-2 [--tw-ring-color:var(--brand)]' : ''"
              @click="wilayaFilter = 'no-overrides'"
            >
              {{ t('admin.pages.delivery.pricing.filters.noOverrides') }}
            </button>
            <button
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              :disabled="!carrierRatesFetched"
              :class="wilayaFilter === 'missing-carrier' ? 'ring-2 [--tw-ring-color:var(--brand)]' : ''"
              @click="wilayaFilter = 'missing-carrier'"
            >
              {{ t('admin.pages.delivery.pricing.filters.missingCarrier') }}
            </button>
          </div>
        </div>

        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm" style="color: var(--text-secondary)">
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
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 [border-color:var(--brand)]" />
        <p class="mt-2" style="color: var(--text-tertiary)">
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
                  class="ui-th w-24"
                  rowspan="2"
                >
                  {{ t('admin.pages.delivery.pricing.table.code') }}
                </th>
                <th
                  scope="col"
                  class="ui-th"
                  rowspan="2"
                >
                  {{ t('admin.pages.delivery.pricing.table.wilaya') }}
                </th>
                <th
                  scope="col"
                  class="ui-th text-center"
                  colspan="2"
                >
                  {{ t('admin.pages.delivery.pricing.modes.home') }}
                </th>
                <th
                  scope="col"
                  class="ui-th text-center"
                  colspan="2"
                >
                  {{ t('admin.pages.delivery.pricing.modes.office') }}
                </th>
              </tr>
              <tr>
                <th
                  scope="col"
                  class="ui-th w-40"
                >
                  {{ t('admin.pages.delivery.pricing.table.carrierPrice') }}
                </th>
                <th
                  scope="col"
                  class="ui-th w-56"
                >
                  {{ t('admin.pages.delivery.pricing.table.overridePrice') }}
                </th>
                <th
                  scope="col"
                  class="ui-th w-40"
                >
                  {{ t('admin.pages.delivery.pricing.table.carrierPrice') }}
                </th>
                <th
                  scope="col"
                  class="ui-th w-56"
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
                <td class="ui-td whitespace-nowrap text-sm font-mono" style="color: var(--text-secondary)">
                  {{ wilaya.code }}
                </td>
                <td class="ui-td whitespace-nowrap text-sm font-medium" style="color: var(--text-primary)">
                  {{ wilaya.name }}
                </td>
                <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                  <div
                    v-if="carrierRates.home[wilaya.code] != null"
                    class="font-medium" style="color: var(--text-primary)"
                  >
                    {{ Number(carrierRates.home[wilaya.code]).toFixed(0) }} DZD
                  </div>
                  <div
                    v-else
                    style="color: var(--text-muted)"
                  >
                    —
                  </div>
                </td>
                <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                  <div class="relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                      <span class="sm:text-sm" style="color: var(--text-muted)">DZD</span>
                    </div>
                    <input 
                      v-model="modelRates.home[wilaya.code]" 
                      type="number" 
                      class="ui-input block w-full ps-12 sm:text-sm"
                      :placeholder="t('admin.pages.delivery.pricing.overridePlaceholder')"
                    >
                  </div>
                </td>
                <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                  <div
                    v-if="carrierRates.office[wilaya.code] != null"
                    class="font-medium" style="color: var(--text-primary)"
                  >
                    {{ Number(carrierRates.office[wilaya.code]).toFixed(0) }} DZD
                  </div>
                  <div
                    v-else
                    style="color: var(--text-muted)"
                  >
                    —
                  </div>
                </td>
                <td class="ui-td whitespace-nowrap text-sm" style="color: var(--text-secondary)">
                  <div class="relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                      <span class="sm:text-sm" style="color: var(--text-muted)">DZD</span>
                    </div>
                    <input 
                      v-model="modelRates.office[wilaya.code]" 
                      type="number" 
                      class="ui-input block w-full ps-12 sm:text-sm"
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
const clientOrigin = ref('')
const yalidineWebhookCopyMessage = ref('')
const platformBaseDomain = usePlatformBaseDomain()
const isLocalWebhookOrigin = computed(() => {
  if (!clientOrigin.value) return false
  try {
    const hostname = new URL(clientOrigin.value).hostname.toLowerCase()
    return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
})
const yalidineWebhookUrl = computed(() => {
  const tenantSlug = authStore.user?.tenant?.slug
  if (isLocalWebhookOrigin.value && tenantSlug) {
    return `https://${tenantSlug}.${platformBaseDomain}/api/webhooks/yalidine`
  }

  const origin = clientOrigin.value || (typeof window !== 'undefined' ? window.location.origin : '')
  return origin ? `${origin}/api/webhooks/yalidine` : '/api/webhooks/yalidine'
})

const storePickupEnabled = ref(false)
const storePickupSaving = ref(false)
const storePickupMessage = ref<string | null>(null)
const storePickupMessageKind = ref<'success' | 'error'>('success')

const maystroTest = reactive<{
  wilayaCode: string
  communes: Array<{ id: number; name: string }>
  communeId: string
  loadingCommunes: boolean
  loadingPrices: boolean
  priceHome: number | null
  priceOffice: number | null
  error: string
}>({
  wilayaCode: '16',
  communes: [],
  communeId: '',
  loadingCommunes: false,
  loadingPrices: false,
  priceHome: null,
  priceOffice: null,
  error: ''
})

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

const { autoStartIfNeeded } = useTour()
onMounted(async () => {
  clientOrigin.value = window.location.origin
  await loadStorePickupSetting()
  await loadProviders()
  autoStartIfNeeded('delivery')
})

watch(
  () => selectedProvider.value?.provider,
  async (provider) => {
    if (provider !== 'MAYSTRO') return
    await loadMaystroCommunes()
  }
)

watch(
  () => maystroTest.wilayaCode,
  async () => {
    if (selectedProvider.value?.provider !== 'MAYSTRO') return
    await loadMaystroCommunes()
  }
)

async function loadMaystroCommunes() {
  maystroTest.loadingCommunes = true
  maystroTest.error = ''
  maystroTest.priceHome = null
  maystroTest.priceOffice = null
  maystroTest.communes = []
  maystroTest.communeId = ''

  try {
    const data = await $fetch<Array<{ id: number; name: string }>>(
      `/api/delivery/maystro/communes?wilaya=${encodeURIComponent(maystroTest.wilayaCode)}`,
      { headers: { Authorization: `Bearer ${authStore.token}` } }
    )
    maystroTest.communes = Array.isArray(data) ? data : []
    const first = maystroTest.communes[0]
    if (first?.id != null) maystroTest.communeId = String(first.id)
  } catch (e: any) {
    maystroTest.error = e?.data?.statusMessage || 'Failed to load communes (check Maystro credentials)'
  } finally {
    maystroTest.loadingCommunes = false
  }
}

async function fetchMaystroCommunePrices() {
  if (!maystroTest.communeId) return
  maystroTest.loadingPrices = true
  maystroTest.error = ''

  const commune = maystroTest.communeId

  const parsePrice = (value: any): number | null => {
    const raw = value?.delivery_price ?? value?.deliveryPrice ?? value?.price
    const n = typeof raw === 'number' ? raw : Number(raw)
    return Number.isFinite(n) ? n : null
  }

  try {
    const [home, office] = await Promise.all([
      $fetch<any>(
        `/api/delivery/maystro/delivery-prices?commune=${encodeURIComponent(commune)}&deliveryType=1`,
        { headers: { Authorization: `Bearer ${authStore.token}` } }
      ),
      $fetch<any>(
        `/api/delivery/maystro/delivery-prices?commune=${encodeURIComponent(commune)}&deliveryType=2`,
        { headers: { Authorization: `Bearer ${authStore.token}` } }
      )
    ])

    maystroTest.priceHome = parsePrice(home)
    maystroTest.priceOffice = parsePrice(office)
  } catch (e: any) {
    maystroTest.error = e?.data?.statusMessage || 'Failed to fetch Maystro delivery prices'
  } finally {
    maystroTest.loadingPrices = false
  }
}

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

async function loadStorePickupSetting() {
  storePickupMessage.value = null
  try {
    const settings = await $fetch<any>('/api/admin/store-settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    storePickupEnabled.value = settings?.storePickupEnabled === true
  } catch (e) {
    console.error('Failed to load store pickup setting', e)
  }
}

async function toggleStorePickup() {
  if (storePickupSaving.value) return
  storePickupSaving.value = true
  storePickupMessage.value = null
  const next = !storePickupEnabled.value

  try {
    const updated = await $fetch<any>('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { storePickupEnabled: next }
    })
    storePickupEnabled.value = updated?.storePickupEnabled === true
    storePickupMessageKind.value = 'success'
    storePickupMessage.value = t('admin.common.saved', 'Saved')
  } catch (e: any) {
    console.error('Failed to update store pickup setting', e)
    storePickupMessageKind.value = 'error'
    storePickupMessage.value = e?.data?.statusMessage || t('common.error', 'An error occurred. Please try again.')
  } finally {
    storePickupSaving.value = false
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

async function copyYalidineWebhookUrl() {
  yalidineWebhookCopyMessage.value = ''
  try {
    await navigator.clipboard.writeText(yalidineWebhookUrl.value)
    yalidineWebhookCopyMessage.value = 'Webhook URL copied.'
  } catch {
    yalidineWebhookCopyMessage.value = 'Select and copy the webhook URL manually.'
  }
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
