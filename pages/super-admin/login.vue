<template>
  <div class="min-h-screen flex items-center justify-center p-4 font-sans" style="background: var(--admin-content-bg);">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl mb-4 shadow-lg shadow-teal-600/20">
          <Icon name="lucide:shield-check" class="h-8 w-8 text-white" />
        </div>
        <h1 class="text-3xl font-bold mb-2" style="color: var(--text-primary)">
          {{ t('superAdmin.login.title') }}
        </h1>
        <p style="color: var(--text-secondary)">
          {{ t('superAdmin.login.subtitle') }}
        </p>
      </div>

      <div class="rounded-xl p-8 shadow-xl" style="background: var(--surface-1); border: 1px solid var(--surface-border);">
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
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-secondary)">{{ t('superAdmin.login.form.email.label') }}</label>
            <div class="relative">
              <input
                v-model="email"
                type="email"
                required
                class="w-full px-4 py-3 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-sans"
                style="background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary);"
                :placeholder="t('superAdmin.login.form.email.placeholder')"
              >
              <Icon name="lucide:mail" class="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2" style="color: var(--text-tertiary)" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-secondary)">{{ t('superAdmin.login.form.password.label') }}</label>
            <div class="relative">
              <input
                v-model="password"
                type="password"
                required
                class="w-full px-4 py-3 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-sans"
                style="background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary);"
                placeholder="••••••••"
              >
              <Icon name="lucide:lock" class="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2" style="color: var(--text-tertiary)" />
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 rounded-lg text-white font-bold tracking-wide transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
          >
            <Icon v-if="loading" name="lucide:loader-2" class="h-5 w-5 animate-spin" />
            <span>{{ loading ? t('superAdmin.login.form.submit.signingIn') : t('superAdmin.login.form.submit.signIn') }}</span>
          </button>
        </form>

        <div class="mt-8 pt-6 text-center" style="border-top: 1px solid var(--surface-border);">
          <NuxtLink
            to="/"
            class="inline-flex items-center text-sm hover:text-teal-600 font-medium transition-colors"
            style="color: var(--text-secondary)"
          >
            <Icon name="lucide:arrow-left" class="h-4 w-4 mr-1.5" />
            {{ t('superAdmin.login.backToSite') }}
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
const { t } = useI18n({ useScope: 'global' })

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const previousTheme = ref<string | null>(null)

onMounted(() => {
  previousTheme.value = document.documentElement.dataset.theme || null
  document.documentElement.dataset.theme = 'dark'

  // Redirect if already logged in as super admin
  if (authStore.isAuthenticated && authStore.user?.isSuperAdmin) {
    router.push('/super-admin')
  }
})

onBeforeUnmount(() => {
  if (previousTheme.value) {
    document.documentElement.dataset.theme = previousTheme.value
    return
  }
  document.documentElement.removeAttribute('data-theme')
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
      error.value = t('superAdmin.login.errors.superAdminRequired')
      return
    }

    authStore.setAuth(response.token, response.user, response.tenant)
    await router.push('/super-admin')
  } catch (err: any) {
    error.value = err.data?.statusMessage || err.message || t('superAdmin.login.errors.loginFailed')
  } finally {
    loading.value = false
  }
}
</script>
