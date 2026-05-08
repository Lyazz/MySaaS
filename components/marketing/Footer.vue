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

const trustSignals = computed(() => [
  { label: t('saasLanding.trust.secure'), icon: 'lucide:shield-check' },
  { label: t('saasLanding.trust.ssl'), icon: 'lucide:badge-check' },
  { label: t('saasLanding.trust.cloud'), icon: 'lucide:cloud' }
])
</script>

<template>
  <footer class="relative z-10 mt-12 border-t border-white/10">
    <div class="marketing-container max-w-[90rem] py-12 md:py-16">
      <div class="marketing-panel px-6 py-8 md:px-8">
        <div class="grid gap-10 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div>
            <p class="font-display text-2xl font-semibold tracking-[-0.04em] text-white">
              Swekly
            </p>

            <p class="mt-5 max-w-xl text-sm leading-7 text-slate-300">
              {{ t('marketing.footer.tagline') }}
            </p>

            <div class="mt-6 flex flex-wrap gap-2">
              <span
                v-for="signal in trustSignals"
                :key="signal.label"
                class="marketing-pill"
              >
                <Icon :name="signal.icon" class="h-3.5 w-3.5 text-[#84CC16]" />
                {{ signal.label }}
              </span>
            </div>
          </div>

          <div>
            <p class="marketing-label">
              {{ t('marketing.footer.product.title') }}
            </p>
            <div class="mt-4 space-y-3">
              <NuxtLink v-for="link in productLinks" :key="link.to" :to="link.to" class="marketing-link block">
                {{ link.label }}
              </NuxtLink>
            </div>
          </div>

          <div>
            <p class="marketing-label">
              {{ t('marketing.footer.support.title') }}
            </p>
            <div class="mt-4 space-y-3">
              <NuxtLink v-for="link in supportLinks" :key="link.to" :to="link.to" class="marketing-link block">
                {{ link.label }}
              </NuxtLink>
            </div>
          </div>
        </div>

        <div class="mt-8 border-t border-white/10 pt-6 text-sm text-slate-400">
          <p>
            {{ t('marketing.footer.copyright', { year: new Date().getFullYear() }) }}
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>
