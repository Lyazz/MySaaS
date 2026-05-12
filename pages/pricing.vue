<script setup lang="ts">
import { computed, ref } from 'vue'
import { PRICING_PLANS, buildDisplayPlan, YEARLY_DISCOUNT_PERCENT } from '~/shared/pricing/plans'

definePageMeta({
  layout: 'marketing'
})

const { t } = useI18n({ useScope: 'global' })

useSeoMeta({
  title: computed(() => t('pricing.seo.title')),
  description: computed(() => t('pricing.seo.description'))
})

const isAnnual = ref(false)

const plans = computed(() =>
  PRICING_PLANS.map((plan) => buildDisplayPlan(plan, isAnnual.value ? 'year' : 'month', t))
)
</script>

<template>
  <div class="pt-24 md:pt-32">
    <!-- ─── Hero ─── -->
    <section class="relative overflow-hidden pb-12">
      <div class="cinematic-grid-bg" />
      <div class="cinematic-container relative">
        <div class="mx-auto max-w-3xl text-center">
          <span class="cinematic-pill">
            <span class="cinematic-pill__dot" />
            {{ t('pricing.page.title') }}
          </span>
          <h1 class="cinematic-headline mt-6">
            {{ t('saasLanding.cinematic.pricing.titlePre') }}
            <em>{{ t('saasLanding.cinematic.pricing.titleAccent') }}</em>
            {{ t('saasLanding.cinematic.pricing.titlePost') }}
          </h1>
          <p class="cinematic-subhead mx-auto mt-5">{{ t('pricing.page.subtitle') }}</p>

          <div class="mt-9 inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02] p-1">
            <button
              class="rounded-full px-5 py-2 text-sm font-medium transition-all"
              :class="!isAnnual ? 'bg-lime-neon text-[color:var(--m-bg)]' : 'text-[color:var(--m-text-dim)] hover:text-white'"
              @click="isAnnual = false"
            >
              {{ t('pricing.toggle.monthly') }}
            </button>
            <button
              class="group rounded-full px-5 py-2 text-sm font-medium transition-all inline-flex items-center gap-2"
              :class="isAnnual ? 'bg-lime-neon text-[color:var(--m-bg)]' : 'text-[color:var(--m-text-dim)] hover:text-white'"
              @click="isAnnual = true"
            >
              {{ t('pricing.toggle.annual') }}
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
                :class="isAnnual ? 'bg-[color:var(--m-bg)]/15 text-[color:var(--m-bg)]' : 'bg-lime-neon/15 text-lime-neon'"
              >
                {{ t('pricing.toggle.save', { percent: YEARLY_DISCOUNT_PERCENT }) }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Plan grid ─── -->
    <section class="cinematic-section !pt-12">
      <div class="cinematic-container !max-w-[80rem]">
        <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MarketingCinematicPricingTile
            v-for="plan in plans"
            :id="plan.code"
            :key="plan.code"
            :name="plan.name"
            :price="plan.price"
            :currency="plan.currency"
            :period="plan.period"
            :description="plan.description"
            :features="plan.features"
            :cta="plan.cta"
            :cta-to="`/register?plan=${plan.code}`"
            :featured="plan.popular || plan.highlight"
            :popular-label="plan.popular ? t('pricing.badges.mostPopular') : t('pricing.badges.recommended')"
          />
        </div>

        <!-- Enterprise band -->
        <div class="mt-12 cinematic-card overflow-hidden p-8 md:p-10">
          <div class="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <span class="cinematic-eyebrow">{{ t('pricing.page.enterpriseLabel') }}</span>
              <h2 class="cinematic-headline mt-3 !text-3xl md:!text-4xl">
                {{ t('pricing.page.enterpriseTitle') }}
              </h2>
              <p class="cinematic-subhead mt-4">{{ t('pricing.page.enterpriseBody') }}</p>
              <div class="mt-6 space-y-2.5">
                <div v-for="line in [t('pricing.page.enterpriseItems.setup'), t('pricing.page.enterpriseItems.ops'), t('pricing.page.enterpriseItems.guidance')]" :key="line" class="flex items-start gap-2.5 text-sm text-white/85">
                  <Icon name="lucide:check" class="mt-0.5 h-4 w-4 flex-none text-lime-neon" />
                  <span>{{ line }}</span>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-3 md:items-end">
              <NuxtLink to="/contact" class="cinematic-button cinematic-button--primary">
                {{ t('marketing.footer.support.contact') }}
                <Icon name="lucide:arrow-right" class="h-4 w-4" />
              </NuxtLink>
              <NuxtLink to="/register" class="cinematic-button cinematic-button--ghost">
                {{ t('marketing.actions.getStarted') }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Final CTA ─── -->
    <MarketingCinematicCTABand
      :eyebrow="t('saasLanding.cinematic.cta.eyebrow')"
      :headline-pre="t('saasLanding.cinematic.cta.headlinePre')"
      :headline-accent="t('saasLanding.cinematic.cta.headlineAccent')"
      :headline-post="t('saasLanding.cinematic.cta.headlinePost')"
      :subhead="t('saasLanding.cinematic.cta.subhead')"
      :primary-cta="{ label: t('saasLanding.cinematic.cta.button'), to: '/register' }"
    />
  </div>
</template>
