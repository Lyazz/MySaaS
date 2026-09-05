<script setup lang="ts">
import { computed } from 'vue'
import { STORE_THEMES } from '~/shared/storefront/theme/catalogue'

definePageMeta({
  layout: 'marketing'
})

const { t } = useI18n({ useScope: 'global' })
const { public: { platformBaseDomain } } = useRuntimeConfig()
const requestUrl = useRequestURL()

/*
 * Demo stores are seeded with slug === theme key (scripts/seed-theme-demo-stores.mjs),
 * and storefronts resolve the tenant from the Host header. Locally that means
 * `{key}.localhost:3000`; in production `{key}.{platformBaseDomain}`.
 */
const isLocalHost = requestUrl.hostname === 'localhost' || requestUrl.hostname.endsWith('.localhost')
const demoStoreUrl = (key: string) => {
  if (isLocalHost) {
    const port = requestUrl.port ? `:${requestUrl.port}` : ''
    return `${requestUrl.protocol}//${key}.localhost${port}`
  }
  return `https://${key}.${platformBaseDomain}`
}

const optionKey = (key: string) => `admin.appearanceSettingsForm.templates.options.${key}`

const themes = computed(() => STORE_THEMES.map((theme) => ({
  ...theme,
  label: t(`${optionKey(theme.key)}.label`),
  description: t(`${optionKey(theme.key)}.description`),
  storeTypes: t(`${optionKey(theme.key)}.storeTypes`),
  demoUrl: demoStoreUrl(theme.key),
  /*
   * The address bar always shows the production host, even on localhost: it is
   * there to say "this is a real store", and `modern.localhost:3000` says the
   * opposite.
   */
  demoHost: `${theme.key}.${platformBaseDomain}`,
  shot: `/themes/${theme.key}.webp`
})))

/*
 * After `themes`, not before it. On the client `useSeoMeta` resolves its
 * computed inputs in a `watchEffect` that runs immediately, so a description
 * reading `themes.value` from above the declaration threw on the temporal dead
 * zone — which left unhead without an entry to dispose and put a
 * "Cannot read properties of undefined" in every visitor's console.
 */
useSeoMeta({
  title: computed(() => `${t('marketing.nav.templates')} — Swekly`),
  description: computed(() => t('marketing.templatesPage.hero.subtitle', { count: themes.value.length }))
})
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
            {{ t('marketing.templatesPage.hero.pill') }}
          </span>
          <h1 class="cinematic-headline mt-6">
            {{ t('marketing.templatesPage.hero.title.prefix') }}
            <em>{{ t('marketing.templatesPage.hero.title.accent') }}</em>
          </h1>
          <p class="cinematic-subhead mx-auto mt-5">
            {{ t('marketing.templatesPage.hero.subtitle', { count: themes.length }) }}
          </p>
          <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
            <NuxtLink
              to="/register"
              class="cinematic-button cinematic-button--primary"
            >
              {{ t('marketing.actions.getStarted') }}
              <Icon
                name="lucide:arrow-right"
                class="h-4 w-4"
              />
            </NuxtLink>
            <NuxtLink
              to="/pricing"
              class="cinematic-button cinematic-button--ghost"
            >
              {{ t('marketing.nav.pricing') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Theme grid ─── -->
    <section class="cinematic-section !pt-8">
      <div class="cinematic-container">
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="theme in themes"
            :key="theme.key"
            class="cinematic-card group flex flex-col p-0"
          >
            <div class="cinematic-card-glow" />

            <!--
              The theme's own demo storefront, photographed. Not a mock-up of
              one: this is the page behind "view the demo store" below.
            -->
            <MarketingThemeShot
              :src="theme.shot"
              :host="theme.demoHost"
              :alt="t('marketing.templatesPage.card.shotAlt', { name: theme.label })"
            />

            <!-- Meta -->
            <div class="flex flex-1 flex-col gap-3 border-t border-white/[0.06] p-5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-lg font-medium tracking-tight text-[color:var(--m-text)]">
                  {{ theme.label }}
                </h3>
                <span
                  class="flex items-center gap-1"
                  :aria-label="t('marketing.templatesPage.card.accent')"
                >
                  <span
                    v-for="swatch in theme.swatches"
                    :key="swatch"
                    class="h-3.5 w-3.5 rounded-full border border-white/20"
                    :style="{ background: swatch }"
                  />
                </span>
              </div>

              <p class="text-[13px] leading-snug text-[color:var(--m-text-dim)]">
                {{ theme.description }}
              </p>

              <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span class="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[color:var(--m-text-dim)]">
                  {{ t('admin.appearanceSettingsForm.templates.moods.' + theme.mood) }}
                </span>
                <span class="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[color:var(--m-text-dim)]">
                  {{ t('admin.appearanceSettingsForm.templates.voices.' + theme.voice) }}
                </span>
                <span class="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[color:var(--m-text-dim)]">
                  {{ theme.fontName }}
                </span>
              </div>

              <div class="mt-1 flex items-start gap-1.5 text-[12px] text-[color:var(--m-text-faint)]">
                <Icon
                  name="lucide:store"
                  class="mt-0.5 h-3.5 w-3.5 flex-none"
                />
                <span>{{ t('admin.appearanceSettingsForm.templates.bestFor') }} · {{ theme.storeTypes }}</span>
              </div>

              <div class="mt-auto flex items-center justify-end border-t border-white/[0.06] pt-3">
                <a
                  :href="theme.demoUrl"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1.5 text-[12px] font-medium text-[color:var(--m-accent)] transition-opacity hover:opacity-80"
                >
                  {{ t('marketing.templatesPage.card.viewDemo') }}
                  <Icon
                    name="lucide:external-link"
                    class="h-3.5 w-3.5"
                  />
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ─── Final CTA ─── -->
    <MarketingCinematicCTABand
      :eyebrow="t('marketing.templatesPage.cta.eyebrow')"
      :headline-pre="t('marketing.templatesPage.cta.headlinePre')"
      :headline-accent="t('marketing.templatesPage.cta.headlineAccent')"
      :headline-post="t('marketing.templatesPage.cta.headlinePost')"
      :primary-cta="{ label: t('marketing.templatesPage.cta.button'), to: '/register' }"
      :secondary-cta="{ label: t('marketing.footer.support.contact'), to: '/contact' }"
    />
  </div>
</template>
