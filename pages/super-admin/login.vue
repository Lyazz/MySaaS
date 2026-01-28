<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-white mb-2">
          Super Admin Login
        </h1>
        <p class="text-gray-400">
          Sign in to access the platform dashboard
        </p>
      </div>

      <div class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
        <div
          v-if="error"
          class="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm"
        >
          {{ error }}
        </div>

        <form
          class="space-y-4"
          @submit.prevent="handleLogin"
        >
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="superadmin@example.com"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input
              v-model="password"
              type="password"
              required
              class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
            >
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="mt-6 pt-6 border-t border-slate-700 text-center">
          <NuxtLink
            to="/"
            class="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            ← Back to main site
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
