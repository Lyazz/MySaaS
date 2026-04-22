<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

useSeoMeta({
  title: computed(() => `${t('marketing.nav.about')} - Swekly`),
  description: computed(() => t('marketing.aboutPage.heroSubtitle'))
})

const principles = computed(() => [
  {
    icon: 'lucide:workflow',
    title: t('marketing.aboutPage.principles.items.platform.title'),
    body: t('marketing.aboutPage.principles.items.platform.body')
  },
  {
    icon: 'lucide:shield',
    title: t('marketing.aboutPage.principles.items.tenancy.title'),
    body: t('marketing.aboutPage.principles.items.tenancy.body')
  },
  {
    icon: 'lucide:badge-dollar-sign',
    title: t('marketing.aboutPage.principles.items.cod.title'),
    body: t('marketing.aboutPage.principles.items.cod.body')
  },
  {
    icon: 'lucide:rocket',
    title: t('marketing.aboutPage.principles.items.ops.title'),
    body: t('marketing.aboutPage.principles.items.ops.body')
  }
])
</script>

<template>
  <div class="relative overflow-hidden pt-28 md:pt-32">
    <section class="marketing-section pb-10">
      <div class="marketing-container max-w-[90rem]">
        <div class="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div class="marketing-eyebrow">
              <Icon name="lucide:building-2" class="h-3.5 w-3.5 text-[#16d5b3]" />
              {{ t('marketing.nav.about') }}
            </div>
            <h1 class="mt-6 font-display text-5xl font-semibold tracking-[-0.06em] text-white md:text-6xl lg:text-7xl">
              {{ t('marketing.aboutPage.heroTitle') }}
            </h1>
            <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              {{ t('marketing.aboutPage.heroSubtitle') }}
            </p>
          </div>

          <MarketingVisualFrame tone="teal">
            <div class="grid gap-4 md:grid-cols-2">
              <div class="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5">
                <p class="marketing-label">{{ t('marketing.aboutPage.context.storyLabel') }}</p>
                <p class="mt-3 text-2xl font-display font-semibold tracking-[-0.04em] text-white">
                  {{ t('marketing.aboutPage.storyTitle') }}
                </p>
                <p class="mt-3 text-sm leading-7 text-slate-300">
                  {{ t('marketing.aboutPage.storyBody') }}
                </p>
              </div>
              <div class="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(22,213,179,0.15),rgba(255,255,255,0.03))] p-5">
                <p class="marketing-label">{{ t('marketing.aboutPage.context.label') }}</p>
                <div class="mt-4 space-y-3 text-sm text-slate-200">
                  <div class="about-chip">
                    <Icon name="lucide:smartphone" class="h-4 w-4 text-[#16d5b3]" />
                    {{ t('marketing.aboutPage.context.mobile') }}
                  </div>
                  <div class="about-chip">
                    <Icon name="lucide:truck" class="h-4 w-4 text-[#ffb38e]" />
                    {{ t('marketing.aboutPage.context.delivery') }}
                  </div>
                  <div class="about-chip">
                    <Icon name="lucide:badge-dollar-sign" class="h-4 w-4 text-[#8fa7ff]" />
                    {{ t('marketing.aboutPage.context.cod') }}
                  </div>
                </div>
              </div>
            </div>
          </MarketingVisualFrame>
        </div>
      </div>
    </section>

    <MarketingSection
      :eyebrow="t('marketing.aboutPage.principles.title')"
      :title="t('marketing.aboutPage.principles.title')"
      :description="t('marketing.aboutPage.principles.subtitle')"
      width="wide"
    >
      <div class="grid gap-5 md:grid-cols-2">
        <article
          v-for="item in principles"
          :key="item.title"
          class="marketing-panel px-6 py-6"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Icon :name="item.icon" class="h-5 w-5 text-[#8fa7ff]" />
          </div>
          <h2 class="mt-5 font-display text-2xl font-semibold tracking-[-0.04em] text-white">
            {{ item.title }}
          </h2>
          <p class="mt-3 text-sm leading-7 text-slate-300">
            {{ item.body }}
          </p>
        </article>
      </div>
    </MarketingSection>

    <section class="marketing-section pt-6">
      <div class="marketing-container max-w-5xl">
        <div class="marketing-panel px-6 py-8 text-center md:px-10">
          <p class="marketing-eyebrow">
            <Icon name="lucide:rocket" class="h-3.5 w-3.5 text-[#16d5b3]" />
            {{ t('marketing.aboutPage.final.title') }}
          </p>
          <p class="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            {{ t('marketing.aboutPage.final.subtitle') }}
          </p>
          <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <NuxtLink to="/register" class="marketing-button marketing-button--primary">
              {{ t('marketing.actions.getStarted') }}
            </NuxtLink>
            <NuxtLink to="/contact" class="marketing-button marketing-button--ghost">
              {{ t('marketing.footer.support.contact') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about-chip {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.8rem 0.9rem;
}
</style>
