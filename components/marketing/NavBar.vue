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
  { name: t('marketing.nav.about'), to: '/about' }
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
    class="fixed inset-x-0 top-0 z-50 border-b border-[#E6D8B8] bg-[#FFF8E7] transition-all duration-300"
    :class="isScrolled ? 'pt-2 shadow-lg shadow-[#DCCFB0]/70' : 'pt-0'"
  >
    <div
      class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div
        class="flex items-center justify-between px-2 transition-all duration-300 md:px-0"
        :class="isScrolled ? 'h-16' : 'h-20'"
      >
        <NuxtLink
          to="/"
          class="group flex items-center gap-3"
        >
          <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FF7A45]/35 bg-gradient-to-br from-[#FF7A45] to-[#FF9A66] text-white shadow-lg shadow-[#FF7A45]/30 transition-transform group-hover:scale-105">
            <Icon
              name="lucide:store"
              class="h-5 w-5"
            />
          </div>
          <div class="leading-tight">
            <p class="text-lg font-extrabold tracking-tight text-[#0D1F1A]">
              Swekly
            </p>
          </div>
        </NuxtLink>

        <div class="hidden items-center gap-7 md:flex">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.name"
            :to="link.to"
            class="relative text-sm font-semibold transition-colors duration-200"
            :class="isActiveLink(link.to) ? 'text-[#0D1F1A]' : 'text-[#0D1F1A]/70 hover:text-[#0D1F1A]'"
          >
            {{ link.name }}
            <span
              class="pointer-events-none absolute -bottom-2 start-0 h-px bg-amber-300 transition-all duration-300"
              :class="isActiveLink(link.to) ? 'w-full opacity-100' : 'w-0 opacity-0'"
            />
          </NuxtLink>

          <LocaleSwitcher class="border-[#D8C9A8] bg-[#FFF3DB] text-[#0D1F1A]" />

          <div class="h-6 w-px bg-[#0D1F1A]/15" />

          <div class="flex items-center gap-3">
            <template v-if="authStore.isAuthenticated">
              <NuxtLink
                to="/admin"
                class="rounded-xl border border-[#0D1F1A]/20 px-4 py-2 text-sm font-semibold text-[#0D1F1A] transition-colors hover:bg-[#0D1F1A]/5"
              >
                {{ t('marketing.actions.dashboard') }}
              </NuxtLink>
              <button
                class="text-sm font-medium text-[#0D1F1A]/65 transition-colors hover:text-[#0D1F1A]"
                @click="handleLogout"
              >
                {{ t('marketing.actions.logout') }}
              </button>
            </template>
            <template v-else>
              <NuxtLink
                to="/login"
                class="text-sm font-semibold text-[#0D1F1A]/75 transition-colors hover:text-[#0D1F1A]"
              >
                {{ t('marketing.actions.login') }}
              </NuxtLink>
              <NuxtLink
                to="/register"
                class="rounded-xl bg-[#FF7A45] px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-[#FF7A45]/30 transition-all hover:-translate-y-0.5 hover:bg-[#ff8a5d]"
              >
                {{ t('marketing.actions.getStarted') }}
              </NuxtLink>
            </template>
          </div>
        </div>

        <button
          class="inline-flex items-center justify-center rounded-lg p-2 text-[#0D1F1A] md:hidden"
          type="button"
          :aria-expanded="mobileMenuOpen"
          aria-label="Toggle menu"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <Icon
            v-if="!mobileMenuOpen"
            name="lucide:menu"
            class="h-6 w-6"
          />
          <Icon
            v-else
            name="lucide:x"
            class="h-6 w-6"
          />
        </button>
      </div>
    </div>

    <div
      v-show="mobileMenuOpen"
      class="mx-4 mt-2 rounded-2xl border border-[#E6D8B8] bg-[#FFF3DB] p-4 shadow-xl shadow-[#DCCFB0]/60 md:hidden"
    >
      <div class="space-y-2">
        <NuxtLink
          v-for="link in navLinks"
          :key="`mobile-${link.name}`"
          :to="link.to"
          class="block rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
          :class="isActiveLink(link.to) ? 'bg-[#0D1F1A]/8 text-[#0D1F1A]' : 'text-[#0D1F1A]/75 hover:bg-[#0D1F1A]/6 hover:text-[#0D1F1A]'"
        >
          {{ link.name }}
        </NuxtLink>
      </div>

      <div class="my-4 h-px bg-[#0D1F1A]/10" />

      <div class="mb-4 flex justify-center">
        <LocaleSwitcher class="border-[#D8C9A8] bg-[#FFF8E7] text-[#0D1F1A]" />
      </div>

      <div class="space-y-2">
        <template v-if="authStore.isAuthenticated">
          <NuxtLink
            to="/admin"
            class="block w-full rounded-xl bg-[#FF7A45] px-4 py-3 text-center text-sm font-bold text-white"
          >
            {{ t('marketing.actions.dashboard') }}
          </NuxtLink>
          <button
            class="block w-full rounded-xl border border-[#0D1F1A]/20 px-4 py-3 text-sm font-medium text-[#0D1F1A]/70 transition-colors hover:text-[#0D1F1A]"
            @click="handleLogout"
          >
            {{ t('marketing.actions.logout') }}
          </button>
        </template>
        <template v-else>
          <NuxtLink
            to="/login"
            class="block w-full rounded-xl border border-[#0D1F1A]/20 px-4 py-3 text-center text-sm font-semibold text-[#0D1F1A]/80"
          >
            {{ t('marketing.actions.login') }}
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="block w-full rounded-xl bg-[#FF7A45] px-4 py-3 text-center text-sm font-extrabold text-white"
          >
            {{ t('marketing.actions.getStarted') }}
          </NuxtLink>
        </template>
      </div>
    </div>
  </nav>
</template>
