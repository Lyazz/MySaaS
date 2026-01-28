<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const mobileMenuOpen = ref(false)

const navLinks = [
  { name: 'Features', to: '/features' },
  { name: 'Pricing', to: '/pricing' },
  { name: 'About', to: '/about' }
]

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
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span class="text-xl font-bold text-white tracking-tight">MySaaS</span>
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

          <!-- Auth Actions -->
          <div class="flex items-center gap-4">
            <template v-if="authStore.isAuthenticated">
              <NuxtLink to="/admin" class="text-sm font-bold text-white hover:text-indigo-400 transition-colors">
                Dashboard
              </NuxtLink>
              <button @click="handleLogout" class="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                Logout
              </button>
            </template>
            <template v-else>
              <NuxtLink to="/login" class="text-sm font-bold text-slate-300 hover:text-white transition-colors">
                Log in
              </NuxtLink>
              <NuxtLink 
                to="/register" 
                class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
              >
                Get Started
              </NuxtLink>
            </template>
          </div>
        </div>

        <!-- Mobile Menu Button -->
        <div class="md:hidden flex items-center">
          <button @click="mobileMenuOpen = !mobileMenuOpen" class="text-slate-300 hover:text-white p-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
          <template v-if="authStore.isAuthenticated">
             <NuxtLink to="/admin" class="block text-center w-full py-3 rounded-xl bg-indigo-600 text-white font-bold">Dashboard</NuxtLink>
             <button @click="handleLogout" class="block text-center w-full py-3 text-slate-400 hover:text-white">Logout</button>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="block text-center w-full py-3 text-slate-300 font-bold border border-white/10 rounded-xl hover:bg-slate-800">Log in</NuxtLink>
            <NuxtLink to="/register" class="block text-center w-full py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg">Get Started</NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>
