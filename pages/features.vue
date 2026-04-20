<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

definePageMeta({
  layout: 'marketing',
  title: 'Features - Swekly'
})

const features = computed(() => [
  {
    title: t('marketing.featuresPage.items.builder.title'),
    description: t('marketing.featuresPage.items.builder.description'),
    icon: 'lucide:layout-template',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3',
    colSpan: 'lg:col-span-2 row-span-2',
    color: 'teal'
  },
  {
    title: t('marketing.featuresPage.items.payments.title'),
    description: t('marketing.featuresPage.items.payments.description'),
    icon: 'lucide:credit-card',
    colSpan: 'lg:col-span-1',
    color: 'emerald'
  },
  {
    title: t('marketing.featuresPage.items.analytics.title'),
    description: t('marketing.featuresPage.items.analytics.description'),
    icon: 'lucide:bar-chart-3',
    colSpan: 'lg:col-span-1',
    color: 'amber'
  },
  {
    title: t('marketing.featuresPage.items.automation.title'),
    description: t('marketing.featuresPage.items.automation.description'),
    icon: 'lucide:mail',
    colSpan: 'lg:col-span-1',
    color: 'violet'
  },
  {
    title: t('marketing.featuresPage.items.logistics.title'),
    description: t('marketing.featuresPage.items.logistics.description'),
    icon: 'lucide:truck',
    colSpan: 'lg:col-span-2',
    color: 'blue'
  },
  {
    title: t('marketing.featuresPage.items.domains.title'),
    description: t('marketing.featuresPage.items.domains.description'),
    icon: 'lucide:globe',
    colSpan: 'lg:col-span-1',
    color: 'rose'
  }
])
</script>

<template>
  <div class="feature-page min-h-screen font-sans pt-24 md:pt-28 pb-20">
    <section class="relative overflow-hidden px-4 pt-8 pb-14">
      <div class="feature-page__blob feature-page__blob--mint" />
      <div class="feature-page__blob feature-page__blob--orange" />

      <div class="relative z-10 mx-auto max-w-4xl text-center">
        <p class="text-xs md:text-sm font-bold uppercase tracking-[0.24em] text-[#0D1F1A]/55 mb-5">
          Swekly
        </p>
        <h1 class="text-4xl md:text-6xl font-black tracking-tight leading-[0.95] text-[#0D1F1A] mb-6">
          {{ t('marketing.featuresPage.hero.title.prefix') }}
          <span class="feature-page__accent">
            {{ t('marketing.featuresPage.hero.title.accent') }}
          </span>
        </h1>
        <p class="mx-auto max-w-2xl text-base md:text-lg leading-relaxed text-[#0D1F1A]/65">
          {{ t('marketing.featuresPage.hero.subtitle') }}
        </p>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-[minmax(280px,auto)]">
        <article
          v-for="(feat, idx) in features"
          :key="idx"
          class="group relative overflow-hidden rounded-3xl border-2 border-[#0D1F1A] bg-[#FFFDF4] p-7 transition-all duration-300 hover:-translate-y-1"
          :class="feat.colSpan"
        >
          <div class="feature-page__card-shadow" />
          <div class="relative z-10 flex h-full flex-col">
            <div
              class="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#0D1F1A] text-white shadow-[3px_3px_0_#0D1F1A]"
              :class="{
                'bg-[#1F9D8E]': feat.color === 'teal' || feat.color === 'emerald',
                'bg-[#FF7A45]': feat.color === 'amber' || feat.color === 'rose',
                'bg-[#0D1F1A]': feat.color === 'violet' || feat.color === 'blue'
              }"
            >
              <Icon :name="feat.icon" class="w-5 h-5" />
            </div>

            <h3 class="text-2xl font-extrabold tracking-tight text-[#0D1F1A] mb-3">
              {{ feat.title }}
            </h3>
            <p class="leading-relaxed text-[#0D1F1A]/65 max-w-md">
              {{ feat.description }}
            </p>

            <div class="flex-1" />

            <div
              v-if="feat.image"
              class="mt-8 overflow-hidden rounded-2xl border-2 border-[#0D1F1A] shadow-[4px_4px_0_#0D1F1A]"
            >
              <img
                :src="feat.image"
                :alt="feat.title"
                class="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105"
              >
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="pt-20 text-center px-4">
      <div class="mx-auto max-w-2xl rounded-3xl border-2 border-[#0D1F1A] bg-[#FFF1DC] px-8 py-12 text-[#0D1F1A] shadow-[8px_8px_0_#FF7A45]">
        <h2 class="text-3xl font-black tracking-tight mb-6">
          {{ t('marketing.featuresPage.cta.title') }}
        </h2>
        <NuxtLink
          to="/register"
          class="inline-flex items-center gap-2 rounded-full border-2 border-[#FF7A45] bg-[#FF7A45] px-8 py-3 font-bold text-white transition-all hover:-translate-y-0.5 hover:border-[#ff8a5d] hover:bg-[#ff8a5d]"
        >
          {{ t('marketing.featuresPage.cta.button') }}
          <Icon name="lucide:arrow-right" class="w-4 h-4" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.feature-page {
  background: #FFF8E7;
  color: #0D1F1A;
}

.feature-page__accent {
  color: #FF7A45;
  position: relative;
  display: inline-block;
}

.feature-page__accent::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -0.22em;
  width: 100%;
  height: 0.2em;
  background: rgba(244, 192, 78, 0.9);
  border-radius: 999px;
  z-index: -1;
}

.feature-page__blob {
  pointer-events: none;
  position: absolute;
  border-radius: 999px;
  filter: blur(80px);
  opacity: 0.35;
}

.feature-page__blob--mint {
  width: 320px;
  height: 320px;
  top: -120px;
  left: -80px;
  background: #1F9D8E;
}

.feature-page__blob--orange {
  width: 320px;
  height: 320px;
  top: -60px;
  right: -100px;
  background: #FF7A45;
}

.feature-page__card-shadow {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(31, 157, 142, 0.08), rgba(255, 122, 69, 0.08));
  opacity: 0;
  transition: opacity 0.25s ease;
}

.group:hover .feature-page__card-shadow {
  opacity: 1;
}
</style>
