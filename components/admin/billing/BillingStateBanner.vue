<template>
  <div
    v-if="state"
    class="flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center"
    :style="{ background: state.tint, border: `1px solid ${state.border}` }"
  >
    <div
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      :style="{ background: state.border, color: state.accent }"
    >
      <Icon :name="state.icon" class="h-5 w-5" />
    </div>

    <div class="min-w-0 flex-1">
      <p class="font-semibold" :style="{ color: state.accent }">{{ state.title }}</p>
      <p class="mt-0.5 text-sm text-secondary">{{ state.description }}</p>
    </div>

    <div v-if="state.action" class="shrink-0">
      <button
        type="button"
        class="ui-btn ui-btn--md"
        :class="state.action.variant"
        :disabled="busy"
        @click="emit('action', state.action.id)"
      >
        <Icon v-if="busy" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
        {{ state.action.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBillingFormat } from '~/composables/useBillingFormat'

type PendingPayment = { planCode: string; amountDzd: number; method: string; createdAt: string }

const props = defineProps<{
  subscription: {
    status: string
    isTrialing: boolean
    isPastDue: boolean
    cancelAtPeriodEnd: boolean
    trialEnd: string | null
    currentPeriodEnd: string
    daysUntilRenewal: number
  } | null
  pendingPayment: PendingPayment | null
  rejectedPayment: PendingPayment | null
  busy?: boolean
}>()

const emit = defineEmits<{ (e: 'action', id: 'resume' | 'choosePlan'): void }>()

const { t } = useI18n({ useScope: 'global' })
const { money, date } = useBillingFormat()

type BannerAction = { id: 'resume' | 'choosePlan'; label: string; variant: string }
type BannerState = {
  icon: string
  accent: string
  tint: string
  border: string
  title: string
  description: string
  action?: BannerAction
}

const RED = { accent: '#f87171', tint: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.22)' }
const AMBER = { accent: 'var(--status-pending-text)', tint: 'var(--status-pending-bg)', border: 'var(--accent-border)' }
const BRAND = { accent: 'var(--brand)', tint: 'rgba(var(--brand-rgb)/0.08)', border: 'rgba(var(--brand-rgb)/0.22)' }
const BLUE = { accent: '#60a5fa', tint: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.22)' }

/**
 * One banner at a time, most urgent first. The screen previously showed a
 * "payment approved" note that never went away and had nothing at all to say
 * about an expired subscription — the one situation where this is the only page
 * the tenant can still reach.
 */
const state = computed<BannerState | null>(() => {
  const sub = props.subscription
  if (!sub) return null

  if (sub.isPastDue) {
    return {
      ...RED,
      icon: 'lucide:alert-octagon',
      title: t('admin.pages.billing.state.pastDue.title'),
      description: t('admin.pages.billing.state.pastDue.desc', { date: date(sub.currentPeriodEnd) }),
      action: { id: 'choosePlan', label: t('admin.pages.billing.state.pastDue.action'), variant: 'ui-btn--danger' }
    }
  }

  if (props.pendingPayment) {
    return {
      ...BRAND,
      icon: 'lucide:clock',
      title: t('admin.pages.billing.state.pending.title'),
      description: t('admin.pages.billing.state.pending.desc', {
        amount: money(props.pendingPayment.amountDzd),
        method: props.pendingPayment.method,
        date: date(props.pendingPayment.createdAt)
      })
    }
  }

  if (props.rejectedPayment) {
    return {
      ...RED,
      icon: 'lucide:file-x',
      title: t('admin.pages.billing.state.rejected.title'),
      description: t('admin.pages.billing.state.rejected.desc', { date: date(props.rejectedPayment.createdAt) }),
      action: { id: 'choosePlan', label: t('admin.pages.billing.state.rejected.action'), variant: 'ui-btn--secondary' }
    }
  }

  if (sub.cancelAtPeriodEnd) {
    return {
      ...AMBER,
      icon: 'lucide:calendar-x',
      title: t('admin.pages.billing.state.canceling.title'),
      description: t('admin.pages.billing.state.canceling.desc', { date: date(sub.currentPeriodEnd) }),
      action: { id: 'resume', label: t('admin.pages.billing.state.canceling.action'), variant: 'ui-btn--secondary' }
    }
  }

  if (sub.isTrialing) {
    return {
      ...BLUE,
      icon: 'lucide:sparkles',
      title: t('admin.pages.billing.state.trial.title', { days: Math.max(0, sub.daysUntilRenewal) }),
      description: t('admin.pages.billing.state.trial.desc', { date: date(sub.trialEnd) }),
      action: { id: 'choosePlan', label: t('admin.pages.billing.state.trial.action'), variant: 'ui-btn--secondary' }
    }
  }

  return null
})
</script>
