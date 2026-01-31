<template>
  <div class="max-w-2xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex mb-6" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/admin/purchases" class="text-gray-700 hover:text-teal-600">
            Purchases
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-gray-400" />
            <span class="ml-1 text-gray-500">New Purchase</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">New Purchase Order</h2>
      <p class="text-gray-600 mt-1">Start a new purchase order from a supplier</p>
    </div>

    <!-- Form -->
    <div class="bg-white rounded-lg shadow p-6 space-y-6">
      <BaseSelect
        v-model="form.supplierId"
        label="Select Supplier"
        placeholder="Choose a supplier..."
        required
      >
        <option value="">Choose a supplier...</option>
        <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
      </BaseSelect>

      <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p class="text-sm text-blue-800">
          <Icon name="lucide:info" class="w-4 h-4 inline mr-1" />
          You can add products and details after creating the draft.
        </p>
      </div>

      <div v-if="errorMessage" class="p-4 bg-red-50 border border-red-200 rounded-md">
        <p class="text-sm text-red-800">{{ errorMessage }}</p>
      </div>

      <div class="flex justify-end space-x-3 pt-4 border-t">
        <NuxtLink
          to="/admin/purchases"
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </NuxtLink>
        <button
          type="button"
          :disabled="submitting || !form.supplierId"
          class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          @click="handleSubmit"
        >
          <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
          {{ submitting ? 'Creating Draft...' : 'Create Draft' }}
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
  title: 'New Purchase'
})

const authStore = useAuthStore()
const router = useRouter()

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
    errorMessage.value = 'Failed to load suppliers.'
  }
})

async function handleSubmit() {
  if (!form.supplierId) return

  submitting.value = true
  errorMessage.value = ''

  try {
    const created = await $fetch<{ id: string }>('/api/admin/purchases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { supplierId: form.supplierId }
    })
    
    router.push(`/admin/purchases/${created.id}`)
  } catch (error: any) {
    console.error('Failed to create purchase:', error)
    if (error.data?.statusMessage) {
      errorMessage.value = error.data.statusMessage
    } else {
      errorMessage.value = 'Failed to create purchase. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}
</script>
