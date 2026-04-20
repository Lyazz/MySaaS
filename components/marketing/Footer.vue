<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })
const route = useRoute()

const isRegisterRoute = computed(() => route.path.endsWith('/register'))

const trustSignals = computed(() => [
  { key: 'secure', icon: 'lucide:shield-check' },
  { key: 'ssl', icon: 'lucide:lock' },
  { key: 'cloud', icon: 'lucide:cloud' }
])

const productLinks = computed(() => [
  { label: t('marketing.nav.features'), to: '/features' },
  { label: t('marketing.nav.pricing'), to: '/pricing' },
  { label: t('marketing.nav.about'), to: '/about' }
])

const supportLinks = computed(() => [
  { label: t('marketing.footer.support.documentation'), href: '#' },
  { label: t('marketing.footer.support.apiStatus'), href: '#' },
  { label: t('marketing.footer.support.contact'), to: '/contact' }
])
</script>

<template>
  <footer class="relative mt-auto overflow-hidden border-t-2 border-[#0D1F1A] bg-[#F5EDD3] text-[#0D1F1A]">
    <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF7A45]/70 to-transparent" />
    <div class="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-[#1F9D8E]/15 blur-3xl" />
    <div class="pointer-events-none absolute -right-16 bottom-8 h-48 w-48 rounded-full bg-[#FF7A45]/15 blur-3xl" />

    <div class="relative mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 lg:px-8">
      <div
        v-if="!isRegisterRoute"
        class="mb-10 rounded-3xl border border-[#0D1F1A]/15 bg-[#FFF8E7]/85 p-6 shadow-[0_18px_40px_-28px_rgba(13,31,26,0.45)] backdrop-blur-md sm:p-8"
      >
        <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div class="max-w-2xl">
            <p class="mb-2 text-xs uppercase tracking-[0.28em] text-[#0D1F1A]/55">
              Swekly
            </p>
            <p class="text-lg font-semibold leading-relaxed text-[#0D1F1A]">
              {{ t('marketing.footer.tagline') }}
            </p>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row">
            <NuxtLink
              to="/register"
              class="inline-flex items-center justify-center rounded-xl bg-[#FF7A45] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#FF7A45]/30 transition-all hover:-translate-y-0.5 hover:bg-[#ff8a5d]"
            >
              {{ t('marketing.actions.getStarted') }}
            </NuxtLink>
            <NuxtLink
              :to="authStore.isAuthenticated ? '/admin' : '/login'"
              class="inline-flex items-center justify-center rounded-xl border border-[#0D1F1A]/25 px-5 py-3 text-sm font-semibold text-[#0D1F1A]/85 transition-colors hover:bg-[#0D1F1A]/5 hover:text-[#0D1F1A]"
            >
              {{ authStore.isAuthenticated ? t('marketing.actions.dashboard') : t('marketing.actions.login') }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-10 border-b border-[#0D1F1A]/12 pb-10 md:grid-cols-4">
        <div class="md:col-span-2">
          <NuxtLink
            to="/"
            class="mb-5 inline-flex items-center gap-3"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F9D8E] to-[#0f766e] text-white">
              <Icon
                name="lucide:store"
                class="h-4 w-4"
              />
            </div>
            <span class="text-2xl font-extrabold tracking-tight text-[#0D1F1A]">Swekly</span>
          </NuxtLink>
          <p
            v-if="!isRegisterRoute"
            class="max-w-md text-sm leading-relaxed text-[#0D1F1A]/65"
          >
            {{ t('marketing.footer.tagline') }}
          </p>
          <div class="mt-6 flex flex-wrap gap-2">
            <span
              v-for="signal in trustSignals"
              :key="signal.key"
              class="inline-flex items-center gap-2 rounded-full border border-[#0D1F1A]/15 bg-[#FFFDF4] px-3 py-1.5 text-xs font-semibold text-[#0D1F1A]/80"
            >
              <Icon
                :name="signal.icon"
                class="h-3.5 w-3.5 text-[#FF7A45]"
              />
              {{ t(`saasLanding.trust.${signal.key}`) }}
            </span>
          </div>
        </div>

        <div>
          <h3 class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#0D1F1A]/55">
            {{ t('marketing.footer.product.title') }}
          </h3>
          <ul class="space-y-3">
            <li
              v-for="link in productLinks"
              :key="link.label"
            >
              <NuxtLink
                v-if="link.to"
                :to="link.to"
                class="text-sm text-[#0D1F1A]/65 transition-colors hover:text-[#0D1F1A]"
              >
                {{ link.label }}
              </NuxtLink>
              <a
                v-else
                :href="link.href"
                class="text-sm text-[#0D1F1A]/65 transition-colors hover:text-[#0D1F1A]"
              >
                {{ link.label }}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#0D1F1A]/55">
            {{ t('marketing.footer.support.title') }}
          </h3>
          <ul class="space-y-3">
            <li
              v-for="link in supportLinks"
              :key="link.label"
            >
              <NuxtLink
                v-if="link.to"
                :to="link.to"
                class="text-sm text-[#0D1F1A]/65 transition-colors hover:text-[#0D1F1A]"
              >
                {{ link.label }}
              </NuxtLink>
              <a
                v-else
                :href="link.href"
                class="text-sm text-[#0D1F1A]/65 transition-colors hover:text-[#0D1F1A]"
              >
                {{ link.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-6 flex flex-col items-center justify-between gap-3 text-sm text-[#0D1F1A]/55 md:flex-row">
        <p>
          {{ t('marketing.footer.copyright', { year: new Date().getFullYear() }) }}
        </p>
        <div class="flex items-center gap-6">
          <NuxtLink
            to="/pricing"
            class="transition-colors hover:text-[#FF7A45]"
          >
            {{ t('marketing.nav.pricing') }}
          </NuxtLink>
          <NuxtLink
            to="/about"
            class="transition-colors hover:text-[#FF7A45]"
          >
            {{ t('marketing.nav.about') }}
          </NuxtLink>
          <NuxtLink
            to="/contact"
            class="transition-colors hover:text-[#FF7A45]"
          >
            {{ t('marketing.footer.support.contact') }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </footer>
</template>
