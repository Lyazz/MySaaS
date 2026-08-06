<template>
  <div class="space-y-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-sm text-slate-500">
            <NuxtLink to="/super-admin/tenants" class="hover:text-lime-700 hover:underline">{{ t('superAdmin.nav.tenants') }}</NuxtLink>
            <span>/</span>
            <span class="text-slate-700 font-semibold">{{ tenantLabel }}</span>
            <span>/</span>
            <span class="text-slate-700 font-semibold">{{ t('superAdmin.tenants.actions.payments') }}</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-800 mt-2">{{ t('superAdmin.paymentsPage.title') }}</h1>
          <p class="text-slate-600 mt-1">{{ t('superAdmin.paymentsPage.subtitle') }}</p>
        </div>
        <button
          class="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 transition-colors"
          @click="refreshAll"
        >
          <Icon name="lucide:refresh-cw" class="h-5 w-5 inline-block me-2" />
          {{ t('superAdmin.paymentsPage.actions.refresh') }}
        </button>
      </div>

      <div v-if="error" class="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
        {{ error }}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Import form -->
        <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 class="text-lg font-bold text-slate-900 mb-4">{{ t('superAdmin.paymentsPage.import.title') }}</h2>

          <form class="space-y-4" @submit.prevent="submitImport">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">{{ t('superAdmin.paymentsPage.import.fields.plan') }}</label>
              <BaseSelect v-model="form.planCode" :options="planOptions" required />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">{{ t('superAdmin.paymentsPage.import.fields.interval') }}</label>
              <BaseSelect v-model="form.interval" :options="intervalOptions" />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">{{ t('superAdmin.paymentsPage.import.fields.proofUrl') }}</label>
              <input
                v-model="form.proofUrl"
                type="url"
                :placeholder="t('superAdmin.paymentsPage.import.fields.proofUrlPlaceholder')"
                class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500 bg-white"
              />
              <p class="text-xs text-slate-500 mt-1">{{ t('superAdmin.paymentsPage.import.fields.proofUrlHint') }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">{{ t('superAdmin.paymentsPage.import.fields.externalReference') }}</label>
              <input
                v-model="form.externalReference"
                type="text"
                :placeholder="t('superAdmin.paymentsPage.import.fields.externalReferencePlaceholder')"
                class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500 bg-white"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">{{ t('superAdmin.paymentsPage.import.fields.notes') }}</label>
              <textarea
                v-model="form.notes"
                rows="3"
                :placeholder="t('superAdmin.paymentsPage.import.fields.notesPlaceholder')"
                class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500 bg-white"
              />
            </div>

            <label class="flex items-start gap-3 text-sm text-slate-700">
              <input v-model="form.applySubscription" type="checkbox" class="mt-1 h-4 w-4 accent-lime-600" />
              <span>
                {{ t('superAdmin.paymentsPage.import.applySubscription.label') }}
                <span class="block text-xs text-slate-500 mt-1">{{ t('superAdmin.paymentsPage.import.applySubscription.hint') }}</span>
              </span>
            </label>

            <button
              type="submit"
              :disabled="submitting"
              class="w-full px-4 py-2 bg-lime-600 hover:bg-lime-700 rounded-lg text-white font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Icon v-if="submitting" name="lucide:loader-2" class="h-4 w-4 inline-block me-2 animate-spin" />
              {{ submitting ? t('superAdmin.paymentsPage.import.actions.importing') : t('superAdmin.paymentsPage.import.actions.importProof') }}
            </button>
          </form>
        </div>

        <!-- History -->
        <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div class="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h2 class="text-lg font-bold text-slate-900">{{ t('superAdmin.paymentsPage.history.title') }}</h2>
            <div class="text-xs text-slate-500">{{ t('superAdmin.paymentsPage.history.lastEntries', { count: payments.length }) }}</div>
          </div>

          <div v-if="loading" class="p-8 text-center text-slate-500">{{ t('superAdmin.paymentsPage.history.loading') }}</div>
          <div v-else-if="payments.length === 0" class="p-8 text-center text-slate-500">{{ t('superAdmin.paymentsPage.history.empty') }}</div>
          <div v-else class="overflow-x-auto">
            <table class="ui-table">
              <thead class="ui-thead border-b border-slate-200">
                <tr>
                  <th class="ui-th">{{ t('superAdmin.paymentsPage.history.table.date') }}</th>
                  <th class="ui-th">{{ t('superAdmin.paymentsPage.history.table.plan') }}</th>
                  <th class="ui-th">{{ t('superAdmin.paymentsPage.history.table.amount') }}</th>
                  <th class="ui-th">{{ t('superAdmin.paymentsPage.history.table.method') }}</th>
                  <th class="ui-th">{{ t('superAdmin.paymentsPage.history.table.status') }}</th>
                  <th class="ui-th">{{ t('superAdmin.paymentsPage.history.table.proof') }}</th>
                </tr>
              </thead>
              <tbody class="ui-tbody">
                <tr v-for="p in payments" :key="p.id" class="ui-tr transition-colors">
                  <td class="ui-td text-sm text-slate-700 whitespace-nowrap">{{ formatDateTime(p.createdAt) }}</td>
                  <td class="ui-td text-sm text-slate-700">
                    <div class="font-semibold">{{ p.planCode }}</div>
                    <div class="text-xs text-slate-500">{{ p.interval }}</div>
                  </td>
                  <td class="ui-td text-sm text-slate-700 whitespace-nowrap">
                    {{ formatMoney(p.amountDzd, p.currency) }}
                  </td>
                  <td class="ui-td text-xs font-semibold text-slate-700">{{ p.method }}</td>
                  <td class="ui-td">
                    <span class="ui-badge" :class="p.status === 'PAID' ? 'ui-badge--emerald' : 'ui-badge--slate'">
                      {{ p.status }}
                    </span>
                  </td>
                  <td class="ui-td text-sm">
                    <a
                      v-if="p.proofUrl && String(p.proofUrl).startsWith('http')"
                      :href="p.proofUrl"
                      target="_blank"
                      rel="noreferrer"
                      class="text-lime-700 hover:text-lime-800 hover:underline font-semibold"
                    >
                      {{ t('superAdmin.paymentsPage.history.proof.open') }}
                    </a>
                    <button
                      v-else-if="p.proofUrl"
                      type="button"
                      class="text-lime-700 hover:text-lime-800 hover:underline font-semibold"
                      @click="openProof(p)"
                    >
                      {{ t('superAdmin.paymentsPage.history.proof.open') }}
                    </button>
                    <span v-else class="text-slate-400">—</span>
                  </td>
                  <td class="ui-td text-end">
                    <div v-if="p.status === 'PENDING'" class="flex items-center justify-end gap-2">
                      <button
                        class="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold"
                        :disabled="reviewingId === p.id"
                        @click="reviewPayment(p.id, 'PAID')"
                      >
                        {{ t('superAdmin.paymentsPage.history.actions.approve', 'Approve') }}
                      </button>
                      <button
                        class="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold"
                        :disabled="reviewingId === p.id"
                        @click="reviewPayment(p.id, 'REJECTED')"
                      >
                        {{ t('superAdmin.paymentsPage.history.actions.reject', 'Reject') }}
                      </button>
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
import BaseSelect from '~/components/ui/BaseSelect.vue'
import { PRICING_PLANS } from '~/shared/pricing/plans'
import { useAuthStore } from '~/stores/auth'
import { formatPriceAmount } from '~/shared/pricing/money-format'

definePageMeta({
  middleware: 'super-admin',
  layout: 'super-admin'
})

const { t, locale } = useI18n({ useScope: 'global' })
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
    label: `${t(`pricing.plans.${p.code}.name`)} (${t('superAdmin.paymentsPage.planOption.ordersPerMonth', { count: p.ordersPerMonth })})`
  }))
)

const intervalOptions = computed(() => [
  { value: 'month', label: t('superAdmin.paymentsPage.interval.monthly') },
  { value: 'year', label: t('superAdmin.paymentsPage.interval.yearly') }
])

const form = ref({
  planCode: PRICING_PLANS[0]?.code || 'basic',
  interval: 'month',
  proofUrl: '',
  externalReference: '',
  notes: '',
  applySubscription: true
})

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString(locale.value, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

const formatMoney = (amount: number, currency: string) =>
  `${formatPriceAmount(amount, { locale: locale.value })} ${currency || 'DA'}`

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
    error.value = e?.data?.statusMessage || e?.message || t('superAdmin.paymentsPage.errors.loadFailed')
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
    error.value = e?.data?.statusMessage || e?.message || t('superAdmin.paymentsPage.errors.importFailed')
  } finally {
    submitting.value = false
  }
}

const reviewingId = ref<string | null>(null)

async function reviewPayment(paymentId: string, status: 'PAID' | 'REJECTED') {
  error.value = ''
  reviewingId.value = paymentId
  try {
    await $fetch(`/api/super-admin/billing/tenants/${encodeURIComponent(tenantId.value)}/payments/${encodeURIComponent(paymentId)}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { status }
    })
    await loadPayments()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || t('superAdmin.paymentsPage.errors.reviewFailed', 'Failed to review payment')
  } finally {
    reviewingId.value = null
  }
}

async function openProof(payment: any) {
  error.value = ''
  try {
    const res = await $fetch<{ url: string }>(
      `/api/super-admin/billing/tenants/${encodeURIComponent(tenantId.value)}/payments/${encodeURIComponent(payment.id)}/proof-url`,
      { headers: { Authorization: `Bearer ${authStore.token}` } }
    )
    if (res?.url) window.open(res.url, '_blank', 'noopener,noreferrer')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to open proof'
  }
}

onMounted(() => {
  refreshAll()
})
</script>
