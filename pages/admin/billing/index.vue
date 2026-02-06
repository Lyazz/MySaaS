<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">{{ t('admin.pages.billing.title') }}</h1>
        <p class="text-slate-600 mt-1">{{ t('admin.pages.billing.subtitle') }}</p>
      </div>
      <NuxtLink
        to="/pricing"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
      >
        <Icon name="lucide:arrow-up-right" class="w-4 h-4" />
        <span class="text-sm font-semibold">{{ t('admin.pages.billing.seePricing') }}</span>
      </NuxtLink>
    </div>

    <div v-if="error" class="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
      {{ t('admin.pages.billing.errors.loadFailed') }}
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Current Plan -->
      <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div class="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">{{ t('admin.pages.billing.currentPlan.title') }}</h2>
            <p class="text-xs text-slate-500">{{ t('admin.pages.billing.currentPlan.hint') }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="px-2 py-1 rounded-full text-xs font-semibold border"
              :class="snapshot?.subscription?.status === 'ACTIVE' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-700'"
            >
              {{ snapshot?.subscription?.status || 'UNKNOWN' }}
            </span>
            <button
              class="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
              :disabled="pending"
              @click="() => refresh()"
            >
              {{ t('admin.common.refresh') }}
            </button>
          </div>
        </div>

        <div class="flex flex-col md:flex-row md:items-end gap-3 mb-5">
          <BaseSelect
            v-model="selectedPlanCode"
            :label="t('admin.pages.billing.currentPlan.changePlan')"
            :options="planOptions"
            class="md:w-[320px]"
          />
          <button
            class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold"
            :disabled="pending || !selectedPlanCode || selectedPlanCode === snapshot?.subscription?.planCode"
            @click="simulatePay"
          >
            <Icon name="lucide:repeat" class="w-4 h-4" />
            {{ t('admin.pages.billing.currentPlan.paySimulate') }}
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div class="text-xs text-slate-500">{{ t('admin.pages.billing.currentPlan.cards.plan') }}</div>
            <div class="text-lg font-black text-slate-900 mt-1">{{ snapshot?.plan?.name || '—' }}</div>
            <div class="text-xs text-slate-500 mt-1">{{ snapshot?.plan?.description || '' }}</div>
          </div>
          <div class="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div class="text-xs text-slate-500">{{ t('admin.pages.billing.currentPlan.cards.interval') }}</div>
            <div class="text-lg font-black text-slate-900 mt-1">{{ snapshot?.subscription?.interval || '—' }}</div>
            <div class="text-xs text-slate-500 mt-1">{{ t('admin.pages.billing.currentPlan.cards.source', { source: snapshot?.subscription?.source || '—' }) }}</div>
          </div>
          <div class="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div class="text-xs text-slate-500">{{ t('admin.pages.billing.currentPlan.cards.ordersThisPeriod') }}</div>
            <div class="text-lg font-black text-slate-900 mt-1">
              {{ snapshot?.usage?.ordersInPeriod ?? 0 }}
              <span class="text-xs text-slate-500 font-semibold">
                / {{ formatLimit(snapshot?.usage?.ordersLimit) }}
              </span>
            </div>
            <div class="text-xs text-slate-500 mt-1">{{ periodLabel }}</div>
          </div>
        </div>

        <div class="mt-6">
          <h3 class="text-sm font-bold text-slate-900 mb-2">{{ t('admin.pages.billing.currentPlan.limitsTitle') }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="row in limitRows"
              :key="row.label"
              class="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white"
            >
              <div class="text-sm text-slate-700">{{ row.label }}</div>
              <div class="text-sm font-semibold text-slate-900">{{ row.value }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Available Plans -->
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 class="text-lg font-bold text-slate-900 mb-4">{{ t('admin.pages.billing.availablePlans.title') }}</h2>
        <div v-if="pending" class="text-sm text-slate-500">{{ t('admin.common.loading') }}</div>
        <div v-else class="space-y-3">
          <div
            v-for="plan in plans"
            :key="plan.code"
            class="p-4 rounded-xl border transition-colors"
            :class="plan.code === snapshot?.subscription?.planCode ? 'border-teal-500 bg-teal-50/40' : 'border-slate-200 hover:bg-slate-50'"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-sm font-bold text-slate-900">{{ plan.name }}</div>
                <div class="text-xs text-slate-500 mt-1">{{ plan.description }}</div>
                <div class="text-xs text-slate-600 mt-2 font-semibold">
                  {{ t('admin.pages.billing.availablePlans.ordersPerMonth', { count: plan.ordersPerMonth }) }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-black text-slate-900">
                  {{ formatDzd(plan.pricing?.monthlyAmountDzd) }}
                  <span class="text-[10px] font-bold text-slate-500 ml-1 uppercase">{{ plan.pricing?.currency || '' }}</span>
                </div>
                <div class="text-[10px] text-slate-500">{{ t('admin.pages.billing.availablePlans.perMonth') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import BaseSelect from '~/components/ui/BaseSelect.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.billing.metaTitle'
})

type BillingSnapshot = {
  subscription: {
    source: 'db' | 'default'
    planCode: string
    interval: 'month' | 'year'
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
  }
  plan: {
    code: string
    name: string
    description: string
    pricing: { currency: string; monthlyAmountDzd: number; annualAmountDzd: number }
    ordersPerMonth: number
  }
  usage: {
    ordersInPeriod: number
    ordersLimit: number
    periodStart: string
    periodEnd: string
  }
}

type PlanCatalogItem = {
  code: string
  name: string
  description: string
  pricing: { currency: string; monthlyAmountDzd: number; annualAmountDzd: number }
  ordersPerMonth: number
}

const authStore = useAuthStore()
const { t, locale } = useI18n({ useScope: 'global' })

const { data, pending, error, refresh } = await useAsyncData(
  'adminBilling',
  async () => {
    const token = (authStore as any).token?.value ?? (authStore as any).token
    if (!token || typeof token !== 'string') {
      return { snapshot: null as BillingSnapshot | null, plans: [] as PlanCatalogItem[] }
    }

    const [snapshot, plansRes] = await Promise.all([
      $fetch<BillingSnapshot>('/api/admin/billing/subscription', { headers: { Authorization: `Bearer ${token}` } }),
      $fetch<{ plans: PlanCatalogItem[] }>('/api/admin/billing/plans', { headers: { Authorization: `Bearer ${token}` } })
    ])

    return { snapshot, plans: plansRes.plans || [] }
  },
  { server: false, watch: [() => authStore.token], default: () => ({ snapshot: null, plans: [] }) }
)

const snapshot = computed(() => (data.value as any)?.snapshot as BillingSnapshot | null)
const plans = computed(() => ((data.value as any)?.plans as PlanCatalogItem[]) || [])

const formatLimit = (limit: number | null | undefined) => {
  if (typeof limit === 'number') return String(limit)
  return '—'
}

const formatDzd = (amount: number | null | undefined) => {
  if (typeof amount !== 'number') return '—'
  const intlLocale = locale.value === 'fr' ? 'fr-DZ' : locale.value === 'ar' ? 'ar-DZ' : 'en-DZ'
  return new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 }).format(amount)
}

const periodLabel = computed(() => {
  const start = snapshot.value?.usage?.periodStart
  const end = snapshot.value?.usage?.periodEnd
  if (!start || !end) return ''
  const s = new Date(start)
  const e = new Date(end)
  return `${s.toLocaleDateString()} → ${e.toLocaleDateString()}`
})

const limitRows = computed(() => {
  return [
    { label: t('admin.pages.billing.limits.ordersPerMonth'), value: formatLimit(snapshot.value?.plan?.ordersPerMonth) }
  ]
})

const planOptions = computed(() =>
  plans.value.map((p) => ({ value: p.code, label: t('admin.pages.billing.planOption', { name: p.name, orders: p.ordersPerMonth }) }))
)

const selectedPlanCode = ref<string>('')
watch(
  snapshot,
  (s) => {
    if (!selectedPlanCode.value && s?.subscription?.planCode) {
      selectedPlanCode.value = s.subscription.planCode
    }
  },
  { immediate: true }
)

async function simulatePay() {
  const token = (authStore as any).token?.value ?? (authStore as any).token
  if (!token || typeof token !== 'string') return
  await $fetch('/api/admin/billing/payments/simulate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: { planCode: selectedPlanCode.value, interval: 'month' }
  })
  await refresh()
}
</script>
