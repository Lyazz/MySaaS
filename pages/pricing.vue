<script setup lang="ts">
import { computed, ref } from 'vue'
import { PRICING_PLANS, pricingPlanCardForUi } from '~/shared/pricing/plans'

definePageMeta({
  layout: 'marketing'
})

const { t } = useI18n({ useScope: 'global' })

useSeoMeta({
  title: computed(() => t('pricing.seo.title')),
  description: computed(() => t('pricing.seo.description'))
})

const isAnnual = ref(false)

const plans = computed(() => {
  return PRICING_PLANS.map((plan) => {
    const cycle = isAnnual.value ? 'year' : 'month'
    const card = pricingPlanCardForUi(plan, cycle)
    const featureKeys: Record<string, string[]> = {
      basic: ['pricing.page.features.store', 'pricing.page.features.delivery'],
      beginner: ['pricing.page.features.store', 'pricing.page.features.delivery', 'pricing.page.features.upsell'],
      merchant: ['pricing.page.features.store', 'pricing.page.features.delivery', 'pricing.page.features.upsell', 'pricing.page.features.analytics'],
      professional: ['pricing.page.features.store', 'pricing.page.features.delivery', 'pricing.page.features.upsell', 'pricing.page.features.analytics', 'pricing.page.features.team']
    }

    return {
      code: plan.code,
      name: t(`pricing.plans.${plan.code}.name`),
      description: t(`pricing.plans.${plan.code}.description`),
      price: card.priceText,
      currency: card.currency,
      period: isAnnual.value ? t('pricing.period.perYear') : t('pricing.period.perMonth'),
      features: [
        t('pricing.features.ordersPerMonth', { count: plan.ordersPerMonth }),
        ...(featureKeys[plan.code] || []).map((key) => t(key))
      ],
      cta: t(`pricing.plans.${plan.code}.cta`),
      popular: card.popular,
      highlight: card.highlight
    }
  })
})
</script>

<template>
  <div class="relative overflow-hidden pt-28 md:pt-32">
    <section class="marketing-section pb-10">
      <div class="marketing-container max-w-[90rem]">
        <div class="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <div class="marketing-eyebrow">
              <Icon name="lucide:wallet-cards" class="h-3.5 w-3.5 text-[#16d5b3]" />
              {{ t('pricing.page.title') }}
            </div>
            <h1 class="mt-6 font-display text-5xl font-semibold tracking-[-0.06em] text-white md:text-6xl lg:text-7xl">
              {{ t('pricing.page.title') }}
            </h1>
            <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              {{ t('pricing.page.subtitle') }}
            </p>

            <div class="mt-8 inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] p-1.5">
              <button
                class="rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                :class="!isAnnual ? 'bg-white text-[#050816]' : 'text-slate-300'"
                @click="isAnnual = false"
              >
                {{ t('pricing.toggle.monthly') }}
              </button>
              <button
                class="rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                :class="isAnnual ? 'bg-[#3559ff] text-white' : 'text-slate-300'"
                @click="isAnnual = true"
              >
                {{ t('pricing.toggle.annual') }}
              </button>
            </div>
          </div>

          <MarketingVisualFrame tone="cobalt">
            <div class="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
              <div class="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5">
                <p class="marketing-label">{{ t('pricing.page.includedTitle') }}</p>
                <div class="mt-4 space-y-3 text-sm text-slate-200">
                  <div class="pricing-rail-row">
                    <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
                    {{ t('pricing.page.includedCheckout') }}
                  </div>
                  <div class="pricing-rail-row">
                    <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
                    {{ t('pricing.page.includedDelivery') }}
                  </div>
                  <div class="pricing-rail-row">
                    <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
                    {{ t('pricing.page.includedSupport') }}
                  </div>
                </div>
              </div>

              <div class="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(53,89,255,0.2),rgba(255,255,255,0.03))] p-5">
                <p class="marketing-label">{{ t('pricing.page.growthLabel') }}</p>
                <p class="mt-3 text-2xl font-display font-semibold tracking-[-0.04em] text-white">
                  {{ t('pricing.page.growthTitle') }}
                </p>
                <p class="mt-3 text-sm leading-7 text-slate-300">
                  {{ t('pricing.page.growthBody') }}
                </p>
              </div>
            </div>
          </MarketingVisualFrame>
        </div>
      </div>
    </section>

    <MarketingSection width="wide">
      <div class="grid gap-5 xl:grid-cols-[1fr_1fr_1fr_0.92fr]">
        <article
          v-for="plan in plans"
          :key="plan.code"
          class="marketing-panel px-6 py-6"
          :class="plan.popular || plan.highlight ? 'border-[#3559ff]/55 bg-[linear-gradient(180deg,rgba(53,89,255,0.18),rgba(255,255,255,0.04))]' : ''"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="marketing-label">
                {{ plan.name }}
              </p>
              <p class="mt-4 font-display text-5xl font-semibold tracking-[-0.06em] text-white">
                {{ plan.price }}
              </p>
              <p class="mt-1 text-sm text-slate-400">
                {{ plan.currency }} {{ plan.period }}
              </p>
            </div>
            <span
              v-if="plan.popular || plan.highlight"
              class="rounded-full border border-[#3559ff]/30 bg-[#3559ff]/15 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#aebcff]"
            >
              {{ plan.popular ? t('pricing.badges.mostPopular') : t('pricing.badges.recommended') }}
            </span>
          </div>

          <p class="mt-4 min-h-[3.5rem] text-sm leading-7 text-slate-300">
            {{ plan.description }}
          </p>

          <div class="my-5 h-px bg-white/10" />

          <div class="space-y-3 text-sm text-slate-200">
            <div v-for="feature in plan.features" :key="feature" class="pricing-rail-row">
              <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
              {{ feature }}
            </div>
          </div>

          <button class="marketing-button mt-6 w-full justify-center" :class="plan.popular || plan.highlight ? 'marketing-button--primary' : 'marketing-button--ghost'">
            {{ plan.cta }}
          </button>
        </article>

        <aside class="marketing-panel px-6 py-6">
          <p class="marketing-label">{{ t('pricing.page.enterpriseLabel') }}</p>
          <h2 class="mt-4 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
            {{ t('pricing.page.enterpriseTitle') }}
          </h2>
          <p class="mt-4 text-sm leading-7 text-slate-300">
            {{ t('pricing.page.enterpriseBody') }}
          </p>

          <div class="mt-6 space-y-3 text-sm text-slate-200">
            <div class="pricing-rail-row">
              <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
              {{ t('pricing.page.enterpriseItems.setup') }}
            </div>
            <div class="pricing-rail-row">
              <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
              {{ t('pricing.page.enterpriseItems.ops') }}
            </div>
            <div class="pricing-rail-row">
              <Icon name="lucide:check" class="h-4 w-4 text-[#16d5b3]" />
              {{ t('pricing.page.enterpriseItems.guidance') }}
            </div>
          </div>

          <div class="mt-8 flex flex-col gap-3">
            <NuxtLink to="/contact" class="marketing-button marketing-button--primary justify-center">
              {{ t('marketing.footer.support.contact') }}
            </NuxtLink>
            <NuxtLink to="/register" class="marketing-button marketing-button--ghost justify-center">
              {{ t('marketing.actions.getStarted') }}
            </NuxtLink>
          </div>
        </aside>
      </div>
    </MarketingSection>
  </div>
</template>

<style scoped>
.pricing-rail-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}
</style>
