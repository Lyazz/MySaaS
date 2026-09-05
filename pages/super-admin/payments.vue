<template>
  <div class="space-y-6">
      <SuperAdminPageHeader
        :title="t('superAdmin.pendingPayments.title', 'Pending Payments')"
        :subtitle="t('superAdmin.pendingPayments.subtitle', 'Review and approve or reject payment proofs submitted by tenants.')"
      >
        <template #actions>
          <button
            class="ui-btn ui-btn--secondary ui-btn--md"
            :disabled="loading"
            @click="load"
          >
            <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
            {{ t('superAdmin.paymentsPage.actions.refresh', 'Refresh') }}
          </button>
        </template>
      </SuperAdminPageHeader>

      <!-- Error -->
      <div v-if="error" class="p-4 rounded-xl text-sm flex items-center gap-2" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171">
        <Icon name="lucide:alert-circle" class="h-4 w-4 shrink-0" />
        {{ error }}
      </div>

      <!-- Stats bar -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          icon="lucide:clock"
          color="amber"
          :label="t('superAdmin.pendingPayments.stats.pending', 'Pending proofs')"
          :value="payments.length"
        />
        <StatsCard
          icon="lucide:building-2"
          color="lime"
          :label="t('superAdmin.pendingPayments.stats.tenants', 'Tenants waiting')"
          :value="uniqueTenantCount"
        />
        <StatsCard
          icon="lucide:banknote"
          color="slate"
          :label="t('superAdmin.pendingPayments.stats.total', 'Total value')"
          :value="formatMoney(totalAmount)"
        />
      </div>

      <!-- Table -->
      <div class="ui-card overflow-hidden">
        <div class="ui-card-header flex items-center justify-between">
          <h2 class="font-semibold text-sm text-primary">
            {{ t('superAdmin.pendingPayments.table.title', 'Submitted proofs awaiting review') }}
          </h2>
          <span v-if="payments.length > 0" class="ui-badge ui-badge--amber">
            {{ payments.length }} {{ t('superAdmin.pendingPayments.pending', 'pending') }}
          </span>
        </div>

        <SuperAdminLoadingState
          v-if="loading"
          :label="t('superAdmin.paymentsPage.history.loading', 'Loading…')"
        />
        <SuperAdminEmptyState
          v-else-if="payments.length === 0"
          icon="lucide:check-circle-2"
          :title="t('superAdmin.pendingPayments.empty.title', 'All caught up!')"
          :subtitle="t('superAdmin.pendingPayments.empty.subtitle', 'No pending payment proofs at the moment.')"
        />

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="ui-table">
            <thead class="ui-thead border-b border-line">
              <tr>
                <th class="ui-th">{{ t('superAdmin.pendingPayments.table.tenant', 'Tenant') }}</th>
                <th class="ui-th">{{ t('superAdmin.pendingPayments.table.plan', 'Plan') }}</th>
                <th class="ui-th">{{ t('superAdmin.pendingPayments.table.amount', 'Amount') }}</th>
                <th class="ui-th">{{ t('superAdmin.pendingPayments.table.submitted', 'Submitted') }}</th>
                <th class="ui-th">{{ t('superAdmin.pendingPayments.table.proof', 'Proof') }}</th>
                <th class="ui-th">{{ t('superAdmin.pendingPayments.table.notes', 'Notes') }}</th>
                <th class="ui-th text-end">{{ t('superAdmin.pendingPayments.table.actions', 'Actions') }}</th>
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
                    <div class="w-7 h-7 rounded-lg bg-lime-100 flex items-center justify-center shrink-0">
                      <span class="text-xs font-bold text-lime-700">{{ p.tenant.name?.charAt(0).toUpperCase() }}</span>
                    </div>
                    <div>
                      <div class="font-semibold text-primary text-sm group-hover:text-lime-700 transition-colors">{{ p.tenant.name }}</div>
                      <div class="text-xs text-tertiary">{{ p.tenant.slug }}</div>
                    </div>
                  </NuxtLink>
                </td>

                <!-- Plan -->
                <td class="ui-td">
                  <div class="font-semibold text-secondary text-sm capitalize">{{ p.planCode }}</div>
                  <div class="text-xs text-tertiary">{{ p.interval }}</div>
                </td>

                <!-- Amount -->
                <td class="ui-td text-sm font-semibold text-secondary whitespace-nowrap">
                  {{ formatMoney(p.amountDzd) }}
                </td>

                <!-- Date -->
                <td class="ui-td text-sm text-secondary whitespace-nowrap">
                  {{ formatDateTime(p.createdAt) }}
                </td>

                <!-- Proof -->
                <td class="ui-td text-sm">
                  <a
                    v-if="p.proofUrl && String(p.proofUrl).startsWith('http')"
                    :href="p.proofUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center gap-1 text-lime-700 hover:text-lime-800 hover:underline font-semibold"
                  >
                    <Icon name="lucide:external-link" class="h-3.5 w-3.5" />
                    {{ t('superAdmin.paymentsPage.history.proof.open', 'Open') }}
                  </a>
                  <button
                    v-else-if="p.proofUrl"
                    type="button"
                    class="inline-flex items-center gap-1 text-lime-700 hover:text-lime-800 hover:underline font-semibold"
                    @click="openProof(p)"
                  >
                    <Icon name="lucide:external-link" class="h-3.5 w-3.5" />
                    {{ t('superAdmin.paymentsPage.history.proof.open', 'Open') }}
                  </button>
                  <span v-else class="text-tertiary text-xs italic">{{ t('superAdmin.pendingPayments.noProof', 'No file') }}</span>
                </td>

                <!-- Notes -->
                <td class="ui-td text-sm text-secondary max-w-[160px]">
                  <span v-if="p.notes" class="truncate block" :title="p.notes">{{ p.notes }}</span>
                  <span v-else-if="p.externalReference" class="text-xs font-mono text-tertiary">{{ p.externalReference }}</span>
                  <span v-else class="text-tertiary">—</span>
                </td>

                <!-- Actions -->
                <td class="ui-td text-end">
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
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { formatPriceAmount } from '~/shared/pricing/money-format'
import StatsCard from '~/components/StatsCard.vue'
import SuperAdminPageHeader from '~/components/super-admin/SuperAdminPageHeader.vue'
import SuperAdminEmptyState from '~/components/super-admin/SuperAdminEmptyState.vue'
import SuperAdminLoadingState from '~/components/super-admin/SuperAdminLoadingState.vue'

definePageMeta({
  middleware: 'super-admin',
  layout: 'super-admin',
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

const formatMoney = (amount: number) => `${formatPriceAmount(amount, { locale: locale.value })} DA`

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
