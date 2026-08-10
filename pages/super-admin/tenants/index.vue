<template>
  <div class="space-y-6">
      <SuperAdminPageHeader :title="t('superAdmin.tenants.title')">
        <template #actions>
          <button
            class="ui-btn ui-btn--primary ui-btn--md"
            @click="showCreateModal = true"
          >
            <Icon name="lucide:plus" class="h-4 w-4" />
            <span>{{ t('superAdmin.tenants.actions.createTenant') }}</span>
          </button>
        </template>
      </SuperAdminPageHeader>

      <!-- Search -->
      <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div class="relative flex-1">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('superAdmin.tenants.search.placeholder')"
            class="ui-input ps-10"
          >
          <Icon name="lucide:search" class="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2" style="color: var(--text-tertiary)" />
        </div>
        <label class="flex items-center gap-2 text-sm whitespace-nowrap px-1" style="color: var(--text-secondary)">
          <input v-model="includeArchived" type="checkbox" @change="loadTenants">
          {{ t('superAdmin.tenants.actions.showArchived') }}
        </label>
      </div>

      <!-- Tenants Table -->
      <div class="ui-card overflow-hidden">
        <SuperAdminLoadingState
          v-if="loading"
          :label="t('superAdmin.tenants.loading')"
        />
        <SuperAdminEmptyState
          v-else-if="filteredTenants.length === 0"
          icon="lucide:building"
          :title="t('superAdmin.tenants.empty')"
        />
        <div v-else class="overflow-x-auto">
        <table class="ui-table">
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
              <th class="ui-th text-end">
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
                <NuxtLink :to="`/super-admin/tenants/${tenant.id}`" class="hover:text-lime-700 hover:underline">
                  {{ tenant.name }}
                </NuxtLink>
              </td>
              <td class="ui-td text-slate-600">
                <code class="px-2 py-1 bg-slate-100 rounded text-sm text-slate-700 border border-slate-200">{{ tenant.slug }}</code>
              </td>
              <td class="ui-td">
                <span
                  v-if="tenant.archivedAt"
                  class="ui-badge ui-badge--slate"
                >
                  {{ t('superAdmin.tenants.status.archived') }}
                </span>
                <span
                  v-else-if="tenant.isSuspended"
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
                <div class="flex justify-end gap-1.5">
                  <button
                    type="button"
                    class="ui-table-action"
                    :title="t('superAdmin.tenants.actions.viewDetails')"
                    @click.stop="viewDetails(tenant)"
                  >
                    <Icon name="lucide:eye" class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="ui-table-action"
                    :title="t('admin.common.edit')"
                    @click="editTenant(tenant)"
                  >
                    <Icon name="lucide:pencil" class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="ui-table-action"
                    :title="t('superAdmin.tenants.actions.payments')"
                    @click.stop="openPayments(tenant)"
                  >
                    <Icon name="lucide:receipt" class="h-4 w-4" />
                  </button>
                  <template v-if="!tenant.archivedAt">
                    <button
                      v-if="!tenant.isSuspended"
                      type="button"
                      class="ui-table-action"
                      :title="t('superAdmin.tenants.actions.suspend')"
                      @click="suspendTenant(tenant)"
                    >
                      <Icon name="lucide:pause-circle" class="h-4 w-4" />
                    </button>
                    <button
                      v-else
                      type="button"
                      class="ui-table-action"
                      :title="t('superAdmin.tenants.actions.activate')"
                      @click="unsuspendTenant(tenant)"
                    >
                      <Icon name="lucide:play-circle" class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="ui-table-action ui-table-action--danger"
                      :title="t('superAdmin.tenants.actions.archive')"
                      @click="archiveTenant(tenant)"
                    >
                      <Icon name="lucide:archive" class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <button
                      type="button"
                      class="ui-table-action"
                      :title="t('superAdmin.tenants.actions.restore')"
                      @click="restoreTenant(tenant)"
                    >
                      <Icon name="lucide:rotate-ccw" class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="ui-table-action ui-table-action--danger"
                      :title="t('superAdmin.tenants.actions.deletePermanently')"
                      @click="deleteTenant(tenant)"
                    >
                      <Icon name="lucide:trash" class="h-4 w-4" />
                    </button>
                  </template>
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
      <div class="ui-card w-full max-w-md p-6 shadow-xl">
        <h2 class="mb-4 text-xl font-bold" style="color: var(--text-primary)">
          {{ showEditModal ? t('superAdmin.tenants.modal.editTitle') : t('superAdmin.tenants.modal.createTitle') }}
        </h2>

        <div
          v-if="error"
          class="ui-badge ui-badge--red mb-4 block w-full rounded-lg px-3 py-2 text-sm"
        >
          {{ error }}
        </div>

        <form
          class="space-y-4"
          @submit.prevent="handleSubmit"
        >
          <div>
            <label class="ui-label">{{ t('superAdmin.tenants.modal.fields.name.label') }}</label>
            <BaseInput
              v-model="formData.name"
              type="text"
              required
              :placeholder="t('superAdmin.tenants.modal.fields.name.placeholder')"
            />
          </div>

          <div>
            <label class="ui-label">{{ t('superAdmin.tenants.modal.fields.slug.label') }}</label>
            <BaseInput
              v-model="formData.slug"
              type="text"
              required
              :disabled="!!showEditModal"
              :placeholder="t('superAdmin.tenants.modal.fields.slug.placeholder')"
            />
            <p class="mt-1 text-xs" style="color: var(--text-tertiary)">
              {{ t('superAdmin.tenants.modal.fields.slug.hint', { domain: slugPreview }) }}
            </p>
          </div>

          <div v-if="!showEditModal">
            <label class="ui-label">{{ t('superAdmin.tenants.modal.fields.ownerEmail.label') }}</label>
            <BaseInput
              v-model="formData.ownerEmail"
              type="email"
              required
              :placeholder="t('superAdmin.tenants.modal.fields.ownerEmail.placeholder')"
            />
          </div>

          <div v-if="!showEditModal">
            <label class="ui-label">{{ t('superAdmin.tenants.modal.fields.ownerPassword.label') }}</label>
            <BaseInput
              v-model="formData.ownerPassword"
              type="password"
              required
              minlength="8"
              placeholder="••••••••"
            />
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--md flex-1"
              @click="closeModal"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="ui-btn ui-btn--primary ui-btn--md flex-1"
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
const includeArchived = ref(false)
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
      },
      query: includeArchived.value ? { includeArchived: 'true' } : undefined
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

const viewDetails = async (tenant: any) => {
  if (!tenant?.id) return
  await navigateTo(`/super-admin/tenants/${tenant.id}`)
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
  if (!confirm(t('superAdmin.tenants.confirm.deletePermanently', { name: tenant.name }))) return

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

const archiveTenant = async (tenant: any) => {
  if (!confirm(t('superAdmin.tenants.confirm.archive', { name: tenant.name }))) return

  try {
    await $fetch(`/api/super-admin/tenants/${tenant.id}/archive`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    await loadTenants()
  } catch (err) {
    console.error('Failed to archive tenant:', err)
    alert(t('superAdmin.tenants.errors.archiveFailed'))
  }
}

const restoreTenant = async (tenant: any) => {
  if (!confirm(t('superAdmin.tenants.confirm.restore', { name: tenant.name }))) return

  try {
    await $fetch(`/api/super-admin/tenants/${tenant.id}/restore`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    await loadTenants()
  } catch (err) {
    console.error('Failed to restore tenant:', err)
    alert(t('superAdmin.tenants.errors.restoreFailed'))
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
