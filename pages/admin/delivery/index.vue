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
        :key="provider.key"
        class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
        :class="{'ring-2 ring-teal-500': selectedProvider?.key === provider.key}"
        @click="selectProvider(provider)"
      >
        <div class="p-6">
            <div class="flex justify-between items-start mb-4">
                 <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center text-xl font-bold text-gray-600">
                        {{ provider.key[0] }}
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-900">{{ provider.name }}</h3>
                        <p class="text-xs text-gray-500">{{ provider.description }}</p>
                    </div>
                 </div>
                 <div @click.stop>
                     <button 
                        type="button" 
                        class="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                        :class="[provider.enabled ? 'bg-green-500' : 'bg-gray-200']"
                        role="switch" 
	                        :aria-checked="provider.enabled"
	                        @click="toggleProvider(provider, $event)"
	                    >
	                        <span class="sr-only">{{ t('admin.pages.delivery.providers.toggleLabel') }}</span>
	                        <span 
	                            aria-hidden="true" 
	                            class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"
                            :class="[provider.enabled ? 'translate-x-5' : 'translate-x-0']"
                        ></span>
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

    <!-- Pricing Configuration -->
	    <div v-if="selectedProvider" class="bg-white rounded-lg shadow">
	        <div class="p-6 border-b border-gray-200 flex justify-between items-center">
	            <div>
	                <h3 class="text-lg font-medium text-gray-900">{{ t('admin.pages.delivery.pricing.title', { provider: selectedProvider.name }) }}</h3>
	                <p class="text-sm text-gray-500">{{ t('admin.pages.delivery.pricing.hint') }}</p>
	            </div>
	            <button 
	                @click="saveRates" 
	                :disabled="saving"
	                class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
	            >
	                {{ saving ? t('admin.common.saving') : t('admin.common.saveChanges') }}
	            </button>
	        </div>
        
	        <div v-if="loadingRates" class="p-12 text-center">
	             <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
	             <p class="mt-2 text-gray-500">{{ t('admin.pages.delivery.pricing.loading') }}</p>
	        </div>

        <div v-else class="p-0">
             <table class="min-w-full divide-y divide-gray-200">
	                <thead class="bg-gray-50">
	                    <tr>
	                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">{{ t('admin.pages.delivery.pricing.table.code') }}</th>
	                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('admin.pages.delivery.pricing.table.wilaya') }}</th>
	                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">{{ t('admin.pages.delivery.pricing.table.price') }}</th>
	                    </tr>
	                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="wilaya in wilayas" :key="wilaya.code" class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{{ wilaya.code }}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ wilaya.name }}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                             <div class="relative rounded-md shadow-sm">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span class="text-gray-500 sm:text-sm">DZD</span>
                                </div>
                                <input 
                                    type="number" 
                                    v-model.number="modelRates[wilaya.code]" 
                                    class="focus:ring-teal-500 focus:border-teal-500 block w-full pl-12 sm:text-sm border-gray-300 rounded-md" 
                                    placeholder="0.00"
                                >
                            </div>
                        </td>
                    </tr>
                </tbody>
             </table>
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

interface Provider {
    key: string
    name: string
    description: string
    enabled: boolean
}

const providers = ref<Provider[]>([
    { key: 'YALIDINE', name: 'Yalidine Express', description: 'National delivery network', enabled: false },
    { key: 'MAYSTRO', name: 'Maystro Delivery', description: 'E-commerce logistics', enabled: false },
    { key: 'SELF', name: 'Self Delivery', description: 'Internal fleet management', enabled: false }
])

interface StoreSettings {
    allowedDeliveryProviders: string[]
}

const selectedProvider = ref<Provider | null>(null)
const loadingRates = ref(false)
const saving = ref(false)
const modelRates = ref<Record<string, number>>({})

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
    // Load store settings to check enabled providers
    try {
        const settings = await $fetch<StoreSettings>('/api/admin/store-settings', {
             headers: { Authorization: `Bearer ${authStore.token}` }
        })
        const allowed = settings.allowedDeliveryProviders || []
        providers.value.forEach(p => {
            p.enabled = allowed.includes(p.key)
        })
    } catch (e) {
        console.error('Failed to load settings', e)
    }
})

async function toggleProvider(provider: Provider, event: Event) {
    event.stopPropagation() // Prevent card click
    // Optimistic update
    provider.enabled = !provider.enabled

    // Sync with backend
    const enabledKeys = providers.value.filter(p => p.enabled).map(p => p.key)
    try {
        await $fetch('/api/admin/store-settings', {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: { allowedDeliveryProviders: enabledKeys }
        })
    } catch (e) {
        // Revert on error
        provider.enabled = !provider.enabled
        console.error('Failed to update provider status', e)
        alert(t('admin.pages.delivery.errors.updateProviderFailed'))
    }
}

async function selectProvider(provider: Provider) {
    selectedProvider.value = provider
    await fetchRates(provider.key)
}

async function fetchRates(providerKey: string) {
    loadingRates.value = true
    // Reset rates to 0 default
    wilayas.forEach(w => modelRates.value[w.code] = 0)
    
    try {
        const rates = await $fetch<any[]>(`/api/rates/${providerKey}`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        
        // Map backend rates to model (assuming rates array has wilayaCode and price)
        rates.forEach((r: any) => {
            if (r.wilayaCode) {
                 modelRates.value[r.wilayaCode] = Number(r.price)
            }
        })
    } catch (e) {
        console.error('Failed to load rates', e)
    } finally {
        loadingRates.value = false
    }
}

async function saveRates() {
    if (!selectedProvider.value) return
    saving.value = true
    
    const payload = {
        rates: Object.entries(modelRates.value).map(([code, price]) => ({
            wilayaCode: code,
            price: price,
            communeCode: '' // Applies to all communes
        }))
    }

    try {
        await $fetch(`/api/rates/${selectedProvider.value.key}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: payload
        })
        // Show success notification (optional, maybe simple alert for now)
    } catch (e) {
        console.error('Failed to save rates', e)
        alert(t('admin.pages.delivery.errors.saveFailed'))
    } finally {
        saving.value = false
    }
}
</script>
