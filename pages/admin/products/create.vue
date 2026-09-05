<template>
  <div class="min-h-[60vh] flex flex-col items-center justify-center px-4">
    <template v-if="creating">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 [border-color:var(--brand)] mb-4" />
      <h2 class="text-xl font-medium text-center text-primary">{{ t('admin.pages.products.create.title', 'Création du produit...') }}</h2>
      <p class="text-sm mt-2 text-center text-tertiary">{{ t('admin.pages.products.create.subtitle', 'Préparation de l\'espace de travail...') }}</p>
    </template>

    <div v-else class="w-full max-w-lg ui-card p-6 text-center">
      <Icon name="lucide:triangle-alert" class="w-10 h-10 mx-auto mb-3 text-red-500" />
      <h2 class="text-lg font-semibold text-primary">
        {{ t('admin.pages.products.create.errors.title', 'Unable to create draft product') }}
      </h2>
      <p class="text-sm mt-2 text-tertiary">
        {{ createErrorMessage }}
      </p>

      <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          class="ui-btn ui-btn--primary ui-btn--md"
          @click="createDraftProduct"
        >
          <Icon name="lucide:refresh-cw" class="w-4 h-4" />
          {{ t('admin.common.retry', 'Retry') }}
        </button>
        <NuxtLink to="/admin/products" class="ui-btn ui-btn--secondary ui-btn--md">
          {{ t('admin.common.back', 'Back') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import { extractApiErrorMessage } from '~/shared/http/error-message'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

const authStore = useAuthStore()
const router = useRouter()
const { showToast } = useToast()
const { t } = useI18n({ useScope: 'global' })
const creating = ref(true)
const createErrorMessage = ref('')

async function createDraftProduct() {
  if (!authStore.ensureSessionActive()) {
    await router.replace('/login')
    return
  }

  creating.value = true
  createErrorMessage.value = ''

  try {
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const payload = {
      title: 'Nouveau produit',
      slug: `nouveau-produit-${randomSuffix}`,
      price: 0,
      stock: 0,
      isActive: false
    }

    const created = await $fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: payload
    }) as any

    if (created?.id) {
      router.replace(`/admin/products/${created.id}?isNew=true`)
    } else {
      router.replace('/admin/products')
    }
  } catch (error: unknown) {
    console.error('Failed to create draft product:', error)
    const fallback = t('admin.pages.products.create.errors.createFailed', 'Draft creation failed. Please retry.')
    const message = extractApiErrorMessage(error, fallback)
    createErrorMessage.value = message
    showToast(message, 'error')
    creating.value = false
  }
}

onMounted(() => {
  void createDraftProduct()
})
</script>
