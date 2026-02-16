<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ t('admin.nav.users') }}
        </h2>
        <p class="mt-1 text-slate-600">
          {{ t('admin.pages.users.subtitle') }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          :disabled="pending || rolesPending"
          @click="activeTab === 'users' ? refresh() : refreshRoles()"
        >
          <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="pending ? 'animate-spin' : ''" />
          {{ t('admin.common.refresh') }}
        </button>

        <button
          v-if="activeTab === 'users'"
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-50"
          :disabled="pending"
          @click="openCreate()"
        >
          <Icon name="lucide:user-plus" class="h-4 w-4" />
          {{ t('admin.pages.users.actions.add') }}
        </button>

        <button
          v-else
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-50"
          :disabled="rolesPending"
          @click="openCreateRole()"
        >
          <Icon name="lucide:plus" class="h-4 w-4" />
          {{ t('admin.pages.users.roles.actions.addRole') }}
        </button>
      </div>
    </div>

    <div class="inline-flex rounded-xl bg-slate-100 p-1">
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm font-medium"
        :class="activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
        @click="activeTab = 'users'"
      >
        {{ t('admin.pages.users.tabs.users') }}
      </button>
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm font-medium"
        :class="activeTab === 'roles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
        @click="activeTab = 'roles'"
      >
        {{ t('admin.pages.users.tabs.roles') }}
      </button>
    </div>

    <div v-if="errorMessage" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div class="flex items-start gap-3">
        <Icon name="lucide:triangle-alert" class="mt-0.5 h-4 w-4" />
        <div class="min-w-0">
          <p class="font-medium">{{ t('admin.pages.users.errors.title') }}</p>
          <p class="mt-1 text-red-700/80 break-words">{{ errorMessage }}</p>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'users'" class="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex-1">
          <BaseInput
            v-model="search"
            :placeholder="t('admin.pages.users.searchPlaceholder')"
            class="max-w-md"
          />
        </div>
        <label class="inline-flex items-center gap-2 text-sm text-slate-700">
          <input v-model="includeInactive" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-teal-600" />
          {{ t('admin.pages.users.includeInactive') }}
        </label>
      </div>

      <div class="overflow-x-auto">
        <table class="ui-table">
          <thead class="ui-thead">
            <tr>
              <th class="ui-th">{{ t('admin.pages.users.columns.email') }}</th>
              <th class="ui-th">{{ t('admin.pages.users.columns.role') }}</th>
              <th class="ui-th">{{ t('admin.pages.users.columns.staffRole') }}</th>
              <th class="ui-th">{{ t('admin.pages.users.columns.status') }}</th>
              <th class="ui-th">{{ t('admin.pages.users.columns.createdAt') }}</th>
              <th class="ui-th text-right">{{ t('admin.common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr v-if="pending">
              <td class="px-4 py-6 text-slate-500" colspan="6">{{ t('admin.common.loading') }}</td>
            </tr>
            <tr v-else-if="filteredUsers.length === 0">
              <td class="px-4 py-6 text-slate-500" colspan="6">{{ t('admin.pages.users.empty') }}</td>
            </tr>
            <tr v-for="u in filteredUsers" :key="u.id" class="ui-tr">
              <td class="ui-td">
                <div class="font-medium text-slate-900">{{ u.email }}</div>
              </td>
              <td class="ui-td">
                <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="roleBadgeClass(u.role)"
                >
                  {{ t(`admin.roles.${u.role}`) }}
                </span>
              </td>
              <td class="ui-td text-slate-600">
                <span v-if="u.role === 'staff'">
                  {{ staffRoleName(u.staffRoleId) }}
                </span>
                <span v-else class="text-slate-400">—</span>
              </td>
              <td class="ui-td">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'"
                >
                  {{ u.isActive ? t('admin.common.active') : t('admin.common.inactive') }}
                </span>
              </td>
              <td class="ui-td text-slate-600">
                {{ formatDate(u.createdAt) }}
              </td>
              <td class="ui-td text-right">
                <div class="inline-flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    @click="openEdit(u)"
                  >
                    <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
                    {{ t('admin.common.edit') }}
                  </button>
                  <button
                    v-if="u.isActive"
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-sm hover:bg-red-100"
                    :disabled="cannotDeactivate(u)"
                    @click="deactivate(u)"
                  >
                    <Icon name="lucide:user-x" class="h-3.5 w-3.5" />
                    {{ t('admin.pages.users.actions.deactivate') }}
                  </button>
                  <button
                    v-else
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 shadow-sm hover:bg-emerald-100"
                    @click="setActive(u, true)"
                  >
                    <Icon name="lucide:user-check" class="h-3.5 w-3.5" />
                    {{ t('admin.pages.users.actions.activate') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 p-4">
        <p class="text-sm text-slate-600">
          {{ t('admin.pages.users.roles.subtitle') }}
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="ui-table">
          <thead class="ui-thead">
            <tr>
              <th class="ui-th">{{ t('admin.pages.users.roles.columns.name') }}</th>
              <th class="ui-th">{{ t('admin.pages.users.roles.columns.permissions') }}</th>
              <th class="ui-th text-right">{{ t('admin.common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr v-if="rolesPending">
              <td class="px-4 py-6 text-slate-500" colspan="3">{{ t('admin.common.loading') }}</td>
            </tr>
            <tr v-else-if="(staffRoles || []).length === 0">
              <td class="px-4 py-6 text-slate-500" colspan="3">{{ t('admin.pages.users.roles.empty') }}</td>
            </tr>
            <tr v-for="r in staffRoles" :key="r.id" class="ui-tr">
              <td class="ui-td">
                <div class="font-medium text-slate-900">{{ r.name }}</div>
              </td>
              <td class="ui-td text-slate-600">
                <div class="flex flex-wrap gap-2">
                  <template v-for="(p, idx) in getPermissionDisplay(r.permissions)">
                    <div
                      v-if="idx < 2"
                      :key="idx"
                      class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium"
                      :class="p.badgeClass"
                    >
                      <span class="text-slate-900">{{ p.resource }}</span>
                      <span class="text-slate-400">|</span>
                      <span v-if="p.type === 'full'" class="text-teal-700">{{ t('admin.common.fullAccess') }}</span>
                      <span v-else-if="p.type === 'view'" class="text-blue-700">{{ t('admin.common.viewOnly') }}</span>
                      <div v-else class="flex items-center gap-1 text-slate-600">
                        <Icon v-if="p.actions.includes('create')" name="lucide:plus" class="h-3 w-3" title="Create" />
                        <Icon v-if="p.actions.includes('read')" name="lucide:eye" class="h-3 w-3" title="Read" />
                        <Icon v-if="p.actions.includes('update')" name="lucide:pencil" class="h-3 w-3" title="Update" />
                        <Icon v-if="p.actions.includes('delete')" name="lucide:trash-2" class="h-3 w-3" title="Delete" />
                      </div>
                    </div>
                  </template>
                  <div
                    v-if="r.permissions && r.permissions.length > 2"
                    class="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 cursor-help"
                    :title="getHiddenPermissionsTitle(r.permissions)"
                  >
                    +{{ r.permissions.length - 2 }}
                  </div>
                </div>
              </td>
              <td class="ui-td text-right">
                <div class="inline-flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    @click="openEditRole(r)"
                  >
                    <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
                    {{ t('admin.common.edit') }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-sm hover:bg-red-100"
                    @click="deleteRole(r)"
                  >
                    <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
                    {{ t('admin.common.delete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="closeModal()"></div>
      <div class="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 shrink-0">
          <h3 class="text-lg font-semibold text-slate-900">
            {{ editing ? t('admin.pages.users.edit.title') : t('admin.pages.users.create.title') }}
          </h3>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            @click="closeModal()"
          >
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>


        <form class="space-y-4 p-5 overflow-y-auto" @submit.prevent="submitModal()">
          <BaseInput
            v-model="form.email"
            :label="t('admin.pages.users.fields.email')"
            type="email"
            inputmode="email"
            autocomplete="email"
            :error="fieldErrors.email"
            required
          />

          <BaseSelect
            v-model="form.role"
            :label="t('admin.pages.users.fields.role')"
            :disabled="editing && editingUserRole === 'owner'"
            :error="fieldErrors.role"
            required
          >
            <option v-for="opt in roleOptions" :key="opt" :value="opt">
              {{ t(`admin.roles.${opt}`) }}
            </option>
          </BaseSelect>

          <BaseSelect
            v-if="form.role === 'staff'"
            v-model="form.staffRoleId"
            :label="t('admin.pages.users.fields.staffRole')"
            :error="fieldErrors.staffRoleId"
            required
          >
            <option v-for="r in staffRoles" :key="r.id" :value="r.id">
              {{ r.name }}
            </option>
          </BaseSelect>

          <BaseInput
            v-model="form.password"
            :label="editing ? t('admin.pages.users.fields.newPassword') : t('admin.pages.users.fields.password')"
            :type="passwordVisible ? 'text' : 'password'"
            :hint="editing ? t('admin.pages.users.hints.passwordOptional') : t('admin.pages.users.hints.passwordRequired')"
            :error="fieldErrors.password"
            autocomplete="new-password"
            class="pr-10"
            :required="!editing"
          >
            <template #suffix>
              <button
                type="button"
                class="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 hover:text-slate-700"
                :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
                @click="passwordVisible = !passwordVisible"
              >
                <Icon :name="passwordVisible ? 'lucide:eye-off' : 'lucide:eye'" class="h-4 w-4" />
              </button>
            </template>
          </BaseInput>

          <BaseInput
            v-if="shouldConfirmPassword"
            v-model="form.confirmPassword"
            :label="t('admin.pages.users.fields.confirmPassword')"
            :type="confirmPasswordVisible ? 'text' : 'password'"
            :error="fieldErrors.confirmPassword"
            autocomplete="new-password"
            class="pr-10"
            :required="!editing || form.password.trim().length > 0"
          >
            <template #suffix>
              <button
                type="button"
                class="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 hover:text-slate-700"
                :aria-label="confirmPasswordVisible ? 'Hide password confirmation' : 'Show password confirmation'"
                @click="confirmPasswordVisible = !confirmPasswordVisible"
              >
                <Icon :name="confirmPasswordVisible ? 'lucide:eye-off' : 'lucide:eye'" class="h-4 w-4" />
              </button>
            </template>
          </BaseInput>

          <div v-if="editing" class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-slate-900">{{ t('admin.pages.users.fields.isActive') }}</p>
                <p class="mt-1 text-xs text-slate-600">{{ t('admin.pages.users.hints.deactivateHint') }}</p>
              </div>
              <BaseToggle v-model="form.isActive" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              @click="closeModal()"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="submit"
              class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-50"
              :disabled="saving"
            >
              <Icon v-if="saving" name="lucide:loader-circle" class="h-4 w-4 animate-spin" />
              {{ saving ? t('admin.common.saving') : t('admin.common.saveChanges') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Staff Role Modal -->
    <div v-if="roleModalOpen" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="closeRoleModal()"></div>
      <div class="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 shrink-0">
          <h3 class="text-lg font-semibold text-slate-900">
            {{ roleEditing ? t('admin.pages.users.roles.editTitle') : t('admin.pages.users.roles.createTitle') }}
          </h3>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            @click="closeRoleModal()"
          >
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>


        <form class="space-y-5 p-5 overflow-y-auto" @submit.prevent="submitRoleModal()">
          <BaseInput
            v-model="roleForm.name"
            :label="t('admin.pages.users.roles.fields.name')"
            :error="roleFieldErrors.name"
            required
          />

          <div class="rounded-xl border border-slate-200">
            <div class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              {{ t('admin.pages.users.roles.fields.permissions') }}
            </div>
            <div class="border-b border-slate-200 bg-white px-4 py-2 flex items-center justify-end gap-2">
               <button
                type="button"
                class="text-xs font-medium text-teal-600 hover:text-teal-700"
                @click="selectAllPermissions"
              >
                {{ t('admin.common.selectAll') }}
              </button>
              <span class="text-slate-300">|</span>
              <button
                type="button"
                class="text-xs font-medium text-slate-500 hover:text-slate-700"
                @click="deselectAllPermissions"
              >
                {{ t('admin.common.deselectAll') }}
              </button>
            </div>

            <div class="p-4 space-y-3">
              <div
                v-for="resource in staffResources"
                :key="resource"
                class="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="text-sm font-medium text-slate-900">
                  {{ resourceLabel(resource) }}
                </div>
                <div class="flex flex-wrap items-center gap-4 text-sm text-slate-700">
                  <label v-for="action in staffActions" :key="action" class="inline-flex items-center gap-2">
                    <input
                      v-model="roleForm.permissions[resource][action]"
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-teal-600"
                    />
                    {{ actionLabel(action) }}
                  </label>
                </div>
              </div>

              <p v-if="roleFieldErrors.permissions" class="text-sm text-red-600">
                {{ roleFieldErrors.permissions }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              @click="closeRoleModal()"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="submit"
              class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 disabled:opacity-50"
              :disabled="roleSaving"
            >
              <Icon v-if="roleSaving" name="lucide:loader-circle" class="h-4 w-4 animate-spin" />
              {{ roleSaving ? t('admin.common.saving') : t('admin.common.saveChanges') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseInput from '~/components/ui/BaseInput.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseToggle from '~/components/ui/BaseToggle.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.nav.users'
})

type TenantUser = {
  id: string
  email: string
  role: 'owner' | 'admin' | 'staff'
  isActive: boolean
  staffRoleId?: string | null
  createdAt: string
  updatedAt: string
}

type StaffRole = {
  id: string
  name: string
  permissions: Array<{ resource: string; actions: Array<'create' | 'read' | 'update' | 'delete'> }>
  createdAt: string
  updatedAt: string
}

const authStore = useAuthStore()
const { t, locale } = useI18n({ useScope: 'global' })

const activeTab = ref<'users' | 'roles'>('users')
const search = ref('')
const includeInactive = ref(false)
const errorMessage = ref('')

const token = computed(() => authStore.token as string | null)

const {
  data: users,
  pending,
  refresh
} = await useAsyncData(
  'tenantUsers',
  async () => {
    const res = await $fetch<TenantUser[]>('/api/admin/users', {
      headers: { Authorization: `Bearer ${token.value}` },
      query: { includeInactive: 'true' }
    })
    return res
  },
  { default: () => [] as TenantUser[] }
)

const {
  data: staffRoles,
  pending: rolesPending,
  refresh: refreshRoles
} = await useAsyncData(
  'staffRoles',
  async () => {
    const res = await $fetch<StaffRole[]>('/api/admin/staff-roles', {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    return res
  },
  { default: () => [] as StaffRole[] }
)

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = users.value || []
  const scoped = includeInactive.value ? list : list.filter((u: TenantUser) => u.isActive)
  if (!q) return scoped
  return scoped.filter(
    (u: TenantUser) => u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
  )
})

const formatDate = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale.value)
}

const roleBadgeClass = (role: TenantUser['role']) => {
  if (role === 'owner') return 'bg-indigo-50 text-indigo-700'
  if (role === 'admin') return 'bg-teal-50 text-teal-700'
  return 'bg-amber-50 text-amber-700'
}

const modalOpen = ref(false)
const saving = ref(false)
const editing = ref(false)
const editingUserId = ref<string | null>(null)
const editingUserRole = ref<TenantUser['role'] | null>(null)
const passwordVisible = ref(false)
const confirmPasswordVisible = ref(false)

const roleOptions = computed<Array<TenantUser['role']>>(() => {
  if (editing.value && editingUserRole.value === 'owner') return ['owner']
  const actorRole = authStore.user?.role
  return actorRole === 'owner' ? ['admin', 'staff'] : ['staff']
})

const form = reactive({
  email: '',
  role: 'staff' as TenantUser['role'],
  staffRoleId: '',
  password: '',
  confirmPassword: '',
  isActive: true
})

const fieldErrors = reactive({
  email: '',
  role: '',
  staffRoleId: '',
  password: '',
  confirmPassword: ''
})

const clearFieldErrors = () => {
  fieldErrors.email = ''
  fieldErrors.role = ''
  fieldErrors.staffRoleId = ''
  fieldErrors.password = ''
  fieldErrors.confirmPassword = ''
}

const shouldConfirmPassword = computed(() => {
  if (!editing.value) return true
  return form.password.trim().length > 0
})

watch(
  () => form.role,
  (role) => {
    if (role !== 'staff') {
      form.staffRoleId = ''
      fieldErrors.staffRoleId = ''
      return
    }
    if (!form.staffRoleId) {
      form.staffRoleId = staffRoles.value?.[0]?.id ?? ''
    }
  }
)

watch(
  () => form.password,
  (password) => {
    if (!password.trim()) form.confirmPassword = ''
  }
)

const openCreate = () => {
  errorMessage.value = ''
  clearFieldErrors()
  editing.value = false
  editingUserId.value = null
  editingUserRole.value = null
  passwordVisible.value = false
  confirmPasswordVisible.value = false
  form.email = ''
  form.role = roleOptions.value[0] ?? 'staff'
  form.staffRoleId = staffRoles.value?.[0]?.id ?? ''
  form.password = ''
  form.confirmPassword = ''
  form.isActive = true
  modalOpen.value = true
}

const openEdit = (u: TenantUser) => {
  errorMessage.value = ''
  clearFieldErrors()
  editing.value = true
  editingUserId.value = u.id
  editingUserRole.value = u.role
  passwordVisible.value = false
  confirmPasswordVisible.value = false
  form.email = u.email
  form.role = u.role
  form.staffRoleId = u.role === 'staff' ? (u.staffRoleId ?? '') : ''
  form.password = ''
  form.confirmPassword = ''
  form.isActive = u.isActive
  modalOpen.value = true
}

const closeModal = () => {
  modalOpen.value = false
  saving.value = false
  editing.value = false
  editingUserId.value = null
  editingUserRole.value = null
  passwordVisible.value = false
  confirmPasswordVisible.value = false
  clearFieldErrors()
  form.password = ''
  form.confirmPassword = ''
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320

const validateModal = (): boolean => {
  clearFieldErrors()

  const email = normalizeEmail(form.email)
  if (!isValidEmail(email)) fieldErrors.email = t('admin.pages.users.validation.invalidEmail')

  const allowedRoles = roleOptions.value
  if (!allowedRoles.includes(form.role)) fieldErrors.role = t('admin.pages.users.validation.invalidRole')

  if (form.role === 'staff') {
    if (!form.staffRoleId) {
      fieldErrors.staffRoleId = t('admin.pages.users.validation.staffRoleRequired')
    } else if (!(staffRoles.value || []).some((r) => r.id === form.staffRoleId)) {
      fieldErrors.staffRoleId = t('admin.pages.users.validation.staffRoleInvalid')
    }
  }

  const password = form.password
  const passwordProvided = password.trim().length > 0
  const confirmRequired = !editing.value || passwordProvided

  if (!editing.value) {
    if (password.length < 8) fieldErrors.password = t('admin.pages.users.validation.passwordTooShort')
  } else if (passwordProvided) {
    if (password.length < 8) fieldErrors.password = t('admin.pages.users.validation.passwordTooShort')
  }

  if (confirmRequired && form.confirmPassword.length === 0) {
    fieldErrors.confirmPassword = t('admin.pages.users.validation.confirmPasswordRequired')
  } else if (confirmRequired && form.confirmPassword !== password) {
    fieldErrors.confirmPassword = t('admin.pages.users.validation.passwordsDoNotMatch')
  }

  return (
    !fieldErrors.email &&
    !fieldErrors.role &&
    !fieldErrors.staffRoleId &&
    !fieldErrors.password &&
    !fieldErrors.confirmPassword
  )
}

const submitModal = async () => {
  errorMessage.value = ''
  if (!validateModal()) return
  saving.value = true
  try {
    if (!token.value) throw new Error('Missing token')

    if (!editing.value) {
      await $fetch('/api/admin/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` },
        body: {
          email: normalizeEmail(form.email),
          password: form.password,
          role: form.role,
          ...(form.role === 'staff' ? { staffRoleId: form.staffRoleId } : {})
        }
      })
    } else {
      const id = editingUserId.value
      if (!id) throw new Error('Missing user id')

      const patch: Record<string, any> = {
        email: normalizeEmail(form.email),
        isActive: form.isActive
      }
      if (editingUserRole.value !== 'owner') patch.role = form.role
      if (form.role === 'staff') patch.staffRoleId = form.staffRoleId
      if (form.password.trim()) patch.password = form.password

      await $fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token.value}` },
        body: patch
      })
    }

    await refresh()
    closeModal()
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Error'
  } finally {
    saving.value = false
  }
}

const setActive = async (u: TenantUser, active: boolean) => {
  errorMessage.value = ''
  try {
    if (!token.value) throw new Error('Missing token')
    await $fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { isActive: active }
    })
    await refresh()
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Error'
  }
}

const deactivate = async (u: TenantUser) => {
  errorMessage.value = ''
  try {
    if (!token.value) throw new Error('Missing token')
    await $fetch(`/api/admin/users/${u.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token.value}` }
    })
    await refresh()
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Error'
  }
}

const cannotDeactivate = (u: TenantUser): boolean => {
  if (u.role === 'owner') return true
  const actorRole = authStore.user?.role
  if (actorRole === 'admin' && u.role === 'admin') {
    return authStore.user?.id !== u.id
  }
  return false
}

const staffRoleName = (staffRoleId: string | null | undefined): string => {
  if (!staffRoleId) return t('admin.pages.users.roles.unassigned')
  const found = (staffRoles.value || []).find((r) => r.id === staffRoleId)
  return found?.name ?? t('admin.pages.users.roles.unassigned')
}

const getPermissionDisplay = (permissions: StaffRole['permissions']) => {
  if (!permissions || permissions.length === 0) return []
  return permissions.map((p) => {
    const actions = p.actions
    const isFull = actions.length === 4
    const isViewOnly = actions.length === 1 && actions[0] === 'read'

    let type = 'custom'
    let badgeClass = 'border-slate-200 bg-slate-50'

    if (isFull) {
      type = 'full'
      badgeClass = 'border-teal-200 bg-teal-50'
    } else if (isViewOnly) {
      type = 'view'
      badgeClass = 'border-blue-200 bg-blue-50'
    }

    return {
      resource: resourceLabel(p.resource),
      type,
      badgeClass,
      actions
    }
  })
}

const getHiddenPermissionsTitle = (permissions: StaffRole['permissions']) => {
  const all = getPermissionDisplay(permissions)
  if (all.length <= 2) return ''
  return all.slice(2).map((p) => p.resource).join(', ')
}

const staffResources = [
  'dashboard',
  'products',
  'categories',
  'variants',
  'inventory',
  'orders',
  'sales',
  'purchases',
  'suppliers',
  'customers',
  'delivery',
  'cash',
  'billing',
  'storeSettings',
  'homepageSettings',
  'contactInfos',
  'integrations',
  'metaPixels',
  'pos'
] as const

const staffActions = ['create', 'read', 'update', 'delete'] as const

const resourceLabel = (resource: string): string => {
  const keyMap: Record<string, string> = {
    dashboard: 'admin.nav.dashboard',
    products: 'admin.nav.products',
    categories: 'admin.nav.categories',
    variants: 'admin.pages.users.roles.resources.variants',
    inventory: 'admin.nav.inventory',
    orders: 'admin.nav.orders',
    sales: 'admin.nav.salesItem',
    purchases: 'admin.nav.purchases',
    suppliers: 'admin.nav.suppliers',
    customers: 'admin.nav.customers',
    delivery: 'admin.nav.deliveryItem',
    cash: 'admin.nav.cash',
    billing: 'admin.nav.billing',
    storeSettings: 'admin.nav.appearance',
    homepageSettings: 'admin.nav.homepage',
    contactInfos: 'admin.nav.contactInfo',
    integrations: 'admin.nav.integrations',
    metaPixels: 'admin.pages.users.roles.resources.metaPixels',
    pos: 'admin.nav.pos'
  }
  const key = keyMap[resource] || resource
  return t(key)
}

const actionLabel = (action: (typeof staffActions)[number]): string => t(`admin.pages.users.roles.actions.${action}`)

const roleModalOpen = ref(false)
const roleSaving = ref(false)
const roleEditing = ref(false)
const editingRoleId = ref<string | null>(null)

const roleForm = reactive({
  name: '',
  permissions: Object.fromEntries(
    staffResources.map((r) => [r, Object.fromEntries(staffActions.map((a) => [a, false]))])
  ) as Record<(typeof staffResources)[number], Record<(typeof staffActions)[number], boolean>>
})

const roleFieldErrors = reactive({
  name: '',
  permissions: ''
})

const clearRoleErrors = () => {
  roleFieldErrors.name = ''
  roleFieldErrors.permissions = ''
}

const openCreateRole = () => {
  errorMessage.value = ''
  clearRoleErrors()
  roleEditing.value = false
  editingRoleId.value = null
  roleForm.name = ''
  for (const r of staffResources) {
    for (const a of staffActions) roleForm.permissions[r][a] = false
  }
  roleModalOpen.value = true
}

const openEditRole = (role: StaffRole) => {
  errorMessage.value = ''
  clearRoleErrors()
  roleEditing.value = true
  editingRoleId.value = role.id
  roleForm.name = role.name
  for (const r of staffResources) {
    for (const a of staffActions) roleForm.permissions[r][a] = false
  }
  for (const p of role.permissions || []) {
    if (!staffResources.includes(p.resource as any)) continue
    for (const a of p.actions) {
      if (staffActions.includes(a as any)) roleForm.permissions[p.resource as any][a as any] = true
    }
  }
  roleModalOpen.value = true
}

const closeRoleModal = () => {
  roleModalOpen.value = false
  roleSaving.value = false
  roleEditing.value = false
  editingRoleId.value = null
  clearRoleErrors()
}

const selectAllPermissions = () => {
  for (const r of staffResources) {
    for (const a of staffActions) {
      roleForm.permissions[r][a] = true
    }
  }
}

const deselectAllPermissions = () => {
  for (const r of staffResources) {
    for (const a of staffActions) {
      roleForm.permissions[r][a] = false
    }
  }
}

const validateRoleModal = (): boolean => {
  clearRoleErrors()
  if (!roleForm.name.trim() || roleForm.name.trim().length < 2) {
    roleFieldErrors.name = t('admin.pages.users.roles.validation.invalidName')
  }

  const permissionsPayload: Array<{ resource: string; actions: string[] }> = []
  for (const r of staffResources) {
    const actions = staffActions.filter((a) => roleForm.permissions[r][a])
    if (actions.length) permissionsPayload.push({ resource: r, actions })
  }
  if (permissionsPayload.length === 0) {
    roleFieldErrors.permissions = t('admin.pages.users.roles.validation.permissionsRequired')
  }

  return !roleFieldErrors.name && !roleFieldErrors.permissions
}

const submitRoleModal = async () => {
  errorMessage.value = ''
  if (!validateRoleModal()) return
  roleSaving.value = true
  try {
    if (!token.value) throw new Error('Missing token')

    const permissionsPayload: Array<{ resource: string; actions: Array<'create' | 'read' | 'update' | 'delete'> }> = []
    for (const r of staffResources) {
      const actions = staffActions.filter((a) => roleForm.permissions[r][a])
      if (actions.length) permissionsPayload.push({ resource: r, actions: actions as any })
    }

    if (!roleEditing.value) {
      await $fetch('/api/admin/staff-roles', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` },
        body: { name: roleForm.name.trim(), permissions: permissionsPayload }
      })
    } else {
      const id = editingRoleId.value
      if (!id) throw new Error('Missing role id')
      await $fetch(`/api/admin/staff-roles/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token.value}` },
        body: { name: roleForm.name.trim(), permissions: permissionsPayload }
      })
    }

    await refreshRoles()
    await refresh()
    closeRoleModal()
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Error'
  } finally {
    roleSaving.value = false
  }
}

const deleteRole = async (role: StaffRole) => {
  errorMessage.value = ''
  try {
    if (!token.value) throw new Error('Missing token')
    await $fetch(`/api/admin/staff-roles/${role.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token.value}` }
    })
    await refreshRoles()
    await refresh()
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Error'
  }
}
</script>
