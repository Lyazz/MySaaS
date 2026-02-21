<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-900">
          {{ t('admin.pages.pos.customer.addClient') }}
        </h2>
        <button
          class="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          @click="$emit('close')"
        >
          <Icon name="lucide:x" class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ t('admin.forms.customer.name.label') }} <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            class="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            :class="errors.name ? 'border-red-300' : 'border-gray-200'"
            :placeholder="t('admin.forms.customer.name.placeholder')"
          >
          <p v-if="errors.name" class="mt-1 text-xs text-red-500">{{ errors.name }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ t('admin.forms.customer.phone.label') }} <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.phone"
            type="text"
            class="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            :class="errors.phone ? 'border-red-300' : 'border-gray-200'"
            :placeholder="t('admin.forms.customer.phone.placeholder')"
          >
          <p v-if="errors.phone" class="mt-1 text-xs text-red-500">{{ errors.phone }}</p>
        </div>
      </div>

      <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
        <button
          class="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          @click="$emit('close')"
        >
          {{ t('admin.common.cancel') }}
        </button>
        <button
          class="px-4 py-2 rounded-lg font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors flex items-center justify-center min-w-[100px]"
          :disabled="loading"
          @click="submit"
        >
          <Icon v-if="loading" name="lucide:loader-2" class="w-4 h-4 animate-spin mr-2" />
          {{ t('admin.common.create') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', customer: any): void
}>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

const loading = ref(false)
const form = reactive({
  name: '',
  phone: ''
})
const errors = reactive({
  name: '',
  phone: ''
})

async function submit() {
  errors.name = ''
  errors.phone = ''
  
  if (!form.name.trim()) errors.name = t('admin.forms.customer.name.required')
  if (!form.phone.trim()) errors.phone = t('admin.forms.customer.phone.required')
  
  if (errors.name || errors.phone) return

  loading.value = true
  try {
    const res = await $fetch('/api/admin/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        name: form.name,
        phone: form.phone
      }
    })
    emit('created', res)
  } catch (e: any) {
    if (e?.data?.statusCode === 409) {
       errors.phone = e.data.statusMessage || 'Customer already exists'
    } else {
       alert(t('admin.pages.customers.create.errors.createFailed'))
    }
  } finally {
    loading.value = false
  }
}
</script>
