<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const mobileMenuOpen = ref(false)
const { t } = useI18n({ useScope: 'global' })

const navLinks = computed(() => [
  { name: t('marketing.nav.features'), to: '/features' },
  { name: t('marketing.nav.pricing'), to: '/pricing' },
  { name: t('marketing.nav.about'), to: '/about' }
])

function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <nav class="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-md transition-all duration-300">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-20">
        
        <!-- Logo -->
        <div class="flex-shrink-0 flex items-center gap-3">
          <NuxtLink to="/" class="group flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Icon name="lucide:zap" class="w-6 h-6" />
            </div>
            <span class="text-xl font-bold text-white tracking-tight">Swekly</span>
          </NuxtLink>
        </div>

        <!-- Desktop Nav -->
        <div class="hidden md:flex items-center space-x-8">
          <NuxtLink 
            v-for="link in navLinks" 
            :key="link.name" 
            :to="link.to"
            class="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            {{ link.name }}
          </NuxtLink>

          <!-- Divider -->
          <div class="h-6 w-px bg-white/10"></div>

          <LocaleSwitcher class="border-white/10 bg-slate-900/40" />

          <!-- Auth Actions -->
          <div class="flex items-center gap-4">
            <template v-if="authStore.isAuthenticated">
              <NuxtLink to="/admin" class="text-sm font-bold text-white hover:text-teal-400 transition-colors">
                {{ t('marketing.actions.dashboard') }}
              </NuxtLink>
              <button @click="handleLogout" class="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                {{ t('marketing.actions.logout') }}
              </button>
            </template>
            <template v-else>
              <NuxtLink to="/login" class="text-sm font-bold text-slate-300 hover:text-white transition-colors">
                {{ t('marketing.actions.login') }}
              </NuxtLink>
              <NuxtLink 
                to="/register" 
                class="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-0.5"
              >
                {{ t('marketing.actions.getStarted') }}
              </NuxtLink>
            </template>
          </div>
        </div>

        <!-- Mobile Menu Button -->
        <div class="md:hidden flex items-center">
          <button @click="mobileMenuOpen = !mobileMenuOpen" class="text-slate-300 hover:text-white p-2">
             <Icon v-if="!mobileMenuOpen" name="lucide:menu" class="w-6 h-6" />
             <Icon v-else name="lucide:x" class="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-show="mobileMenuOpen" class="md:hidden border-t border-white/10 bg-slate-900 absolute w-full">
      <div class="px-4 pt-2 pb-6 space-y-1">
        <NuxtLink 
          v-for="link in navLinks" 
          :key="link.name" 
          :to="link.to"
          class="block px-3 py-3 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
          @click="mobileMenuOpen = false"
        >
          {{ link.name }}
        </NuxtLink>
        
        <div class="mt-6 pt-6 border-t border-white/10 flex flex-col gap-4 px-3">
          <div class="flex justify-center">
            <LocaleSwitcher class="border-white/10 bg-slate-900/40" />
          </div>
          <template v-if="authStore.isAuthenticated">
             <NuxtLink to="/admin" class="block text-center w-full py-3 rounded-xl bg-teal-600 text-white font-bold">
               {{ t('marketing.actions.dashboard') }}
             </NuxtLink>
             <button @click="handleLogout" class="block text-center w-full py-3 text-slate-400 hover:text-white">
               {{ t('marketing.actions.logout') }}
             </button>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="block text-center w-full py-3 text-slate-300 font-bold border border-white/10 rounded-xl hover:bg-slate-800">
              {{ t('marketing.actions.login') }}
            </NuxtLink>
            <NuxtLink to="/register" class="block text-center w-full py-3 rounded-xl bg-teal-600 text-white font-bold shadow-lg">
              {{ t('marketing.actions.getStarted') }}
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>
