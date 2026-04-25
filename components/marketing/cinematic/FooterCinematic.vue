<script setup lang="ts">
import { computed } from 'vue'

const { t } = useI18n({ useScope: 'global' })

const productLinks = computed(() => [
  { label: t('marketing.nav.features'), to: '/features' },
  { label: t('marketing.nav.pricing'), to: '/pricing' },
  { label: t('marketing.nav.about'), to: '/about' }
])

const supportLinks = computed(() => [
  { label: t('marketing.footer.support.contact'), to: '/contact' }
])

const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="relative z-10 mt-12 border-t border-white/[0.06]">
    <div class="cinematic-container !max-w-[88rem] py-16 md:py-20">
      <div class="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-lime-neon">
              <span class="absolute inset-0 rounded-full bg-lime-neon/40 blur-md" />
              <Icon name="lucide:hexagon" class="relative h-3.5 w-3.5 text-[color:var(--m-bg)]" />
            </span>
            <span class="text-[17px] font-medium tracking-tight text-white">Swekly</span>
          </div>
          <p class="mt-5 max-w-md text-[15px] leading-relaxed text-[color:var(--m-text-dim)]">
            {{ t('marketing.footer.tagline') }}
          </p>
          <div class="mt-6 flex flex-wrap gap-2">
            <span class="cinematic-pill">
              <Icon name="lucide:shield-check" class="h-3 w-3 text-lime-neon" />
              {{ t('saasLanding.trust.secure') }}
            </span>
            <span class="cinematic-pill">
              <Icon name="lucide:cloud" class="h-3 w-3 text-lime-neon" />
              {{ t('saasLanding.trust.cloud') }}
            </span>
          </div>
        </div>

        <div>
          <p class="cinematic-eyebrow mb-5">{{ t('marketing.footer.product.title') }}</p>
          <div class="space-y-3">
            <NuxtLink v-for="link in productLinks" :key="link.to" :to="link.to" class="cinematic-link block text-sm">
              {{ link.label }}
            </NuxtLink>
          </div>
        </div>

        <div>
          <p class="cinematic-eyebrow mb-5">{{ t('marketing.footer.support.title') }}</p>
          <div class="space-y-3">
            <NuxtLink v-for="link in supportLinks" :key="link.to" :to="link.to" class="cinematic-link block text-sm">
              {{ link.label }}
            </NuxtLink>
            <NuxtLink to="/login" class="cinematic-link block text-sm">{{ t('marketing.actions.login') }}</NuxtLink>
            <NuxtLink to="/register" class="cinematic-link block text-sm">{{ t('marketing.actions.getStarted') }}</NuxtLink>
          </div>
        </div>

        <div>
          <p class="cinematic-eyebrow mb-5">{{ t('saasLanding.cinematic.footer.languages') }}</p>
          <LocaleSwitcher class="border-white/[0.08] bg-white/[0.02] text-[color:var(--m-text-dim)]" />
        </div>
      </div>

      <div class="my-12 cinematic-divider" />

      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p class="text-xs text-[color:var(--m-text-faint)] font-mono uppercase tracking-[0.18em]">
          © {{ currentYear }} Swekly — {{ t('marketing.footer.tagline') }}
        </p>
        <p class="text-xs text-[color:var(--m-text-faint)] font-mono uppercase tracking-[0.18em]">
          {{ t('saasLanding.cinematic.footer.madeFor') }}
        </p>
      </div>
    </div>
  </footer>
</template>
