<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl mb-4 shadow-lg shadow-teal-600/20">
          <Icon name="lucide:shield-check" class="h-8 w-8 text-white" />
        </div>
        <h1 class="text-3xl font-bold text-slate-800 mb-2">
          Super Admin
        </h1>
        <p class="text-slate-500">
          Sign in to access the platform dashboard
        </p>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl p-8 shadow-xl shadow-slate-200/50">
        <!-- Error Alert -->
        <div
          v-if="error"
          class="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start space-x-3"
        >
          <Icon name="lucide:alert-circle" class="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p class="text-sm text-red-600">
            {{ error }}
          </p>
        </div>

        <form
          class="space-y-5"
          @submit.prevent="handleLogin"
        >
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
            <div class="relative">
              <input
                v-model="email"
                type="email"
                required
                class="w-full px-4 py-3 pl-10 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-sans"
                placeholder="superadmin@example.com"
              >
              <Icon name="lucide:mail" class="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <div class="relative">
              <input
                v-model="password"
                type="password"
                required
                class="w-full px-4 py-3 pl-10 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-sans"
                placeholder="••••••••"
              >
              <Icon name="lucide:lock" class="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 rounded-lg text-white font-bold tracking-wide transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
          >
            <Icon v-if="loading" name="lucide:loader-2" class="h-5 w-5 animate-spin" />
            <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
          </button>
        </form>

        <div class="mt-8 pt-6 border-t border-slate-100 text-center">
          <NuxtLink
            to="/"
            class="inline-flex items-center text-sm text-slate-500 hover:text-teal-600 font-medium transition-colors"
          >
            <Icon name="lucide:arrow-left" class="h-4 w-4 mr-1.5" />
            Back to main site
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false,
  middleware: 'saas-only'
})

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

// Redirect if already logged in as super admin
onMounted(() => {
  if (authStore.isAuthenticated && authStore.user?.isSuperAdmin) {
    router.push('/super-admin')
  }
})

const handleLogin = async () => {
  error.value = ''
  loading.value = true

  try {
    const response = await $fetch('/api/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value
      }
    })

    // Check if user is super admin
    if (!response.user?.isSuperAdmin) {
      error.value = 'Access denied: Super admin privileges required'
      return
    }

    authStore.setAuth(response.token, response.user, response.tenant)
    await router.push('/super-admin')
  } catch (err: any) {
    error.value = err.data?.statusMessage || err.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>
