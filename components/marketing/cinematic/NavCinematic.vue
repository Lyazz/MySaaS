<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import SaaSLogo from '~/components/branding/SaaSLogo.vue'

const authStore = useAuthStore()
const route = useRoute()
const mobileMenuOpen = ref(false)
const isScrolled = ref(false)
const { t } = useI18n({ useScope: 'global' })

const navLinks = computed(() => [
  { name: t('marketing.nav.features'), to: '/features' },
  { name: t('marketing.nav.pricing'), to: '/pricing' },
  { name: t('marketing.footer.support.contact'), to: '/contact' }
])

const isActive = (to: string) => route.path === to

const onScroll = () => {
  if (typeof window === 'undefined') return
  isScrolled.value = window.scrollY > 12
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})

watch(() => route.fullPath, () => { mobileMenuOpen.value = false })

const handleLogout = () => {
  authStore.logout()
  mobileMenuOpen.value = false
}
</script>

<template>
  <nav class="fixed inset-x-0 top-0 z-50 transition-all duration-300">
    <div
      class="border-b transition-all duration-300"
      :class="isScrolled ? 'border-white/[0.06] bg-[#05070A]/85 backdrop-blur-xl' : 'border-transparent'"
    >
      <div class="cinematic-container !max-w-[88rem]">
        <div class="flex h-16 md:h-[72px] items-center justify-between">
          <NuxtLink to="/" class="group flex items-center gap-2.5">
            <SaaSLogo size="lg" class="shrink-0" />
          </NuxtLink>

          <div class="hidden items-center gap-1 lg:flex">
            <NuxtLink
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              class="relative px-4 py-2 text-sm transition-colors"
              :class="isActive(link.to) ? 'text-white' : 'text-[color:var(--m-text-dim)] hover:text-white'"
            >
              {{ link.name }}
              <span
                class="pointer-events-none absolute start-1/2 -bottom-0.5 h-px -translate-x-1/2 bg-lime-neon transition-all duration-300"
                :class="isActive(link.to) ? 'w-6 opacity-100' : 'w-0 opacity-0'"
              />
            </NuxtLink>
          </div>

          <div class="hidden items-center gap-2 lg:flex">
            <LocaleSwitcher class="border-white/[0.08] bg-white/[0.02] text-[color:var(--m-text-dim)]" />
            <template v-if="authStore.isAuthenticated">
              <NuxtLink to="/admin" class="cinematic-button cinematic-button--ghost !px-4 !py-2 !text-sm">
                {{ t('marketing.actions.dashboard') }}
              </NuxtLink>
              <button class="cinematic-button !px-3 !py-2 !text-sm text-[color:var(--m-text-dim)] hover:text-white" @click="handleLogout">
                {{ t('marketing.actions.logout') }}
              </button>
            </template>
            <template v-else>
              <NuxtLink to="/login" class="cinematic-button !px-4 !py-2 !text-sm text-[color:var(--m-text-dim)] hover:text-white">
                {{ t('marketing.actions.login') }}
              </NuxtLink>
              <NuxtLink to="/register" class="cinematic-button cinematic-button--primary !px-4 !py-2 !text-sm">
                {{ t('marketing.actions.getStarted') }}
                <Icon name="lucide:arrow-right" class="h-3.5 w-3.5" />
              </NuxtLink>
            </template>
          </div>

          <div class="flex items-center gap-2 lg:hidden">
            <LocaleSwitcher class="border-white/[0.08] bg-white/[0.02] text-[color:var(--m-text-dim)]" />
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-white"
              :aria-expanded="mobileMenuOpen"
              aria-label="Toggle navigation"
              @click="mobileMenuOpen = !mobileMenuOpen"
            >
              <Icon :name="mobileMenuOpen ? 'lucide:x' : 'lucide:menu'" class="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-show="mobileMenuOpen"
      class="cinematic-container !max-w-[88rem] lg:hidden"
    >
      <div class="mt-3 rounded-2xl border border-white/[0.08] bg-[#05070A]/95 p-4 backdrop-blur-xl">
        <div class="space-y-1">
          <NuxtLink
            v-for="link in navLinks"
            :key="`m-${link.to}`"
            :to="link.to"
            class="block rounded-xl px-4 py-3 text-sm transition-colors"
            :class="isActive(link.to) ? 'bg-white/[0.06] text-white' : 'text-[color:var(--m-text-dim)] hover:bg-white/[0.04] hover:text-white'"
          >
            {{ link.name }}
          </NuxtLink>
        </div>
        <div class="my-3 cinematic-divider" />
        <div class="space-y-2">
          <template v-if="authStore.isAuthenticated">
            <NuxtLink to="/admin" class="cinematic-button cinematic-button--primary w-full">
              {{ t('marketing.actions.dashboard') }}
            </NuxtLink>
            <button class="cinematic-button cinematic-button--ghost w-full" @click="handleLogout">
              {{ t('marketing.actions.logout') }}
            </button>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="cinematic-button cinematic-button--ghost w-full">
              {{ t('marketing.actions.login') }}
            </NuxtLink>
            <NuxtLink to="/register" class="cinematic-button cinematic-button--primary w-full">
              {{ t('marketing.actions.getStarted') }}
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>
