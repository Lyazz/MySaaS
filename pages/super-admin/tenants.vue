<template>
  <NuxtLayout name="super-admin">
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-800">
          Tenant Management
        </h1>
        <button
          class="px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-white font-medium transition-colors flex items-center space-x-2" 
          @click="showCreateModal = true"
        >
          <Icon name="lucide:plus" class="h-5 w-5" />
          <span>Create Tenant</span>
        </button>
      </div>

      <!-- Search -->
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search tenants..."
          class="w-full px-4 py-3 pl-10 bg-white border border-slate-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
        >
        <Icon name="lucide:search" class="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>

      <!-- Tenants Table -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div
          v-if="loading"
          class="p-8 text-center text-gray-500"
        >
          Loading tenants...
        </div>
        <div
          v-else-if="filteredTenants.length === 0"
          class="p-8 text-center text-gray-500"
        >
          No tenants found
        </div>
        <table
          v-else
          class="w-full"
        >
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Name
              </th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Slug
              </th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Status
              </th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Users
              </th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Products
              </th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Orders
              </th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                Created
              </th>
              <th class="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="tenant in filteredTenants"
              :key="tenant.id"
              class="hover:bg-slate-50 transition-colors"
            >
              <td class="px-6 py-4 text-gray-800 font-medium whitespace-nowrap">
                {{ tenant.name }}
              </td>
              <td class="px-6 py-4 text-gray-600">
                <code class="px-2 py-1 bg-slate-100 rounded text-sm text-slate-700 border border-slate-200">{{ tenant.slug }}</code>
              </td>
              <td class="px-6 py-4">
                <span
                  v-if="tenant.isSuspended" 
                  class="px-2 py-1 bg-red-100 border border-red-200 rounded-full text-red-700 text-xs font-medium"
                >
                  Suspended
                </span>
                <span
                  v-else 
                  class="px-2 py-1 bg-green-100 border border-green-200 rounded-full text-green-700 text-xs font-medium"
                >
                  Active
                </span>
              </td>
              <td class="px-6 py-4 text-gray-600">
                {{ tenant._count?.users || 0 }}
              </td>
              <td class="px-6 py-4 text-gray-600">
                {{ tenant._count?.products || 0 }}
              </td>
              <td class="px-6 py-4 text-gray-600">
                {{ tenant._count?.orders || 0 }}
              </td>
              <td class="px-6 py-4 text-gray-600 text-sm whitespace-nowrap">
                {{ formatDate(tenant.createdAt) }}
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-end space-x-2">
                  <button
                    class="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-blue-600 transition-colors" 
                    title="Edit"
                    @click="editTenant(tenant)"
                  >
                    <Icon name="lucide:pencil" class="h-4 w-4" />
                  </button>
                  <button
                    v-if="!tenant.isSuspended"
                    class="p-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded text-orange-600 transition-colors" 
                    title="Suspend"
                    @click="suspendTenant(tenant)"
                  >
                    <Icon name="lucide:pause-circle" class="h-4 w-4" />
                  </button>
                  <button
                    v-else
                    class="p-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded text-green-600 transition-colors" 
                    title="Activate"
                    @click="unsuspendTenant(tenant)"
                  >
                    <Icon name="lucide:play-circle" class="h-4 w-4" />
                  </button>
                  <button
                    class="p-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-red-600 transition-colors" 
                    title="Delete"
                    @click="deleteTenant(tenant)"
                  >
                    <Icon name="lucide:trash" class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div
      v-if="showCreateModal || showEditModal" 
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
      @click.self="closeModal"
    >
      <div class="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">
          {{ showEditModal ? 'Edit Tenant' : 'Create New Tenant' }}
        </h2>
        
        <div
          v-if="error"
          class="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm"
        >
          {{ error }}
        </div>

        <form
          class="space-y-4"
          @submit.prevent="handleSubmit"
        >
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tenant Name</label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Acme Corp"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Slug (subdomain)</label>
            <input
              v-model="formData.slug"
              type="text"
              required
              :disabled="!!showEditModal"
              class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:bg-gray-100"
              placeholder="acme"
            >
            <p class="text-xs text-gray-500 mt-1">
              Will be accessible at {{ formData.slug || 'slug' }}.localhost:3000
            </p>
          </div>

          <div v-if="!showEditModal">
            <label class="block text-sm font-medium text-gray-700 mb-2">Owner Email</label>
            <input
              v-model="formData.ownerEmail"
              type="email"
              required
              class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="admin@acme.com"
            >
          </div>

          <div v-if="!showEditModal">
            <label class="block text-sm font-medium text-gray-700 mb-2">Owner Password</label>
            <input
              v-model="formData.ownerPassword"
              type="password"
              required
              minlength="8"
              class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="••••••••"
            >
          </div>

          <div class="flex space-x-3 pt-4">
            <button
              type="button"
              class="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-gray-700 transition-colors"
              @click="closeModal"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-white transition-colors disabled:opacity-50"
            >
              {{ submitting ? 'Saving...' : (showEditModal ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'super-admin'
})

const authStore = useAuthStore()
const loading = ref(true)
const tenants = ref<any[]>([])
const searchQuery = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingTenant = ref<any>(null)
const error = ref('')
const submitting = ref(false)

const formData = ref({
  name: '',
  slug: '',
  ownerEmail: '',
  ownerPassword: ''
})

const filteredTenants = computed(() => {
  if (!searchQuery.value) return tenants.value
  const query = searchQuery.value.toLowerCase()
  return tenants.value.filter(t => 
    t.name.toLowerCase().includes(query) || 
    t.slug.toLowerCase().includes(query)
  )
})

const loadTenants = async () => {
  try {
    loading.value = true
    const response = await $fetch<any[]>('/api/super-admin/tenants', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    tenants.value = response
  } catch (err: any) {
    console.error('Failed to load tenants:', err)
  } finally {
    loading.value = false
  }
}

const editTenant = (tenant: any) => {
  editingTenant.value = tenant
  formData.value = {
    name: tenant.name,
    slug: tenant.slug,
    ownerEmail: '',
    ownerPassword: ''
  }
  showEditModal.value = true
}

const handleSubmit = async () => {
  error.value = ''
  submitting.value = true

  try {
    if (showEditModal.value) {
      await $fetch(`/api/super-admin/tenants/${editingTenant.value.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authStore.token}`
        },
        body: {
          name: formData.value.name
        }
      })
    } else {
      await $fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.token}`
        },
        body: formData.value
      })
    }
    closeModal()
    await loadTenants()
  } catch (err: any) {
    error.value = err.data?.statusMessage || err.message || 'An error occurred'
  } finally {
    submitting.value = false
  }
}

const suspendTenant = async (tenant: any) => {
  if (!confirm(`Are you sure you want to suspend ${tenant.name}?`)) return
  
  try {
    await $fetch(`/api/super-admin/tenants/${tenant.id}/suspend`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    await loadTenants()
  } catch (err) {
    console.error('Failed to suspend tenant:', err)
    alert('Failed to suspend tenant')
  }
}

const unsuspendTenant = async (tenant: any) => {
  try {
    await $fetch(`/api/super-admin/tenants/${tenant.id}/unsuspend`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    await loadTenants()
  } catch (err) {
    console.error('Failed to unsuspend tenant:', err)
    alert('Failed to unsuspend tenant')
  }
}

const deleteTenant = async (tenant: any) => {
  if (!confirm(`Are you sure you want to DELETE ${tenant.name}? This action cannot be undone!`)) return
  
  try {
    await $fetch(`/api/super-admin/tenants/${tenant.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    await loadTenants()
  } catch (err) {
    console.error('Failed to delete tenant:', err)
    alert('Failed to delete tenant')
  }
}

const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value = false
  editingTenant.value = null
  formData.value = {
    name: '',
    slug: '',
    ownerEmail: '',
    ownerPassword: ''
  }
  error.value = ''
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

onMounted(() => {
  loadTenants()
})
</script>
