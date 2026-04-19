<template>
  <div class="max-w-7xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex mb-6" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/admin/customers" class="hover:[color:var(--brand)]" style="color: var(--text-secondary)">
            {{ t('admin.nav.customers') }}
          </NuxtLink>
        </li>
        <li>
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6" style="color: var(--text-tertiary)" />
            <NuxtLink :to="`/admin/customers/${customerId}`" class="ml-1 hover:[color:var(--brand)]" style="color: var(--text-secondary)">
              {{ t('admin.pages.customers.edit.breadcrumbCustomer') }}
            </NuxtLink>
          </div>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6" style="color: var(--text-tertiary)" />
            <span class="ml-1" style="color: var(--text-tertiary)">{{ t('admin.pages.customers.edit.breadcrumb') }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Header -->
    <div class="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold" style="color: var(--text-primary)">{{ t('admin.pages.customers.edit.title') }}</h2>
        <p class="mt-1" style="color: var(--text-secondary)">{{ t('admin.pages.customers.edit.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <NuxtLink
          :to="`/admin/customers/${customerId}`"
          class="px-4 py-2 rounded-md text-sm font-medium" style="border: 1px solid var(--surface-border); color: var(--text-secondary); background: var(--surface-1)"
        >
          {{ t('admin.common.cancel') }}
        </NuxtLink>
        <button
          form="customer-edit-form"
          type="submit"
          :disabled="submitting || loading"
          class="px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
        >
          <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
          {{ submitting ? t('admin.common.saving') : t('admin.common.saveChanges') }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="ui-card p-12 text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 [border-color:var(--brand)]"></div>
      <p class="mt-2" style="color: var(--text-secondary)">{{ t('admin.pages.customers.edit.loading') }}</p>
    </div>

    <!-- Form -->
    <form v-else id="customer-edit-form" class="ui-card p-6 space-y-6" @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BaseInput
          v-model="form.name"
          :label="t('admin.forms.customer.name.label')"
          :error="errors.name"
          :placeholder="t('admin.forms.customer.name.placeholder')"
          required
        />

        <BaseInput
          v-model="form.phone"
          :label="t('admin.forms.customer.phone.label')"
          :error="errors.phone"
          :placeholder="t('admin.forms.customer.phone.placeholder')"
          required
        />

        <BaseInput
          v-model="form.email"
          :label="t('admin.forms.customer.email.label')"
          type="email"
          :error="errors.email"
          :placeholder="t('admin.forms.customer.email.placeholder')"
        />

        <BaseInput
          v-model="form.address"
          :label="t('admin.forms.customer.address.label')"
          :error="errors.address"
          :placeholder="t('admin.forms.customer.address.placeholder')"
        />

        <BaseInput
          v-model="form.openingBalance"
          :label="t('admin.forms.customer.openingBalance.label')"
          type="number"
          :hint="t('admin.forms.customer.openingBalance.hint')"
          disabled
        />
      </div>

      <div v-if="errorMessage" class="p-4 bg-red-50 border border-red-200 rounded-md">
        <p class="text-sm text-red-800">{{ errorMessage }}</p>
      </div>

      <div class="flex justify-end space-x-3 pt-4" style="border-top: 1px solid var(--surface-border)">
        <NuxtLink
          :to="`/admin/customers/${customerId}`"
          class="px-4 py-2 rounded-md text-sm font-medium" style="border: 1px solid var(--surface-border); color: var(--text-secondary); background: var(--surface-1)"
        >
          {{ t('admin.common.cancel') }}
        </NuxtLink>
        <button
          type="submit"
          :disabled="submitting"
          class="px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
        >
          <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
          {{ submitting ? t('admin.common.saving') : t('admin.common.saveChanges') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseInput from '~/components/ui/BaseInput.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.customers.edit.metaTitle'
})

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const customerId = route.params.id as string
const { t } = useI18n({ useScope: 'global' })

const loading = ref(true)
const form = reactive({
  name: '',
  phone: '',
  email: '',
  address: '',
  openingBalance: 0
})

const errors = ref<Record<string, string>>({})
const errorMessage = ref('')
const submitting = ref(false)

onMounted(async () => {
  try {
    const data = await $fetch<any>(`/api/admin/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })

    if (data && data.summary) {
        form.name = data.summary.name || ''
        form.phone = data.summary.phone || ''
        form.email = data.summary.email || ''
        form.address = data.summary.address || ''
        form.openingBalance = data.summary.openingBalance || 0
    }
  } catch (error) {
    console.error('Failed to fetch customer:', error)
    errorMessage.value = t('admin.pages.customers.edit.errors.loadFailed')
  } finally {
    loading.value = false
  }
})

async function handleSubmit() {
  errors.value = {}
  errorMessage.value = ''
  
  if (!form.name.trim()) {
    errors.value.name = t('admin.forms.customer.name.required')
  }
  if (!form.phone.trim()) {
      errors.value.phone = t('admin.forms.customer.phone.required')
  }
  
  if (Object.keys(errors.value).length > 0) return

  submitting.value = true

  try {
    await $fetch(`/api/admin/customers/${customerId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        address: form.address || null
      }
    })

    router.push(`/admin/customers/${customerId}`)
  } catch (error: any) {
    console.error('Failed to update customer:', error)
    if (error.data?.statusMessage) {
      errorMessage.value = error.data.statusMessage
    } else {
      errorMessage.value = t('admin.pages.customers.edit.errors.updateFailed')
    }
  } finally {
    submitting.value = false
  }
}
</script>
