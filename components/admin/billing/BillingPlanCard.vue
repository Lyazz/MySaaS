<template>
  <button
    type="button"
    class="relative flex w-full flex-col rounded-2xl border p-5 text-start transition-all duration-150 hover:-translate-y-0.5"
    :style="cardStyle"
    :aria-pressed="selected"
    @click="emit('select', plan.code)"
  >
    <!-- Corner badge: current plan wins over a marketing flag -->
    <span
      v-if="badge"
      class="absolute -top-2.5 end-4 rounded-full px-2.5 py-0.5 text-micro font-bold uppercase tracking-wider"
      :style="badge.style"
    >
      {{ badge.label }}
    </span>

    <h3 class="text-base font-bold text-primary">{{ name }}</h3>
    <p class="mt-0.5 min-h-[32px] text-xs leading-relaxed text-tertiary">{{ description }}</p>

    <div class="mt-4">
      <div class="flex items-baseline gap-1.5">
        <span class="text-3xl font-black leading-none tabular-nums text-primary">
          {{ money(quote.monthlyEquivalentDzd) }}
        </span>
        <span class="text-xs font-bold uppercase text-tertiary">{{ quote.currency }}</span>
        <span class="text-xs text-muted">{{ t('admin.pages.billing.perMonth') }}</span>
      </div>

      <!-- Always says what is actually charged, so a yearly card can never be
           mistaken for a monthly one. -->
      <p class="mt-1.5 text-mini leading-relaxed text-muted">
        <template v-if="plan.free">{{ t('admin.pages.billing.plans.freeForever') }}</template>
        <template v-else-if="quote.interval === 'year'">
          {{ t('admin.pages.billing.plans.billedYearly', { total: `${money(quote.totalDzd)} ${quote.currency}` }) }}
        </template>
        <template v-else>{{ t('admin.pages.billing.plans.billedMonthly') }}</template>
      </p>
    </div>

    <ul class="mt-4 flex-1 space-y-2">
      <li v-for="line in limits" :key="line" class="flex items-start gap-2">
        <Icon name="lucide:check" class="mt-0.5 h-3.5 w-3.5 shrink-0 [color:var(--brand)]" />
        <span class="text-sm text-secondary">{{ line }}</span>
      </li>
    </ul>

    <div
      class="mt-5 flex w-full items-center justify-center rounded-xl border py-2 text-sm font-semibold"
      :style="ctaStyle"
    >
      {{ ctaLabel }}
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBillingFormat } from '~/composables/useBillingFormat'
import type { BillingInterval, PlanQuote } from '~/shared/pricing/plans'

type PlanEntry = {
  code: string
  rank: number
  free: boolean
  ordersPerMonth: number
  maxProducts: number
  maxPixels: number
  flags?: { popular?: boolean; highlight?: boolean } | null
  quotes: Record<BillingInterval, PlanQuote>
}

const props = defineProps<{
  plan: PlanEntry
  interval: BillingInterval
  selected: boolean
  /** The plan the tenant is on right now, whatever interval is being previewed. */
  current: boolean
  /** Rank of the current plan, for upgrade/downgrade wording. */
  currentRank: number
  currentInterval: BillingInterval
}>()

const emit = defineEmits<{ (e: 'select', code: string): void }>()

const { t } = useI18n({ useScope: 'global' })
const { money, limit } = useBillingFormat()

const quote = computed(() => props.plan.quotes[props.interval])

const name = computed(() => t(`pricing.plans.${props.plan.code}.name`))
const description = computed(() => t(`pricing.plans.${props.plan.code}.description`))

/** Real catalogue limits, replacing the invented "Priority support" bullets and
 *  a dead `plan.code === 'premium'` branch for a plan that does not exist. */
const limits = computed(() => [
  t('admin.pages.billing.plans.ordersLine', { count: limit(props.plan.ordersPerMonth) }),
  t('admin.pages.billing.plans.productsLine', { count: limit(props.plan.maxProducts) }),
  t('admin.pages.billing.plans.pixelsLine', { count: limit(props.plan.maxPixels) })
])

const badge = computed(() => {
  if (props.current) {
    return {
      label: t('admin.pages.billing.plans.currentBadge'),
      style: 'background: var(--text-primary); color: var(--surface-1)'
    }
  }
  if (props.plan.flags?.popular) {
    return {
      label: t('pricing.badges.mostPopular'),
      style: 'background: var(--brand); color: var(--brand-contrast)'
    }
  }
  return null
})

/**
 * The CTA has to answer "what happens if I click this?" — including the case the
 * old screen could not express at all: same plan, different interval.
 */
const ctaLabel = computed(() => {
  if (props.current && props.interval === props.currentInterval) {
    return t('admin.pages.billing.plans.cta.current')
  }
  if (props.current) {
    return props.interval === 'year'
      ? t('admin.pages.billing.plans.cta.switchToYearly')
      : t('admin.pages.billing.plans.cta.switchToMonthly')
  }
  if (props.plan.rank > props.currentRank) return t('admin.pages.billing.plans.cta.upgrade')
  return t('admin.pages.billing.plans.cta.downgrade')
})

const cardStyle = computed(() => {
  if (props.selected) {
    return 'background: var(--surface-1); border-color: var(--brand); box-shadow: 0 8px 24px rgba(var(--brand-rgb)/0.16)'
  }
  return 'background: var(--surface-1); border-color: var(--surface-border)'
})

const ctaStyle = computed(() => {
  if (props.current && props.interval === props.currentInterval) {
    return 'background: transparent; border-color: var(--surface-border); color: var(--text-muted)'
  }
  if (props.selected) {
    return 'background: var(--brand); border-color: var(--brand); color: var(--brand-contrast)'
  }
  return 'background: var(--surface-2); border-color: var(--surface-border); color: var(--text-secondary)'
})
</script>
