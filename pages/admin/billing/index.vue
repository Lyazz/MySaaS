<template>
  <div>
    <AdminPageHeader
      :title="t('admin.pages.billing.title')"
      :subtitle="t('admin.pages.billing.subtitle')"
    >
      <button type="button" class="ui-btn ui-btn--secondary ui-btn--md" :disabled="pending" @click="() => refresh()">
        <Icon name="lucide:rotate-cw" class="h-4 w-4" :class="{ 'animate-spin': pending }" />
        {{ t('admin.common.refresh', 'Refresh') }}
      </button>
      <NuxtLink to="/pricing" class="ui-btn ui-btn--secondary ui-btn--md">
        <Icon name="lucide:arrow-up-right" class="h-4 w-4" />
        {{ t('admin.pages.billing.seePricing') }}
      </NuxtLink>
    </AdminPageHeader>

    <div
      v-if="error"
      class="flex items-center gap-2 rounded-xl p-4 text-sm"
      style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #ef4444"
    >
      <Icon name="lucide:alert-circle" class="h-4 w-4 shrink-0" />
      {{ t('admin.pages.billing.errors.loadFailed') }}
    </div>

    <div v-else-if="pending && !snapshot" class="flex justify-center py-20">
      <Icon name="lucide:loader-2" class="h-7 w-7 animate-spin [color:var(--brand)]" />
    </div>

    <div v-else class="space-y-6">
      <BillingStateBanner
        :subscription="snapshot?.subscription ?? null"
        :pending-payment="pendingPayment"
        :rejected-payment="rejectedPayment"
        :busy="cancelBusy"
        @action="onBannerAction"
      />

      <!-- ── Current subscription + usage ── -->
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <!-- Subscription -->
        <div class="ui-card lg:col-span-3">
          <div class="ui-card-body">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-micro font-bold uppercase tracking-[0.12em] text-muted">
                  {{ t('admin.pages.billing.current.eyebrow') }}
                </p>
                <div class="mt-1.5 flex flex-wrap items-center gap-2.5">
                  <h2 class="text-2xl font-black text-primary">{{ currentPlanName }}</h2>
                  <span class="ui-badge" :class="statusBadgeClass">{{ statusLabel }}</span>
                </div>
                <p class="mt-1 text-sm text-tertiary">{{ currentPlanDescription }}</p>
              </div>

              <div class="text-end">
                <div class="text-2xl font-black tabular-nums text-primary">
                  {{ money(snapshot?.renewalQuote?.monthlyEquivalentDzd) }}
                  <span class="text-xs font-bold uppercase text-tertiary">
                    {{ snapshot?.renewalQuote?.currency }}
                  </span>
                </div>
                <p class="text-xs text-muted">{{ t('admin.pages.billing.perMonth') }}</p>
              </div>
            </div>

            <!-- Term facts: the three questions a merchant actually opens this page with -->
            <dl class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div class="rounded-xl p-3 surface-2">
                <dt class="text-mini uppercase tracking-wide text-muted">
                  {{ t('admin.pages.billing.current.billedAs') }}
                </dt>
                <dd class="mt-1 text-sm font-semibold text-primary">{{ intervalLabel }}</dd>
              </div>
              <div class="rounded-xl p-3 surface-2">
                <dt class="text-mini uppercase tracking-wide text-muted">
                  {{ renewalTermLabel }}
                </dt>
                <dd class="mt-1 text-sm font-semibold text-primary">{{ date(renewalDate) }}</dd>
                <dd class="text-mini" :style="{ color: daysColor }">{{ daysLabel }}</dd>
              </div>
              <div class="rounded-xl p-3 surface-2">
                <dt class="text-mini uppercase tracking-wide text-muted">
                  {{ t('admin.pages.billing.current.nextCharge') }}
                </dt>
                <dd class="mt-1 text-sm font-semibold tabular-nums text-primary">
                  {{ snapshot?.subscription?.cancelAtPeriodEnd ? '—' : `${money(snapshot?.renewalQuote?.totalDzd)} ${snapshot?.renewalQuote?.currency}` }}
                </dd>
                <dd v-if="snapshot?.renewalQuote?.savingsDzd" class="text-mini text-success">
                  {{ t('admin.pages.billing.current.savingPerYear', { amount: money(snapshot?.renewalQuote?.savingsDzd) }) }}
                </dd>
              </div>
            </dl>

            <div v-if="!isFreeCurrentPlan" class="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="ui-btn ui-btn--ghost ui-btn--sm"
                :disabled="cancelBusy"
                @click="toggleRenewal"
              >
                <Icon v-if="cancelBusy" name="lucide:loader-2" class="h-3.5 w-3.5 animate-spin" />
                <Icon v-else :name="snapshot?.subscription?.cancelAtPeriodEnd ? 'lucide:rotate-ccw' : 'lucide:calendar-x'" class="h-3.5 w-3.5" />
                {{
                  snapshot?.subscription?.cancelAtPeriodEnd
                    ? t('admin.pages.billing.current.resumeRenewal')
                    : t('admin.pages.billing.current.stopRenewal')
                }}
              </button>
              <span v-if="cancelError" class="text-xs text-danger">{{ cancelError }}</span>
            </div>
          </div>
        </div>

        <!-- Usage -->
        <div class="ui-card lg:col-span-2">
          <div class="ui-card-header">
            <h2 class="text-sm font-semibold text-primary">
              {{ t('admin.pages.billing.usage.title') }}
            </h2>
            <p class="mt-0.5 text-mini text-muted">
              {{ t('admin.pages.billing.usage.window', { range: usageWindowLabel }) }}
            </p>
          </div>
          <div class="ui-card-body space-y-4">
            <BillingUsageMeter
              v-if="snapshot"
              :label="t('admin.pages.billing.usage.orders')"
              :metric="snapshot.usage.orders"
              :hint="snapshot.usage.orders.exceeded ? t('admin.pages.billing.usage.ordersBlocked') : ''"
            />
            <BillingUsageMeter
              v-if="snapshot"
              :label="t('admin.pages.billing.usage.products')"
              :metric="snapshot.usage.products"
            />
            <BillingUsageMeter
              v-if="snapshot"
              :label="t('admin.pages.billing.usage.pixels')"
              :metric="snapshot.usage.pixels"
            />
          </div>
        </div>
      </div>

      <!-- ── Plans + checkout ── -->
      <div id="plans-section" class="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div class="xl:col-span-8">
          <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-primary">
                {{ t('admin.pages.billing.plans.title') }}
              </h2>
              <p class="text-xs text-tertiary">{{ t('admin.pages.billing.plans.subtitle') }}</p>
            </div>

            <!-- Interval toggle -->
            <div class="relative inline-grid grid-cols-2 rounded-xl p-1 surface-3">
              <div
                class="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-lg transition-transform duration-300 ease-out"
                :class="billingInterval === 'month' ? 'translate-x-0' : 'translate-x-full'"
                style="inset-inline-start: 4px; background: var(--surface-1); border: 1px solid var(--surface-border)"
              />
              <button
                type="button"
                class="relative z-10 rounded-lg px-4 py-2 text-xs font-bold transition-colors"
                :style="{ color: billingInterval === 'month' ? 'var(--text-primary)' : 'var(--text-tertiary)' }"
                @click="billingInterval = 'month'"
              >
                {{ t('admin.pages.billing.interval.monthly') }}
              </button>
              <button
                type="button"
                class="relative z-10 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors"
                :style="{ color: billingInterval === 'year' ? 'var(--text-primary)' : 'var(--text-tertiary)' }"
                @click="billingInterval = 'year'"
              >
                {{ t('admin.pages.billing.interval.yearly') }}
                <span
 class="rounded-full px-1.5 py-0.5 text-micro font-black uppercase tracking-wider ui-wash"
 
>
                  {{ t('admin.pages.billing.interval.save', { pct: bestAnnualDiscount }) }}
                </span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BillingPlanCard
              v-for="plan in plans"
              :key="plan.code"
              :plan="plan"
              :interval="billingInterval"
              :selected="plan.code === selectedPlanCode"
              :current="plan.code === currentPlanCode"
              :current-rank="currentPlanRank"
              :current-interval="currentInterval"
              @select="selectPlan"
            />
          </div>
        </div>

        <!-- Checkout column -->
        <div class="xl:col-span-4">
          <div id="checkout-section" class="xl:sticky xl:top-6">
            <BillingCheckout
              v-if="checkoutPlan"
              :plan="checkoutPlan"
              :interval="billingInterval"
              :term-start="termStart"
              :term-end="termEnd"
              :current-period-end="snapshot?.subscription?.currentPeriodEnd ?? ''"
              :cancel-at-period-end="snapshot?.subscription?.cancelAtPeriodEnd ?? false"
              :cancel-busy="cancelBusy"
              :has-pending-payment="Boolean(pendingPayment)"
              @submitted="onSubmitted"
              @dismiss="selectedPlanCode = ''"
              @cancel-renewal="setRenewal(true)"
            />

            <div
              v-else
              class="ui-card flex flex-col items-center justify-center px-6 py-12 text-center"
            >
              <div class="mb-3 flex h-14 w-14 items-center justify-center rounded-full surface-3">
                <Icon name="lucide:credit-card" class="h-7 w-7 text-muted" />
              </div>
              <h3 class="text-base font-bold text-primary">
                {{ t('admin.pages.billing.checkout.emptyTitle') }}
              </h3>
              <p class="mt-1.5 max-w-[24ch] text-sm text-tertiary">
                {{ t('admin.pages.billing.checkout.emptyDesc') }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Success toast-strip after a submission ── -->
      <div
        v-if="submitSuccess"
        class="flex items-start gap-3 rounded-xl p-4 text-sm"
        style="background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.22); color: var(--status-delivered-text)"
      >
        <Icon name="lucide:check-circle-2" class="mt-0.5 h-5 w-5 shrink-0" />
        {{ t('admin.pages.billing.checkout.submitSuccess') }}
      </div>

      <BillingHistoryTable :payments="paymentHistory" @open-proof="openPaymentProof" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useBillingFormat } from '~/composables/useBillingFormat'
import { addBillingInterval, type BillingInterval } from '~/shared/pricing/billing-period'
import { planRank, type PlanQuote } from '~/shared/pricing/plans'
import BillingStateBanner from '~/components/admin/billing/BillingStateBanner.vue'
import BillingUsageMeter from '~/components/admin/billing/BillingUsageMeter.vue'
import BillingPlanCard from '~/components/admin/billing/BillingPlanCard.vue'
import BillingCheckout from '~/components/admin/billing/BillingCheckout.vue'
import BillingHistoryTable, { type PaymentRecord } from '~/components/admin/billing/BillingHistoryTable.vue'

const { t } = useI18n({ useScope: 'global' })
const { money, date, dateRange } = useBillingFormat()

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.billing.metaTitle'
})

type UsageMetric = { used: number; limit: number; percent: number; exceeded: boolean; unlimited: boolean }

type BillingSnapshot = {
  subscription: {
    source: 'db' | 'default'
    planCode: string
    interval: BillingInterval
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    trialEnd: string | null
    isTrialing: boolean
    isPastDue: boolean
    daysUntilRenewal: number
  }
  plan: { code: string; name: string; description: string; ordersPerMonth: number }
  renewalQuote: PlanQuote
  usage: {
    periodStart: string
    periodEnd: string
    ordersInPeriod: number
    ordersLimit: number
    orders: UsageMetric
    products: UsageMetric
    pixels: UsageMetric
  }
}

type PlanCatalogItem = {
  code: string
  rank: number
  free: boolean
  ordersPerMonth: number
  maxProducts: number
  maxPixels: number
  flags?: { popular?: boolean; highlight?: boolean } | null
  quotes: Record<BillingInterval, PlanQuote>
}

const authStore = useAuthStore()

const authToken = () => {
  const token = (authStore as any).token?.value ?? (authStore as any).token
  return typeof token === 'string' && token ? token : null
}

const { data, pending, error, refresh } = await useAsyncData(
  'adminBilling',
  async () => {
    const token = authToken()
    if (!token) {
      return { snapshot: null as BillingSnapshot | null, plans: [] as PlanCatalogItem[], payments: [] as PaymentRecord[] }
    }

    const headers = { Authorization: `Bearer ${token}` }
    const [snapshot, plansRes, paymentsRes] = await Promise.all([
      $fetch('/api/admin/billing/subscription', { headers }) as Promise<BillingSnapshot>,
      $fetch('/api/admin/billing/plans', { headers }) as Promise<{ plans: PlanCatalogItem[] }>,
      $fetch('/api/admin/billing/payments', { headers }) as Promise<{ payments: PaymentRecord[] }>
    ])

    return { snapshot, plans: plansRes.plans || [], payments: paymentsRes.payments || [] }
  },
  { server: false, watch: [() => authStore.token], default: () => ({ snapshot: null, plans: [], payments: [] }) }
)

const snapshot = computed(() => (data.value as any)?.snapshot as BillingSnapshot | null)
const plans = computed(() => ((data.value as any)?.plans as PlanCatalogItem[]) || [])
const paymentHistory = computed(() => ((data.value as any)?.payments as PaymentRecord[]) || [])

/** Payments come back newest-first, so the first match is the latest one. */
const pendingPayment = computed(() => paymentHistory.value.find((p) => p.status === 'PENDING') ?? null)

/**
 * Only surfaced while it is still the most recent thing that happened — a
 * rejection stops being news once the tenant has submitted again.
 */
const rejectedPayment = computed(() => {
  const latest = paymentHistory.value[0]
  return latest?.status === 'REJECTED' ? latest : null
})

const currentPlanCode = computed(() => snapshot.value?.subscription?.planCode ?? 'basic')
const currentInterval = computed<BillingInterval>(() => snapshot.value?.subscription?.interval ?? 'month')
const currentPlanRank = computed(() => planRank(currentPlanCode.value))
const currentPlanName = computed(() => t(`pricing.plans.${currentPlanCode.value}.name`, snapshot.value?.plan?.name ?? '—'))
const currentPlanDescription = computed(() =>
  t(`pricing.plans.${currentPlanCode.value}.description`, snapshot.value?.plan?.description ?? '')
)
const isFreeCurrentPlan = computed(
  () => plans.value.find((p) => p.code === currentPlanCode.value)?.free ?? false
)

const intervalLabel = computed(() =>
  currentInterval.value === 'year'
    ? t('admin.pages.billing.interval.yearly')
    : t('admin.pages.billing.interval.monthly')
)

const statusLabel = computed(() => {
  const sub = snapshot.value?.subscription
  if (!sub) return '—'
  if (sub.isTrialing) return t('admin.pages.billing.status.trialing')
  if (sub.isPastDue) return t('admin.pages.billing.status.pastDue')
  if (sub.cancelAtPeriodEnd) return t('admin.pages.billing.status.canceling')
  return t('admin.pages.billing.status.active')
})

const statusBadgeClass = computed(() => {
  const sub = snapshot.value?.subscription
  if (!sub) return 'ui-badge--slate'
  if (sub.isPastDue) return 'ui-badge--red'
  if (sub.isTrialing) return 'ui-badge--indigo'
  if (sub.cancelAtPeriodEnd) return 'ui-badge--amber'
  return 'ui-badge--emerald'
})

// A trial ends on its own date; a paid term ends at the period end.
const renewalDate = computed(() => {
  const sub = snapshot.value?.subscription
  if (!sub) return null
  return sub.isTrialing && sub.trialEnd ? sub.trialEnd : sub.currentPeriodEnd
})

const renewalTermLabel = computed(() => {
  const sub = snapshot.value?.subscription
  if (sub?.isTrialing) return t('admin.pages.billing.current.trialEnds')
  if (sub?.cancelAtPeriodEnd) return t('admin.pages.billing.current.accessEnds')
  return t('admin.pages.billing.current.renewsOn')
})

const daysLabel = computed(() => {
  const days = snapshot.value?.subscription?.daysUntilRenewal
  if (typeof days !== 'number') return ''
  if (days < 0) return t('admin.pages.billing.current.expiredAgo', { days: Math.abs(days) })
  if (days === 0) return t('admin.pages.billing.current.today')
  return t('admin.pages.billing.current.daysLeft', { days })
})

const daysColor = computed(() => {
  const days = snapshot.value?.subscription?.daysUntilRenewal ?? 0
  if (days < 0) return '#ef4444'
  if (days <= 7) return 'var(--status-pending-text)'
  return 'var(--text-muted)'
})

const usageWindowLabel = computed(() =>
  dateRange(snapshot.value?.usage?.periodStart, snapshot.value?.usage?.periodEnd)
)

/** Headline discount on the toggle — read off the catalogue, never hardcoded. */
const bestAnnualDiscount = computed(() =>
  plans.value.reduce((best, plan) => Math.max(best, plan.quotes.year.savingsPercent), 0)
)

const billingInterval = ref<BillingInterval>('month')
const selectedPlanCode = ref<string>('')
const submitSuccess = ref(false)

// Open on the interval the tenant is already billed at, not always monthly.
watch(
  () => snapshot.value?.subscription?.interval,
  (interval) => {
    if (interval) billingInterval.value = interval
  },
  { immediate: true }
)

const checkoutPlan = computed(() => {
  if (!selectedPlanCode.value) return null
  const plan = plans.value.find((p) => p.code === selectedPlanCode.value)
  if (!plan) return null
  // Nothing to buy when the selection is already what the tenant has.
  if (plan.code === currentPlanCode.value && billingInterval.value === currentInterval.value) return null
  return plan
})

/**
 * A new term starts when the current one runs out, so a tenant who renews early
 * keeps the days they already paid for. Mirrors what the API records.
 */
const termStart = computed(() => {
  const sub = snapshot.value?.subscription
  if (!sub) return new Date().toISOString()
  const end = new Date(sub.currentPeriodEnd)
  const now = new Date()
  return !sub.isPastDue && end > now ? end.toISOString() : now.toISOString()
})

const termEnd = computed(() =>
  addBillingInterval(new Date(termStart.value), billingInterval.value).toISOString()
)

const scrollToCheckout = () => {
  nextTick(() => {
    const el = document.getElementById('checkout-section')
    if (!el) return
    // Only worth jumping on narrow layouts; on xl the panel is already alongside.
    if (window.innerWidth >= 1280) return
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24, behavior: 'smooth' })
  })
}

const selectPlan = (code: string) => {
  submitSuccess.value = false
  selectedPlanCode.value = selectedPlanCode.value === code ? '' : code
  if (selectedPlanCode.value) scrollToCheckout()
}

const onBannerAction = (id: 'resume' | 'choosePlan') => {
  if (id === 'resume') return setRenewal(false)
  nextTick(() => {
    document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

// ── Automatic renewal ──
const cancelBusy = ref(false)
const cancelError = ref('')

async function setRenewal(cancel: boolean) {
  const token = authToken()
  if (!token || cancelBusy.value) return

  cancelBusy.value = true
  cancelError.value = ''
  try {
    await $fetch('/api/admin/billing/subscription/cancel-at-period-end', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { cancelAtPeriodEnd: cancel }
    })
    await refresh()
  } catch (e: any) {
    cancelError.value = e?.data?.statusMessage || e?.message || t('admin.pages.billing.errors.updateFailed')
  } finally {
    cancelBusy.value = false
  }
}

const toggleRenewal = () => setRenewal(!snapshot.value?.subscription?.cancelAtPeriodEnd)

async function onSubmitted() {
  submitSuccess.value = true
  selectedPlanCode.value = ''
  await refresh()
}

async function openPaymentProof(payment: PaymentRecord) {
  const token = authToken()
  if (!token || !payment?.id || !payment?.proofUrl) return

  if (payment.proofUrl.startsWith('http')) {
    window.open(payment.proofUrl, '_blank', 'noopener,noreferrer')
    return
  }

  try {
    const res = (await $fetch(`/api/admin/billing/payments/${payment.id}/proof-url`, {
      headers: { Authorization: `Bearer ${token}` }
    })) as { url: string }
    if (res?.url) window.open(res.url, '_blank', 'noopener,noreferrer')
  } catch {
    // A missing or expired proof link is not worth derailing the page over.
  }
}
</script>
