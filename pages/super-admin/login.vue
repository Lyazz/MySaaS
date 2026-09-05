<template>
  <div class="min-h-screen flex items-center justify-center p-4 font-sans bg-admin">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg bg-brand">
          <Icon name="lucide:shield-check" class="h-8 w-8 text-brand-contrast" />
        </div>
        <h1 class="text-3xl font-bold mb-2 text-primary">
          {{ t('superAdmin.login.title') }}
        </h1>
        <p class="text-secondary">
          {{ t('superAdmin.login.subtitle') }}
        </p>
      </div>

      <div class="rounded-xl p-8 shadow-xl surface-1 border border-line">
        <!-- Error Alert -->
        <div
          v-if="error"
          class="mb-6 p-4 rounded-lg flex items-start gap-3"
          style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2);"
        >
          <Icon name="lucide:alert-circle" class="h-5 w-5 flex-shrink-0 mt-0.5 text-danger" />
          <p class="text-sm text-danger">
            {{ error }}
          </p>
        </div>

        <form
          class="space-y-5"
          @submit.prevent="handleLogin"
        >
          <div>
            <label class="block text-sm font-medium mb-1.5 text-secondary">{{ t('superAdmin.login.form.email.label') }}</label>
            <div class="relative">
              <input
                v-model="email"
                type="email"
                required
                class="ui-input ps-10"
                :placeholder="t('superAdmin.login.form.email.placeholder')"
              >
              <Icon name="lucide:mail" class="h-5 w-5 absolute start-3 top-1/2 -translate-y-1/2 text-tertiary" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5 text-secondary">{{ t('superAdmin.login.form.password.label') }}</label>
            <div class="relative">
              <input
                v-model="password"
                type="password"
                required
                class="ui-input ps-10"
                placeholder="••••••••"
              >
              <Icon name="lucide:lock" class="h-5 w-5 absolute start-3 top-1/2 -translate-y-1/2 text-tertiary" />
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="ui-btn ui-btn--primary ui-btn--md w-full py-3 font-bold tracking-wide shadow-md"
          >
            <Icon v-if="loading" name="lucide:loader-2" class="h-5 w-5 animate-spin" />
            <span>{{ loading ? t('superAdmin.login.form.submit.signingIn') : t('superAdmin.login.form.submit.signIn') }}</span>
          </button>
        </form>

        <div class="mt-8 pt-6 text-center border-t border-line">
          <NuxtLink
 to="/"
 class="inline-flex items-center text-sm hover:text-lime-600 font-medium transition-colors text-secondary"
 
>
            <Icon name="lucide:arrow-left" class="h-4 w-4 me-1.5" />
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
