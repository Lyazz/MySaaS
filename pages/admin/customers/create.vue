<template>
  <div class="max-w-7xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex mb-6" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3 rtl:space-x-reverse">
        <li class="inline-flex items-center">
          <NuxtLink to="/admin/customers" class="hover:[color:var(--brand)]" style="color: var(--text-secondary)">
            {{ t('admin.nav.customers') }}
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6" style="color: var(--text-tertiary)" />
            <span class="ms-1" style="color: var(--text-tertiary)">{{ t('admin.pages.customers.create.breadcrumb') }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Header -->
    <div class="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold" style="color: var(--text-primary)">{{ t('admin.pages.customers.create.title') }}</h2>
        <p class="mt-1" style="color: var(--text-secondary)">{{ t('admin.pages.customers.create.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <NuxtLink
          to="/admin/customers"
          class="px-4 py-2 rounded-md text-sm font-medium" style="border: 1px solid var(--surface-border); color: var(--text-secondary); background: var(--surface-1)"
        >
          {{ t('admin.common.cancel') }}
        </NuxtLink>
        <button
          form="customer-create-form"
          type="submit"
          :disabled="submitting"
          class="px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
        >
          <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
          {{ submitting ? t('admin.common.creating') : t('admin.pages.customers.create.submit') }}
        </button>
      </div>
    </div>

    <!-- Form -->
    <form id="customer-create-form" class="ui-card p-6 space-y-6" @submit.prevent="handleSubmit">
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
          step="0.01"
          :error="errors.openingBalance"
          :placeholder="t('admin.forms.customer.openingBalance.placeholder')"
          :hint="t('admin.forms.customer.openingBalance.hint')"
          required
        />
      </div>

      <div v-if="errorMessage" class="p-4 bg-red-50 border border-red-200 rounded-md">
        <p class="text-sm text-red-800">{{ errorMessage }}</p>
      </div>

      <div class="flex justify-end space-x-3 pt-4 rtl:space-x-reverse" style="border-top: 1px solid var(--surface-border)">
        <NuxtLink
          to="/admin/customers"
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
          {{ submitting ? t('admin.common.creating') : t('admin.pages.customers.create.submit') }}
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
  titleKey: 'admin.pages.customers.create.metaTitle'
})

const authStore = useAuthStore()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const form = reactive({
  name: '',
  phone: '',
  email: '',
  address: '',
  openingBalance: ''
})

const errors = ref<Record<string, string>>({})
const errorMessage = ref('')
const submitting = ref(false)

async function handleSubmit() {
  errors.value = {}
  errorMessage.value = ''
  
  if (!form.name.trim()) {
    errors.value.name = t('admin.forms.customer.name.required')
  }
  if (!form.phone.trim()) {
      errors.value.phone = t('admin.forms.customer.phone.required')
  }
  if (form.openingBalance === '') {
      errors.value.openingBalance = t('admin.forms.customer.openingBalance.required')
  }

  if (Object.keys(errors.value).length > 0) return

  submitting.value = true

  try {
    await $fetch('/api/admin/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        address: form.address || null,
        openingBalance: parseFloat(form.openingBalance) || 0
      }
    })

    router.push('/admin/customers')
  } catch (error: any) {
    console.error('Failed to create customer:', error)
    if (error.data?.statusMessage) {
      errorMessage.value = error.data.statusMessage
    } else {
      errorMessage.value = t('admin.pages.customers.create.errors.createFailed')
    }
  } finally {
    submitting.value = false
  }
}
</script>
