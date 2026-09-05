<template>
  <div class="ui-card overflow-hidden">
    <div class="ui-card-header flex items-center justify-between">
      <h2 class="text-sm font-semibold text-primary">
        {{ t('admin.pages.billing.history.title') }}
      </h2>
      <span class="text-xs text-muted">
        {{ t('admin.pages.billing.history.count', { count: payments.length }) }}
      </span>
    </div>

    <div v-if="payments.length === 0" class="ui-card-body text-center">
      <p class="text-sm text-tertiary">{{ t('admin.pages.billing.history.empty') }}</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="ui-table">
        <thead class="ui-thead border-b border-line">
          <tr>
            <th class="ui-th">{{ t('admin.pages.billing.history.col.date') }}</th>
            <th class="ui-th">{{ t('admin.pages.billing.history.col.plan') }}</th>
            <th class="ui-th">{{ t('admin.pages.billing.history.col.period') }}</th>
            <th class="ui-th">{{ t('admin.pages.billing.history.col.amount') }}</th>
            <th class="ui-th">{{ t('admin.pages.billing.history.col.method') }}</th>
            <th class="ui-th">{{ t('admin.pages.billing.history.col.status') }}</th>
            <th class="ui-th">{{ t('admin.pages.billing.history.col.proof') }}</th>
          </tr>
        </thead>
        <tbody class="ui-tbody">
          <tr v-for="pay in payments" :key="pay.id" class="ui-tr">
            <td class="ui-td whitespace-nowrap text-sm text-secondary">
              {{ dateTime(pay.createdAt) }}
            </td>
            <td class="ui-td">
              <div class="text-sm font-semibold text-primary">
                {{ planName(pay.planCode) }}
              </div>
              <div class="text-xs text-muted">{{ intervalLabel(pay.interval) }}</div>
            </td>
            <td class="ui-td whitespace-nowrap text-xs text-tertiary">
              {{ pay.periodStart && pay.periodEnd ? dateRange(pay.periodStart, pay.periodEnd) : '—' }}
            </td>
            <td class="ui-td whitespace-nowrap text-sm font-semibold tabular-nums text-secondary">
              {{ money(pay.amountDzd) }} {{ pay.currency }}
            </td>
            <td class="ui-td text-xs font-semibold uppercase text-tertiary">{{ pay.method }}</td>
            <td class="ui-td">
              <span class="ui-badge" :class="statusClass(pay.status)">
                {{ t(`admin.pages.billing.history.status.${pay.status.toLowerCase()}`, pay.status) }}
              </span>
            </td>
            <td class="ui-td text-sm">
              <button v-if="pay.proofUrl" type="button" class="ui-table-action" @click="emit('open-proof', pay)">
                <Icon name="lucide:external-link" class="h-3.5 w-3.5" />
                {{ t('admin.pages.billing.history.viewProof') }}
              </button>
              <span class="text-muted" v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBillingFormat } from '~/composables/useBillingFormat'

export type PaymentRecord = {
  id: string
  planCode: string
  interval: string
  amountDzd: number
  currency: string
  method: string
  status: string
  proofUrl: string | null
  periodStart?: string | null
  periodEnd?: string | null
  createdAt: string
}

defineProps<{ payments: PaymentRecord[] }>()
const emit = defineEmits<{ (e: 'open-proof', payment: PaymentRecord): void }>()

const { t } = useI18n({ useScope: 'global' })
const { money, dateTime, dateRange } = useBillingFormat()

const planName = (code: string) => t(`pricing.plans.${code}.name`, code)

const intervalLabel = (interval: string) =>
  interval === 'year' ? t('admin.pages.billing.interval.yearly') : t('admin.pages.billing.interval.monthly')

const statusClass = (status: string) =>
  ({
    PENDING: 'ui-badge--amber',
    PAID: 'ui-badge--emerald',
    REJECTED: 'ui-badge--red',
    IMPORTED: 'ui-badge--slate'
  })[status] ?? 'ui-badge--slate'
</script>
