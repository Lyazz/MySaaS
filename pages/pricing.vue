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
    const monthly = pricingPlanCardForUi(plan, 'month')
    const annual = pricingPlanCardForUi(plan, 'year')

    return {
      code: plan.code,
      name: t(`pricing.plans.${plan.code}.name`),
      description: t(`pricing.plans.${plan.code}.description`),
      price: monthly.priceText,
      priceAnnual: annual.priceText,
      currency: monthly.currency,
      period: t('pricing.period.perMonth'),
      features: [{ text: t('pricing.features.ordersPerMonth', { count: plan.ordersPerMonth }), included: true }],
      cta: t(`pricing.plans.${plan.code}.cta`),
      popular: monthly.popular,
      highlight: monthly.highlight
    }
  })
})
</script>

<template>
  <div class="pricing-page min-h-screen font-sans pt-24 md:pt-28 pb-20">
    <section class="relative overflow-hidden px-4 pt-8 pb-14 text-center">
      <div class="pricing-page__blob pricing-page__blob--mint" />
      <div class="pricing-page__blob pricing-page__blob--orange" />

      <div class="relative z-10 mx-auto max-w-4xl">
        <p class="text-xs md:text-sm font-bold uppercase tracking-[0.24em] text-[#0D1F1A]/55 mb-5">
          Pricing
        </p>
        <h1 class="text-4xl md:text-6xl font-black tracking-tight leading-[0.95] text-[#0D1F1A] mb-6">
          {{ t('pricing.page.title') }}
        </h1>
        <p class="mx-auto max-w-2xl text-base md:text-lg leading-relaxed text-[#0D1F1A]/65 mb-10">
          {{ t('pricing.page.subtitle') }}
        </p>

        <div class="inline-flex items-center rounded-full border-2 border-[#0D1F1A] bg-[#FFFDF4] p-1.5 shadow-[3px_3px_0_#0D1F1A]">
          <button
            class="rounded-full px-6 py-2 text-sm font-bold transition-colors"
            :class="!isAnnual ? 'bg-[#0D1F1A] text-[#FFF8E7]' : 'text-[#0D1F1A]/65'"
            @click="isAnnual = false"
          >
            {{ t('pricing.toggle.monthly') }}
          </button>
          <button
            class="rounded-full px-6 py-2 text-sm font-bold transition-colors"
            :class="isAnnual ? 'bg-[#FF7A45] text-white' : 'text-[#0D1F1A]/65'"
            @click="isAnnual = true"
          >
            {{ t('pricing.toggle.annual') }}
          </button>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="(plan, idx) in plans"
          :key="idx"
          class="relative flex flex-col rounded-3xl border-2 border-[#0D1F1A] bg-[#FFFDF4] p-6 transition-all duration-300 hover:-translate-y-1"
          :class="plan.popular ? 'shadow-[7px_7px_0_#FF7A45]' : 'shadow-[5px_5px_0_#0D1F1A]'"
        >
          <div
            v-if="plan.popular"
            class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border-2 border-[#0D1F1A] bg-[#F4C04E] px-4 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#0D1F1A] whitespace-nowrap"
          >
            {{ t('pricing.badges.mostPopular') }}
          </div>

          <div
            v-if="plan.highlight"
            class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border-2 border-[#0D1F1A] bg-[#1F9D8E] px-4 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#FFF8E7] whitespace-nowrap"
          >
            {{ t('pricing.badges.recommended') }}
          </div>

          <div class="mb-6">
            <h3 class="mb-2 text-lg font-extrabold text-[#0D1F1A]">
              {{ plan.name }}
            </h3>
            <div class="mb-2 flex h-10 items-end gap-1">
              <span class="text-4xl font-black tracking-tight text-[#0D1F1A]">
                {{ isAnnual ? plan.priceAnnual : plan.price }}
              </span>
              <span class="ml-1 text-xs font-bold uppercase text-[#0D1F1A]/60">{{ plan.currency }}</span>
              <span class="text-xs text-[#0D1F1A]/45">{{ plan.period }}</span>
            </div>
            <p class="min-h-[40px] text-xs leading-relaxed text-[#0D1F1A]/65">
              {{ plan.description }}
            </p>
          </div>

          <div class="mb-6 h-px w-full bg-[#0D1F1A]/15" />

          <ul class="mb-8 flex-1 space-y-3">
            <li
              v-for="(feat, fIdx) in plan.features"
              :key="fIdx"
              class="flex items-start gap-3 text-xs"
            >
              <Icon
                v-if="feat.included"
                name="lucide:check"
                class="mt-0.5 h-4 w-4 shrink-0 text-[#1F9D8E]"
              />
              <Icon
                v-else
                name="lucide:x"
                class="mt-0.5 h-4 w-4 shrink-0 text-[#0D1F1A]/30"
              />
              <span :class="feat.included ? 'text-[#0D1F1A]/75' : 'text-[#0D1F1A]/35 line-through'">
                {{ feat.text }}
              </span>
            </li>
          </ul>

          <button
            class="w-full rounded-xl border-2 border-[#0D1F1A] py-3 text-sm font-bold transition-transform active:scale-[0.98]"
            :class="plan.popular || plan.highlight ? 'bg-[#0D1F1A] text-[#FFF8E7]' : 'bg-[#FFF8E7] text-[#0D1F1A]'"
          >
            {{ plan.cta }}
          </button>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pricing-page {
  background: #FFF8E7;
  color: #0D1F1A;
}

.pricing-page__blob {
  pointer-events: none;
  position: absolute;
  border-radius: 999px;
  filter: blur(80px);
  opacity: 0.35;
}

.pricing-page__blob--mint {
  width: 340px;
  height: 340px;
  top: -120px;
  left: -90px;
  background: #1F9D8E;
}

.pricing-page__blob--orange {
  width: 340px;
  height: 340px;
  top: -80px;
  right: -100px;
  background: #FF7A45;
}
</style>
