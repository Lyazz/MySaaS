<template>
  <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-slate-900">
          {{ t('superAdmin.tenants.title') }}
        </h1>
        <button
          class="ui-btn ui-btn--primary ui-btn--md"
          @click="showCreateModal = true"
        >
          <Icon name="lucide:plus" class="h-5 w-5" />
          <span>{{ t('superAdmin.tenants.actions.createTenant') }}</span>
        </button>
      </div>

      <!-- Search -->
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('superAdmin.tenants.search.placeholder')"
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
          {{ t('superAdmin.tenants.loading') }}
        </div>
        <div
          v-else-if="filteredTenants.length === 0"
          class="p-8 text-center text-gray-500"
        >
          {{ t('superAdmin.tenants.empty') }}
        </div>
        <table v-else class="ui-table">
          <thead class="ui-thead border-b border-slate-200">
            <tr>
              <th class="ui-th">
                {{ t('superAdmin.tenants.table.name') }}
              </th>
              <th class="ui-th">
                {{ t('superAdmin.tenants.table.slug') }}
              </th>
              <th class="ui-th">
                {{ t('superAdmin.tenants.table.status') }}
              </th>
              <th class="ui-th">
                {{ t('superAdmin.tenants.table.users') }}
              </th>
              <th class="ui-th">
                {{ t('superAdmin.tenants.table.products') }}
              </th>
              <th class="ui-th">
                {{ t('superAdmin.tenants.table.orders') }}
              </th>
              <th class="ui-th">
                {{ t('superAdmin.tenants.table.created') }}
              </th>
              <th class="ui-th text-right">
                {{ t('superAdmin.tenants.table.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr
              v-for="tenant in filteredTenants"
              :key="tenant.id"
              class="ui-tr transition-colors"
            >
              <td class="ui-td text-slate-900 font-medium whitespace-nowrap">
                {{ tenant.name }}
              </td>
              <td class="ui-td text-slate-600">
                <code class="px-2 py-1 bg-slate-100 rounded text-sm text-slate-700 border border-slate-200">{{ tenant.slug }}</code>
              </td>
              <td class="ui-td">
                <span
                  v-if="tenant.isSuspended" 
                  class="ui-badge ui-badge--red"
                >
                  {{ t('superAdmin.tenants.status.suspended') }}
                </span>
                <span
                  v-else 
                  class="ui-badge ui-badge--emerald"
                >
                  {{ t('superAdmin.tenants.status.active') }}
                </span>
              </td>
              <td class="ui-td text-slate-600">
                {{ tenant._count?.users || 0 }}
              </td>
              <td class="ui-td text-slate-600">
                {{ tenant._count?.products || 0 }}
              </td>
              <td class="ui-td text-slate-600">
                {{ tenant._count?.orders || 0 }}
              </td>
              <td class="ui-td text-slate-600 text-sm whitespace-nowrap">
                {{ formatDate(tenant.createdAt) }}
              </td>
              <td class="ui-td">
                <div class="flex justify-end space-x-2">
                  <button
                    class="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-blue-600 transition-colors" 
                    :title="t('admin.common.edit')"
                    @click="editTenant(tenant)"
                  >
                    <Icon name="lucide:pencil" class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="p-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded text-teal-700 transition-colors inline-flex items-center justify-center"
                    :title="t('superAdmin.tenants.actions.payments')"
                    @click.stop="openPayments(tenant)"
                  >
                    <Icon name="lucide:receipt" class="h-4 w-4" />
                  </button>
                  <button
                    v-if="!tenant.isSuspended"
                    class="p-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded text-orange-600 transition-colors" 
                    :title="t('superAdmin.tenants.actions.suspend')"
                    @click="suspendTenant(tenant)"
                  >
                    <Icon name="lucide:pause-circle" class="h-4 w-4" />
                  </button>
                  <button
                    v-else
                    class="p-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded text-green-600 transition-colors" 
                    :title="t('superAdmin.tenants.actions.activate')"
                    @click="unsuspendTenant(tenant)"
                  >
                    <Icon name="lucide:play-circle" class="h-4 w-4" />
                  </button>
                  <button
                    class="p-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-red-600 transition-colors" 
                    :title="t('admin.common.delete')"
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
    <!-- Create/Edit Modal -->
    <div
      v-if="showCreateModal || showEditModal" 
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
      @click.self="closeModal"
    >
      <div class="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">
          {{ showEditModal ? t('superAdmin.tenants.modal.editTitle') : t('superAdmin.tenants.modal.createTitle') }}
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
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('superAdmin.tenants.modal.fields.name.label') }}</label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              :placeholder="t('superAdmin.tenants.modal.fields.name.placeholder')"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('superAdmin.tenants.modal.fields.slug.label') }}</label>
            <input
              v-model="formData.slug"
              type="text"
              required
              :disabled="!!showEditModal"
              class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:bg-gray-100"
              :placeholder="t('superAdmin.tenants.modal.fields.slug.placeholder')"
            >
            <p class="text-xs text-gray-500 mt-1">
              Accessible at {{ slugPreview }}
            </p>
          </div>

          <div v-if="!showEditModal">
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('superAdmin.tenants.modal.fields.ownerEmail.label') }}</label>
            <input
              v-model="formData.ownerEmail"
              type="email"
              required
              class="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              :placeholder="t('superAdmin.tenants.modal.fields.ownerEmail.placeholder')"
            >
          </div>

          <div v-if="!showEditModal">
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('superAdmin.tenants.modal.fields.ownerPassword.label') }}</label>
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
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-white transition-colors disabled:opacity-50"
            >
              {{ submitting ? t('admin.common.saving') : (showEditModal ? t('admin.common.update') : t('admin.common.create')) }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'super-admin',
  layout: 'super-admin',
  title: 'Tenant Management'
})

const authStore = useAuthStore()
const { t, locale } = useI18n({ useScope: 'global' })
const platformBaseDomain = usePlatformBaseDomain()
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

const subdomainSuffix = computed(() => {
  const { host } = useRequestOrigin()
  const firstHost = host.split(',')[0]?.trim() || ''
  const hostParts = firstHost.split(':')
  const hasPort = hostParts.length > 1 && /^\d+$/.test(hostParts[hostParts.length - 1] || '')
  const hostname = hasPort ? hostParts.slice(0, -1).join(':').toLowerCase() : firstHost.toLowerCase()
  const port = hasPort ? hostParts[hostParts.length - 1] : ''

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return `.localhost${port ? `:${port}` : ''}`
  }

  return `.${platformBaseDomain}`
})

const slugPreview = computed(() => `${formData.value.slug || 'your-store'}${subdomainSuffix.value}`)

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

const openPayments = async (tenant: any) => {
  if (!tenant?.id) return
  await navigateTo(`/super-admin/tenants/${tenant.id}/payments`)
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
    error.value = err.data?.statusMessage || err.message || t('superAdmin.tenants.errors.generic')
  } finally {
    submitting.value = false
  }
}

const suspendTenant = async (tenant: any) => {
  if (!confirm(t('superAdmin.tenants.confirm.suspend', { name: tenant.name }))) return
  
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
    alert(t('superAdmin.tenants.errors.suspendFailed'))
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
    alert(t('superAdmin.tenants.errors.activateFailed'))
  }
}

const deleteTenant = async (tenant: any) => {
  if (!confirm(t('superAdmin.tenants.confirm.delete', { name: tenant.name }))) return
  
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
    alert(t('superAdmin.tenants.errors.deleteFailed'))
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
  const iso = locale.value === 'fr' ? 'fr-FR' : locale.value === 'ar' ? 'ar-DZ' : 'en-US'
  return new Date(date).toLocaleDateString(iso, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

onMounted(() => {
  loadTenants()
})
</script>
