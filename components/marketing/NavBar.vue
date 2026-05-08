<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const mobileMenuOpen = ref(false)
const isScrolled = ref(false)
const { t } = useI18n({ useScope: 'global' })

const navLinks = computed(() => [
  { name: t('marketing.nav.features'), to: '/features' },
  { name: t('marketing.nav.pricing'), to: '/pricing' },
  { name: t('marketing.nav.about'), to: '/about' },
  { name: t('marketing.footer.support.contact'), to: '/contact' }
])

const isActiveLink = (to: string) => route.path === to

const onScroll = () => {
  if (!process.client) return
  isScrolled.value = window.scrollY > 18
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false
  }
)

function handleLogout() {
  authStore.logout()
  mobileMenuOpen.value = false
}
</script>

<template>
  <nav
    class="fixed inset-x-0 top-0 z-50 transition-all duration-300"
    :class="isScrolled ? 'pt-3' : 'pt-0'"
  >
    <div class="marketing-container max-w-[90rem]">
      <div
        class="rounded-[1.35rem] border transition-all duration-300"
        :class="isScrolled ? 'border-white/12 bg-[#08101f]/82 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl' : 'border-transparent bg-transparent'"
      >
        <div class="flex h-20 items-center justify-between px-4 sm:px-6">
          <NuxtLink to="/" class="flex items-center">
            <p class="font-display text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">
              Swekly
            </p>
          </NuxtLink>

          <div class="hidden items-center gap-7 lg:flex">
            <NuxtLink
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              class="relative text-sm font-medium transition-colors duration-200"
              :class="isActiveLink(link.to) ? 'text-white' : 'text-slate-300 hover:text-white'"
            >
              {{ link.name }}
              <span
                class="pointer-events-none absolute -bottom-2 left-0 h-px bg-gradient-to-r from-[#3559ff] to-[#84CC16] transition-all duration-300"
                :class="isActiveLink(link.to) ? 'w-full opacity-100' : 'w-0 opacity-0'"
              />
            </NuxtLink>
          </div>

          <div class="hidden items-center gap-3 lg:flex">
            <LocaleSwitcher class="border-white/10 bg-white/5 text-white" />
            <template v-if="authStore.isAuthenticated">
              <NuxtLink to="/admin" class="marketing-button marketing-button--ghost">
                {{ t('marketing.actions.dashboard') }}
              </NuxtLink>
              <button class="marketing-button text-slate-300 hover:text-white" @click="handleLogout">
                {{ t('marketing.actions.logout') }}
              </button>
            </template>
            <template v-else>
              <NuxtLink to="/login" class="marketing-button text-slate-300 hover:text-white">
                {{ t('marketing.actions.login') }}
              </NuxtLink>
              <NuxtLink to="/register" class="marketing-button marketing-button--primary">
                {{ t('marketing.actions.getStarted') }}
              </NuxtLink>
            </template>
          </div>

          <div class="flex items-center gap-2 lg:hidden">
            <LocaleSwitcher class="border-white/10 bg-white/5 text-white" />
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/5 text-white"
              :aria-expanded="mobileMenuOpen"
              aria-label="Toggle navigation"
              @click="mobileMenuOpen = !mobileMenuOpen"
            >
              <Icon :name="mobileMenuOpen ? 'lucide:x' : 'lucide:menu'" class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div
        v-show="mobileMenuOpen"
        class="mt-3 rounded-[1.6rem] border border-white/12 bg-[#08101f]/92 p-4 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl lg:hidden"
      >
        <div class="space-y-2">
          <NuxtLink
            v-for="link in navLinks"
            :key="`mobile-${link.to}`"
            :to="link.to"
            class="block rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
            :class="isActiveLink(link.to) ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/6 hover:text-white'"
          >
            {{ link.name }}
          </NuxtLink>
        </div>

        <div class="my-4 h-px bg-white/10" />

        <div class="space-y-2">
          <template v-if="authStore.isAuthenticated">
            <NuxtLink to="/admin" class="marketing-button marketing-button--primary w-full">
              {{ t('marketing.actions.dashboard') }}
            </NuxtLink>
            <button class="marketing-button marketing-button--ghost w-full" @click="handleLogout">
              {{ t('marketing.actions.logout') }}
            </button>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="marketing-button marketing-button--ghost w-full">
              {{ t('marketing.actions.login') }}
            </NuxtLink>
            <NuxtLink to="/register" class="marketing-button marketing-button--primary w-full">
              {{ t('marketing.actions.getStarted') }}
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>
