<template>
  <NuxtLayout name="super-admin">
    <div class="space-y-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-sm text-slate-500">
            <NuxtLink to="/super-admin/tenants" class="hover:text-teal-700 hover:underline">Tenants</NuxtLink>
            <span>/</span>
            <span class="text-slate-700 font-semibold">{{ tenantLabel }}</span>
            <span>/</span>
            <span class="text-slate-700 font-semibold">Payments</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-800 mt-2">Payment Proofs & History</h1>
          <p class="text-slate-600 mt-1">Import payment proofs for history and optionally renew the subscription.</p>
        </div>
        <button
          class="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 transition-colors"
          @click="refreshAll"
        >
          <Icon name="lucide:refresh-cw" class="h-5 w-5 inline-block mr-2" />
          Refresh
        </button>
      </div>

      <div v-if="error" class="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
        {{ error }}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Import form -->
        <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 class="text-lg font-bold text-slate-900 mb-4">Import Payment Proof</h2>

          <form class="space-y-4" @submit.prevent="submitImport">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Plan</label>
              <BaseSelect v-model="form.planCode" :options="planOptions" required />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Interval</label>
              <BaseSelect v-model="form.interval" :options="intervalOptions" />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Proof URL</label>
              <input
                v-model="form.proofUrl"
                type="url"
                placeholder="https://drive.google.com/..."
                class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
              <p class="text-xs text-slate-500 mt-1">Link to screenshot/receipt (Drive, Dropbox, etc).</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">External reference</label>
              <input
                v-model="form.externalReference"
                type="text"
                placeholder="CCP-TRX-123"
                class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <textarea
                v-model="form.notes"
                rows="3"
                placeholder="Paid via CCP transfer…"
                class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>

            <label class="flex items-start gap-3 text-sm text-slate-700">
              <input v-model="form.applySubscription" type="checkbox" class="mt-1 h-4 w-4 accent-teal-600" />
              <span>
                Apply subscription renewal now
                <span class="block text-xs text-slate-500 mt-1">If checked, the tenant is renewed immediately.</span>
              </span>
            </label>

            <button
              type="submit"
              :disabled="submitting"
              class="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-white font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Icon v-if="submitting" name="lucide:loader-2" class="h-4 w-4 inline-block mr-2 animate-spin" />
              {{ submitting ? 'Importing…' : 'Import Proof' }}
            </button>
          </form>
        </div>

        <!-- History -->
        <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div class="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h2 class="text-lg font-bold text-slate-900">History</h2>
            <div class="text-xs text-slate-500">Last {{ payments.length }} entries</div>
          </div>

          <div v-if="loading" class="p-8 text-center text-slate-500">Loading…</div>
          <div v-else-if="payments.length === 0" class="p-8 text-center text-slate-500">No payments yet.</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Date</th>
                  <th class="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Plan</th>
                  <th class="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Amount</th>
                  <th class="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Method</th>
                  <th class="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Proof</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="p in payments" :key="p.id" class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{{ formatDateTime(p.createdAt) }}</td>
                  <td class="px-6 py-4 text-sm text-slate-700">
                    <div class="font-semibold">{{ p.planCode }}</div>
                    <div class="text-xs text-slate-500">{{ p.interval }}</div>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">
                    {{ formatMoney(p.amountDzd, p.currency) }}
                  </td>
                  <td class="px-6 py-4 text-xs font-semibold text-slate-700">{{ p.method }}</td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded-full text-xs font-semibold border"
                      :class="p.status === 'PAID' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-700'">
                      {{ p.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm">
                    <a
                      v-if="p.proofUrl"
                      :href="p.proofUrl"
                      target="_blank"
                      rel="noreferrer"
                      class="text-teal-700 hover:text-teal-800 hover:underline font-semibold"
                    >
                      Open
                    </a>
                    <span v-else class="text-slate-400">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import BaseSelect from '~/components/ui/BaseSelect.vue'
import { PRICING_PLANS } from '~/shared/pricing/plans'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'super-admin'
})

const authStore = useAuthStore()
const route = useRoute()

const tenantId = computed(() => String(route.params.id || ''))
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const tenants = ref<any[]>([])
const payments = ref<any[]>([])

const tenantLabel = computed(() => {
  const t = tenants.value.find((x) => x.id === tenantId.value)
  return t ? `${t.name} (${t.slug})` : tenantId.value
})

const planOptions = computed(() =>
  PRICING_PLANS.map((p) => ({
    value: p.code,
    label: `${p.name} (${p.ordersPerMonth} orders/mo)`
  }))
)

const intervalOptions = [
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' }
]

const form = ref({
  planCode: PRICING_PLANS[0]?.code || 'basic',
  interval: 'month',
  proofUrl: '',
  externalReference: '',
  notes: '',
  applySubscription: true
})

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

const formatMoney = (amount: number, currency: string) => `${Number(amount || 0).toLocaleString('fr-DZ')} ${currency || 'DA'}`

async function loadTenants() {
  const res = await $fetch<any[]>('/api/super-admin/tenants', {
    headers: { Authorization: `Bearer ${authStore.token}` }
  })
  tenants.value = res || []
}

async function loadPayments() {
  const res = await $fetch<{ payments: any[] }>(`/api/super-admin/billing/tenants/${encodeURIComponent(tenantId.value)}/payments`, {
    headers: { Authorization: `Bearer ${authStore.token}` }
  })
  payments.value = res?.payments || []
}

async function refreshAll() {
  error.value = ''
  loading.value = true
  try {
    await Promise.all([loadTenants(), loadPayments()])
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to load payments'
  } finally {
    loading.value = false
  }
}

async function submitImport() {
  error.value = ''
  submitting.value = true
  try {
    await $fetch(`/api/super-admin/billing/tenants/${encodeURIComponent(tenantId.value)}/payments/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        planCode: form.value.planCode,
        interval: form.value.interval,
        proofUrl: form.value.proofUrl || undefined,
        externalReference: form.value.externalReference || undefined,
        notes: form.value.notes || undefined,
        applySubscription: Boolean(form.value.applySubscription)
      }
    })

    form.value.proofUrl = ''
    form.value.externalReference = ''
    form.value.notes = ''
    await loadPayments()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to import proof'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  refreshAll()
})
</script>

