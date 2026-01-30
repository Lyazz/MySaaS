<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { ref } from 'vue'

const authStore = useAuthStore()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

definePageMeta({
  middleware: 'saas-only',
  layout: 'marketing',
  title: 'Login - Swekly'
})

async function handleLogin() {
  loading.value = true
  errorMessage.value = ''
  
  try {
    const success = await authStore.login(email.value, password.value)
    if (success) {
      const nextPath = typeof route.query.next === 'string' ? route.query.next : '/admin'
      const safeNext = nextPath.startsWith('/') ? nextPath : '/admin'
      await navigateTo(safeNext)
    } else {
      errorMessage.value = 'Invalid email or password'
    }
  } catch (e) {
    errorMessage.value = 'An error occurred. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex bg-white font-sans">
    
    <!-- LEFT SIDE: Marketing / Visual (Hidden on mobile) -->
    <div class="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 text-white">
      <!-- Animated Background -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-[10%] left-[10%] w-[50%] h-[50%] bg-teal-600/20 rounded-full blur-[100px] animate-blob" />
        <div class="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] bg-violet-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000" />
        <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>



      <div class="relative z-10 max-w-lg">
        <h2 class="text-5xl font-bold tracking-tight mb-6 leading-tight">
          Welcome back, <br> <span class="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Builder</span>.
        </h2>
        <p class="text-lg text-slate-400 mb-8 leading-relaxed">
          Your dashboard is ready. Continue managing your orders, products, and analytics from one central hub.
        </p>

    <!-- Mini Feature Highlight -->
        <div class="flex items-start gap-4 p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
          <div class="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
             <Icon name="lucide:trending-up" class="w-6 h-6" />
          </div>
          <div>
            <h4 class="font-bold text-white mb-1">Revenue Tracking</h4>
            <p class="text-sm text-slate-400">Real-time insights into your store's performance at a glance.</p>
          </div>
        </div>
      </div>

      <div class="relative z-10 text-xs text-slate-500">
        © 2026 Swekly Inc.
      </div>
    </div>

    <!-- RIGHT SIDE: Form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative">
      <div class="max-w-md w-full space-y-8">
        
        <div class="text-center lg:text-left">

          <h2 class="text-3xl font-bold text-slate-900 tracking-tight">Log in to your account</h2>
          <p class="mt-2 text-slate-500">Access your tenant workspace.</p>
        </div>

        <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
          
          <!-- OAuth Buttons -->
          <div class="grid grid-cols-3 gap-3">
             <button type="button" class="flex items-center justify-center py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors bg-white">
                <Icon name="logos:google-icon" class="h-5 w-5" />
             </button>
             <button type="button" class="flex items-center justify-center py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors bg-white">
                <Icon name="logos:apple" class="h-5 w-5" />
             </button>
             <button type="button" class="flex items-center justify-center py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors bg-white">
                <Icon name="logos:facebook" class="h-5 w-5" />
             </button>
          </div>

          <div class="relative">
            <div class="absolute inset-0 flex items-center" aria-hidden="true">
              <div class="w-full border-t border-slate-200"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          <div class="space-y-5">
            <!-- Email -->
            <div>
              <label for="email-address" class="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input 
                id="email-address" 
                v-model="email" 
                name="email" 
                type="email" 
                autocomplete="email" 
                required 
                class="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all" 
                placeholder="name@company.com"
              >
            </div>

            <!-- Password -->
            <div>
              <div class="flex items-center justify-between mb-1">
                 <label for="password" class="block text-sm font-medium text-slate-700">Password</label>
                 <a href="#" class="text-sm font-medium text-teal-600 hover:text-teal-500">Forgot password?</a>
              </div>
              <input 
                id="password" 
                v-model="password" 
                name="password" 
                type="password" 
                autocomplete="current-password" 
                required 
                class="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all" 
                placeholder="••••••••"
              >
            </div>
          </div>

          <div v-if="errorMessage" class="rounded-lg bg-red-50 p-4 border border-red-100 flex items-center gap-3">
            <Icon name="lucide:alert-circle" class="w-5 h-5 text-red-500 flex-shrink-0" />
            <span class="text-sm text-red-700 font-medium">{{ errorMessage }}</span>
          </div>

          <div>
            <button 
              type="submit" 
              :disabled="loading"
              class="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-teal-500/30 hover:-translate-y-0.5"
            >
              <span v-if="loading" class="flex items-center gap-2">
                <Icon name="lucide:loader-2" class="animate-spin h-5 w-5 text-white" />
                Signing in...
              </span>
              <span v-else>Sign in</span>
            </button>
          </div>
          
          <div class="text-center text-sm text-slate-500">
            Don't have an account? <NuxtLink to="/register" class="font-medium text-teal-600 hover:text-teal-500 hover:underline">Start for free</NuxtLink>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-blob {
  animation: blob 10s infinite alternate;
}
.animation-delay-2000 {
  animation-delay: 2s;
}

@keyframes blob {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -20px) scale(1.1); }
  100% { transform: translate(-20px, 20px) scale(0.9); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
