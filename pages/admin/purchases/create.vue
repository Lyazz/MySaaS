<template>
  <div class="max-w-2xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex mb-6" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3 rtl:space-x-reverse">
        <li class="inline-flex items-center">
          <NuxtLink to="/admin/purchases" class="hover:[color:rgba(var(--brand-rgb)/0.85)] transition-colors text-secondary">
            {{ t('admin.nav.purchases') }}
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-tertiary" />
            <span class="ms-1 text-tertiary">{{ t('admin.pages.purchases.create.breadcrumb') }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Header -->
    <div class="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-primary">{{ t('admin.pages.purchases.create.title') }}</h2>
        <p class="mt-1 text-secondary">{{ t('admin.pages.purchases.create.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <NuxtLink
          to="/admin/purchases"
          class="ui-btn ui-btn--secondary text-sm"
        >
          {{ t('admin.common.cancel') }}
        </NuxtLink>
        <button
          type="button"
          :disabled="submitting || !form.supplierId"
          class="px-4 py-2 [background:var(--brand)] text-brand-contrast rounded-lg hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
          @click="handleSubmit"
        >
          <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
          {{ submitting ? t('admin.pages.purchases.create.creatingDraft') : t('admin.pages.purchases.create.submit') }}
        </button>
      </div>
    </div>

    <!-- Form -->
    <div class="rounded-lg p-6 space-y-6 surface-1 border border-line">
      <BaseSelect
        v-model="form.supplierId"
        :label="t('admin.pages.purchases.create.supplier.label')"
        :placeholder="t('admin.pages.purchases.create.supplier.placeholder')"
        required
      >
        <option value="">{{ t('admin.pages.purchases.create.supplier.placeholder') }}</option>
        <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
      </BaseSelect>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p class="text-sm text-blue-800">
          <Icon name="lucide:info" class="w-4 h-4 inline me-1" />
          {{ t('admin.pages.purchases.create.info') }}
        </p>
      </div>

      <div v-if="errorMessage" class="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm text-red-800">{{ errorMessage }}</p>
      </div>

      <div class="flex justify-end space-x-3 pt-4 border-t rtl:space-x-reverse">
        <NuxtLink
          to="/admin/purchases"
          class="ui-btn ui-btn--secondary text-sm"
        >
          {{ t('admin.common.cancel') }}
        </NuxtLink>
        <button
          type="button"
          :disabled="submitting || !form.supplierId"
          class="px-4 py-2 [background:var(--brand)] text-brand-contrast rounded-lg hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
          @click="handleSubmit"
        >
          <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
          {{ submitting ? t('admin.pages.purchases.create.creatingDraft') : t('admin.pages.purchases.create.submit') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseSelect from '~/components/ui/BaseSelect.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.purchases.create.metaTitle'
})

const authStore = useAuthStore()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const suppliers = ref<{ id: string; name: string }[]>([])
const form = reactive({
  supplierId: ''
})

const submitting = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  try {
    suppliers.value = await $fetch('/api/admin/suppliers', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } catch (e) {
    console.error('Failed to load suppliers', e)
    errorMessage.value = t('admin.pages.purchases.create.errors.suppliersLoadFailed')
  }
})

async function handleSubmit() {
  if (!form.supplierId) return

  submitting.value = true
  errorMessage.value = ''

  try {
    const created = (await $fetch('/api/admin/purchases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { supplierId: form.supplierId }
    })) as { id: string }
    
    router.push(`/admin/purchases/${created.id}`)
  } catch (error: any) {
    console.error('Failed to create purchase:', error)
    if (error.data?.statusMessage) {
      errorMessage.value = error.data.statusMessage
    } else {
      errorMessage.value = t('admin.pages.purchases.create.errors.createFailed')
    }
  } finally {
    submitting.value = false
  }
}
</script>
