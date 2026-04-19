<template>
  <div class="h-[60vh] flex flex-col items-center justify-center">
    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 [border-color:var(--brand)] mb-4" />
    <h2 class="text-xl font-medium" style="color: var(--text-primary)">{{ t('admin.pages.products.create.title', 'Création du produit...') }}</h2>
    <p class="text-sm mt-2" style="color: var(--text-tertiary)">{{ t('admin.pages.products.create.subtitle', 'Préparation de l\'espace de travail...') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

const authStore = useAuthStore()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

onMounted(async () => {
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
  } catch (error) {
    console.error('Failed to create draft product:', error)
    router.replace('/admin/products')
  }
})
</script>
