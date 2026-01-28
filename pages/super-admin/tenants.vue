<template>
  <NuxtLayout name="super-admin">
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-white">
          Tenant Management
        </h1>
        <button
          class="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-medium transition-colors flex items-center space-x-2" 
          @click="showCreateModal = true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clip-rule="evenodd"
            />
          </svg>
          <span>Create Tenant</span>
        </button>
      </div>

      <!-- Search -->
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search tenants..."
          class="w-full px-4 py-3 pl-10 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clip-rule="evenodd"
          />
        </svg>
      </div>

      <!-- Tenants Table -->
      <div class="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
        <div
          v-if="loading"
          class="p-8 text-center text-gray-400"
        >
          Loading tenants...
        </div>
        <div
          v-else-if="filteredTenants.length === 0"
          class="p-8 text-center text-gray-400"
        >
          No tenants found
        </div>
        <table
          v-else
          class="w-full"
        >
          <thead class="bg-slate-900/50 border-b border-slate-700">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                Name
              </th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                Slug
              </th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                Status
              </th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                Users
              </th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                Products
              </th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                Orders
              </th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                Created
              </th>
              <th class="px-6 py-4 text-right text-sm font-semibold text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700">
            <tr
              v-for="tenant in filteredTenants"
              :key="tenant.id"
              class="hover:bg-slate-900/30 transition-colors"
            >
              <td class="px-6 py-4 text-white font-medium">
                {{ tenant.name }}
              </td>
              <td class="px-6 py-4 text-gray-300">
                <code class="px-2 py-1 bg-slate-900/50 rounded text-sm">{{ tenant.slug }}</code>
              </td>
              <td class="px-6 py-4">
                <span
                  v-if="tenant.isSuspended" 
                  class="px-2 py-1 bg-red-500/20 border border-red-500/50 rounded-full text-red-300 text-xs font-medium"
                >
                  Suspended
                </span>
                <span
                  v-else 
                  class="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-300 text-xs font-medium"
                >
                  Active
                </span>
              </td>
              <td class="px-6 py-4 text-gray-300">
                {{ tenant._count?.users || 0 }}
              </td>
              <td class="px-6 py-4 text-gray-300">
                {{ tenant._count?.products || 0 }}
              </td>
              <td class="px-6 py-4 text-gray-300">
                {{ tenant._count?.orders || 0 }}
              </td>
              <td class="px-6 py-4 text-gray-300 text-sm">
                {{ formatDate(tenant.createdAt) }}
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-end space-x-2">
                  <button
                    class="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded text-blue-300 transition-colors" 
                    title="Edit"
                    @click="editTenant(tenant)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    v-if="!tenant.isSuspended"
                    class="p-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 rounded text-orange-300 transition-colors" 
                    title="Suspend"
                    @click="suspendTenant(tenant)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    v-else
                    class="p-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded text-green-300 transition-colors" 
                    title="Activate"
                    @click="unsuspendTenant(tenant)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    class="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded text-red-300 transition-colors" 
                    title="Delete"
                    @click="deleteTenant(tenant)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                      />
                    </svg>
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
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
        <h2 class="text-2xl font-bold text-white mb-4">
          {{ showEditModal ? 'Edit Tenant' : 'Create New Tenant' }}
        </h2>
        
        <div
          v-if="error"
          class="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm"
        >
          {{ error }}
        </div>

        <form
          class="space-y-4"
          @submit.prevent="handleSubmit"
        >
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Tenant Name</label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Acme Corp"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Slug (subdomain)</label>
            <input
              v-model="formData.slug"
              type="text"
              required
              :disabled="!!showEditModal"
              class="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              placeholder="acme"
            >
            <p class="text-xs text-gray-400 mt-1">
              Will be accessible at {{ formData.slug || 'slug' }}.localhost:3000
            </p>
          </div>

          <div v-if="!showEditModal">
            <label class="block text-sm font-medium text-gray-300 mb-2">Owner Email</label>
            <input
              v-model="formData.ownerEmail"
              type="email"
              required
              class="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="admin@acme.com"
            >
          </div>

          <div v-if="!showEditModal">
            <label class="block text-sm font-medium text-gray-300 mb-2">Owner Password</label>
            <input
              v-model="formData.ownerPassword"
              type="password"
              required
              minlength="8"
              class="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
            >
          </div>

          <div class="flex space-x-3 pt-4">
            <button
              type="button"
              class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              @click="closeModal"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white transition-colors disabled:opacity-50"
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
