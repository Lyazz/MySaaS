<template>
  <NuxtLayout name="super-admin">
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">{{ t('superAdmin.pendingPayments.title', 'Pending Payments') }}</h1>
          <p class="text-slate-500 mt-1 text-sm">{{ t('superAdmin.pendingPayments.subtitle', 'Review and approve or reject payment proofs submitted by tenants.') }}</p>
        </div>
        <button
          class="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 text-sm transition-colors"
          :disabled="loading"
          @click="load"
        >
          <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
          {{ t('superAdmin.paymentsPage.actions.refresh', 'Refresh') }}
        </button>
      </div>

      <!-- Error -->
      <div v-if="error" class="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-center gap-2">
        <Icon name="lucide:alert-circle" class="h-4 w-4 shrink-0" />
        {{ error }}
      </div>

      <!-- Stats bar -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Icon name="lucide:clock" class="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <div class="text-2xl font-bold text-slate-900">{{ payments.length }}</div>
            <div class="text-xs text-slate-500 mt-0.5">{{ t('superAdmin.pendingPayments.stats.pending', 'Pending proofs') }}</div>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div class="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Icon name="lucide:building-2" class="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <div class="text-2xl font-bold text-slate-900">{{ uniqueTenantCount }}</div>
            <div class="text-xs text-slate-500 mt-0.5">{{ t('superAdmin.pendingPayments.stats.tenants', 'Tenants waiting') }}</div>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon name="lucide:banknote" class="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <div class="text-2xl font-bold text-slate-900">{{ formatMoney(totalAmount) }}</div>
            <div class="text-xs text-slate-500 mt-0.5">{{ t('superAdmin.pendingPayments.stats.total', 'Total value') }}</div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <h2 class="font-semibold text-slate-800 text-sm">
            {{ t('superAdmin.pendingPayments.table.title', 'Submitted proofs awaiting review') }}
          </h2>
          <span v-if="payments.length > 0" class="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full">
            {{ payments.length }} {{ t('superAdmin.pendingPayments.pending', 'pending') }}
          </span>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="p-12 text-center">
          <Icon name="lucide:loader-2" class="h-8 w-8 text-teal-500 animate-spin mx-auto mb-3" />
          <p class="text-slate-500 text-sm">{{ t('superAdmin.paymentsPage.history.loading', 'Loading…') }}</p>
        </div>

        <!-- Empty -->
        <div v-else-if="payments.length === 0" class="p-12 text-center">
          <div class="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Icon name="lucide:check-circle-2" class="h-8 w-8 text-emerald-500" />
          </div>
          <h3 class="text-slate-800 font-semibold mb-1">{{ t('superAdmin.pendingPayments.empty.title', 'All caught up!') }}</h3>
          <p class="text-slate-500 text-sm">{{ t('superAdmin.pendingPayments.empty.subtitle', 'No pending payment proofs at the moment.') }}</p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="ui-table">
            <thead class="ui-thead border-b border-slate-200">
              <tr>
                <th class="ui-th">{{ t('superAdmin.pendingPayments.table.tenant', 'Tenant') }}</th>
                <th class="ui-th">{{ t('superAdmin.pendingPayments.table.plan', 'Plan') }}</th>
                <th class="ui-th">{{ t('superAdmin.pendingPayments.table.amount', 'Amount') }}</th>
                <th class="ui-th">{{ t('superAdmin.pendingPayments.table.submitted', 'Submitted') }}</th>
                <th class="ui-th">{{ t('superAdmin.pendingPayments.table.proof', 'Proof') }}</th>
                <th class="ui-th">{{ t('superAdmin.pendingPayments.table.notes', 'Notes') }}</th>
                <th class="ui-th text-right">{{ t('superAdmin.pendingPayments.table.actions', 'Actions') }}</th>
              </tr>
            </thead>
            <tbody class="ui-tbody">
              <tr
                v-for="p in payments"
                :key="p.id"
                class="ui-tr transition-colors"
                :class="reviewingId === p.id ? 'opacity-50 pointer-events-none' : ''"
              >
                <!-- Tenant -->
                <td class="ui-td">
                  <NuxtLink
                    :to="`/super-admin/tenants/${p.tenant.id}/payments`"
                    class="group flex items-center gap-2"
                  >
                    <div class="w-7 h-7 rounded-md bg-teal-100 flex items-center justify-center shrink-0">
                      <span class="text-xs font-bold text-teal-700">{{ p.tenant.name?.charAt(0).toUpperCase() }}</span>
                    </div>
                    <div>
                      <div class="font-semibold text-slate-800 text-sm group-hover:text-teal-700 transition-colors">{{ p.tenant.name }}</div>
                      <div class="text-xs text-slate-400">{{ p.tenant.slug }}</div>
                    </div>
                  </NuxtLink>
                </td>

                <!-- Plan -->
                <td class="ui-td">
                  <div class="font-semibold text-slate-700 text-sm capitalize">{{ p.planCode }}</div>
                  <div class="text-xs text-slate-400">{{ p.interval }}</div>
                </td>

                <!-- Amount -->
                <td class="ui-td text-sm font-semibold text-slate-700 whitespace-nowrap">
                  {{ formatMoney(p.amountDzd) }}
                </td>

                <!-- Date -->
                <td class="ui-td text-sm text-slate-500 whitespace-nowrap">
                  {{ formatDateTime(p.createdAt) }}
                </td>

                <!-- Proof -->
                <td class="ui-td text-sm">
                  <a
                    v-if="p.proofUrl && String(p.proofUrl).startsWith('http')"
                    :href="p.proofUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 hover:underline font-semibold"
                  >
                    <Icon name="lucide:external-link" class="h-3.5 w-3.5" />
                    {{ t('superAdmin.paymentsPage.history.proof.open', 'Open') }}
                  </a>
                  <button
                    v-else-if="p.proofUrl"
                    type="button"
                    class="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 hover:underline font-semibold"
                    @click="openProof(p)"
                  >
                    <Icon name="lucide:external-link" class="h-3.5 w-3.5" />
                    {{ t('superAdmin.paymentsPage.history.proof.open', 'Open') }}
                  </button>
                  <span v-else class="text-slate-300 text-xs italic">{{ t('superAdmin.pendingPayments.noProof', 'No file') }}</span>
                </td>

                <!-- Notes -->
                <td class="ui-td text-sm text-slate-500 max-w-[160px]">
                  <span v-if="p.notes" class="truncate block" :title="p.notes">{{ p.notes }}</span>
                  <span v-else-if="p.externalReference" class="text-xs font-mono text-slate-400">{{ p.externalReference }}</span>
                  <span v-else class="text-slate-300">—</span>
                </td>

                <!-- Actions -->
                <td class="ui-td text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                      :disabled="reviewingId === p.id"
                      @click="review(p, 'PAID')"
                    >
                      <Icon name="lucide:check" class="h-3.5 w-3.5" />
                      {{ t('superAdmin.paymentsPage.history.actions.approve', 'Approve') }}
                    </button>
                    <button
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-semibold transition-colors"
                      :disabled="reviewingId === p.id"
                      @click="review(p, 'REJECTED')"
                    >
                      <Icon name="lucide:x" class="h-3.5 w-3.5" />
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
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'super-admin',
  title: 'Pending Payments'
})

const { t, locale } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

const loading = ref(true)
const error = ref('')
const payments = ref<any[]>([])
const reviewingId = ref<string | null>(null)

const uniqueTenantCount = computed(() => new Set(payments.value.map((p) => p.tenantId)).size)

const totalAmount = computed(() => payments.value.reduce((sum, p) => sum + (Number(p.amountDzd) || 0), 0))

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString(locale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

const formatMoney = (amount: number) => `${Number(amount || 0).toLocaleString(locale.value)} DA`

async function load() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch<{ payments: any[] }>('/api/super-admin/billing/pending-payments', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    payments.value = res?.payments || []
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to load pending payments'
  } finally {
    loading.value = false
  }
}

async function review(payment: any, status: 'PAID' | 'REJECTED') {
  error.value = ''
  reviewingId.value = payment.id
  try {
    await $fetch(
      `/api/super-admin/billing/tenants/${encodeURIComponent(payment.tenantId)}/payments/${encodeURIComponent(payment.id)}/review`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` },
        body: { status }
      }
    )
    // Remove from list immediately for snappy UX
    payments.value = payments.value.filter((p) => p.id !== payment.id)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to review payment'
  } finally {
    reviewingId.value = null
  }
}

async function openProof(payment: any) {
  error.value = ''
  try {
    const res = await $fetch<{ url: string }>(
      `/api/super-admin/billing/tenants/${encodeURIComponent(payment.tenantId)}/payments/${encodeURIComponent(payment.id)}/proof-url`,
      { headers: { Authorization: `Bearer ${authStore.token}` } }
    )
    if (res?.url) window.open(res.url, '_blank', 'noopener,noreferrer')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to open proof'
  }
}

onMounted(() => {
  load()
})
</script>
