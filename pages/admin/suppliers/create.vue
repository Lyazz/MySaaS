<template>
  <div class="max-w-7xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex mb-6" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/admin/suppliers" class="text-gray-700 hover:text-teal-600">
            {{ t('admin.nav.suppliers') }}
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-gray-400" />
            <span class="ml-1 text-gray-500">{{ t('admin.pages.suppliers.create.breadcrumb') }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">{{ t('admin.pages.suppliers.create.title') }}</h2>
      <p class="text-gray-600 mt-1">{{ t('admin.pages.suppliers.create.subtitle') }}</p>
    </div>

    <!-- Form -->
    <form class="bg-white rounded-lg shadow p-6 space-y-6" @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BaseInput
          v-model="form.name"
          :label="t('admin.forms.supplier.name.label')"
          :error="errors.name"
          :placeholder="t('admin.forms.supplier.name.placeholder')"
          required
        />

        <BaseInput
          v-model="form.phone"
          :label="t('admin.forms.supplier.phone.label')"
          :error="errors.phone"
          :placeholder="t('admin.forms.supplier.phone.placeholder')"
        />

        <BaseInput
          v-model="form.email"
          :label="t('admin.forms.supplier.email.label')"
          type="email"
          :error="errors.email"
          :placeholder="t('admin.forms.supplier.email.placeholder')"
        />

        <BaseInput
          v-model="form.address"
          :label="t('admin.forms.supplier.address.label')"
          :error="errors.address"
          :placeholder="t('admin.forms.supplier.address.placeholder')"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.forms.supplier.notes.label') }}</label>
        <textarea
          v-model="form.notes"
          rows="3"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500 transition-colors"
          :placeholder="t('admin.forms.supplier.notes.placeholder')"
        ></textarea>
      </div>

      <div v-if="errorMessage" class="p-4 bg-red-50 border border-red-200 rounded-md">
        <p class="text-sm text-red-800">{{ errorMessage }}</p>
      </div>

      <div class="flex justify-end space-x-3 pt-4 border-t">
        <NuxtLink
          to="/admin/suppliers"
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {{ t('admin.common.cancel') }}
        </NuxtLink>
        <button
          type="button"
          :disabled="submitting"
          class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          @click="handleSubmit"
        >
          <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
          {{ submitting ? t('admin.common.creating') : t('admin.pages.suppliers.create.submit') }}
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
  titleKey: 'admin.pages.suppliers.create.metaTitle'
})

const authStore = useAuthStore()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const form = reactive({
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
})

const errors = ref<Record<string, string>>({})
const errorMessage = ref('')
const submitting = ref(false)

async function handleSubmit() {
  errors.value = {}
  errorMessage.value = ''
  
  if (!form.name.trim()) {
    errors.value.name = t('admin.forms.supplier.name.required')
    return
  }

  submitting.value = true

  try {
    await $fetch('/api/admin/suppliers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        notes: form.notes
      }
    })

    router.push('/admin/suppliers')
  } catch (error: any) {
    console.error('Failed to create supplier:', error)
    if (error.data?.statusMessage) {
      errorMessage.value = error.data.statusMessage
    } else {
      errorMessage.value = t('admin.pages.suppliers.create.errors.createFailed')
    }
  } finally {
    submitting.value = false
  }
}
</script>
