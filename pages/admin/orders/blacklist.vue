<template>
  <div class="max-w-5xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-primary">
          {{ t('admin.pages.orders.blacklist.title', 'Order blacklist') }}
        </h2>
        <p class="mt-1 text-secondary">
          {{ t('admin.pages.orders.blacklist.subtitle', 'Phone numbers, IP addresses and customers blocked from checking out.') }}
        </p>
      </div>
      <NuxtLink
        to="/admin/orders"
        class="ui-btn ui-btn--secondary flex items-center gap-2"
      >
        <Icon name="lucide:arrow-left" class="w-4 h-4" />
        {{ t('admin.pages.orders.blacklist.backToOrders', 'Back to orders') }}
      </NuxtLink>
    </div>

    <!-- Add entry -->
    <form class="ui-card p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end" @submit.prevent="submitCreate">
      <div>
        <label class="ui-label mb-1 block">{{ t('admin.pages.orders.blacklist.form.type', 'Type') }}</label>
        <select v-model="form.type" class="ui-input">
          <option value="PHONE">{{ t('admin.pages.orders.blacklist.types.PHONE', 'Phone') }}</option>
          <option value="IP">{{ t('admin.pages.orders.blacklist.types.IP', 'IP address') }}</option>
        </select>
      </div>
      <div>
        <label class="ui-label mb-1 block">{{ t('admin.pages.orders.blacklist.form.value', 'Value') }}</label>
        <BaseInput
          v-model="form.value"
          type="text"
          :placeholder="form.type === 'IP' ? '41.111.x.x' : '0555 12 34 56'"
          required
        />
      </div>
      <div>
        <label class="ui-label mb-1 block">{{ t('admin.pages.orders.blacklist.form.reason', 'Reason (optional)') }}</label>
        <BaseInput
          v-model="form.reason"
          type="text"
          :placeholder="t('admin.pages.orders.blacklist.form.reasonPlaceholder', 'e.g. repeated fake orders')"
        />
      </div>
      <div>
        <button type="submit" class="ui-btn ui-btn--primary ui-btn--md w-full" :disabled="submitting">
          <Icon name="lucide:shield-ban" class="w-4 h-4 me-2" />
          {{ t('admin.pages.orders.blacklist.form.submit', 'Add to blacklist') }}
        </button>
      </div>
      <p v-if="formError" class="md:col-span-4 text-sm text-red-500">
        {{ formError }}
      </p>
    </form>

    <!-- Loading -->
    <div v-if="loading" class="ui-card p-12 text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 [border-color:var(--brand)]" />
    </div>

    <!-- Empty -->
    <div v-else-if="entries.length === 0" class="ui-card p-12 text-center">
      <Icon name="lucide:shield-check" class="mx-auto h-12 w-12 text-muted" />
      <h3 class="mt-2 text-sm font-medium text-primary">
        {{ t('admin.pages.orders.blacklist.empty.title', 'No blacklisted entries') }}
      </h3>
      <p class="mt-1 text-sm text-tertiary">
        {{ t('admin.pages.orders.blacklist.empty.hint', 'Phone numbers, IPs, and customers you block will show up here.') }}
      </p>
    </div>

    <!-- Table -->
    <div v-else class="ui-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="ui-table">
          <thead class="ui-thead">
            <tr>
              <th class="ui-th">{{ t('admin.pages.orders.blacklist.table.type', 'Type') }}</th>
              <th class="ui-th">{{ t('admin.pages.orders.blacklist.table.value', 'Value') }}</th>
              <th class="ui-th">{{ t('admin.pages.orders.blacklist.table.reason', 'Reason') }}</th>
              <th class="ui-th">{{ t('admin.pages.orders.blacklist.table.createdAt', 'Added') }}</th>
              <th class="ui-th text-end">{{ t('admin.common.actions', 'Actions') }}</th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr v-for="entry in entries" :key="entry.id" class="ui-tr">
              <td class="ui-td whitespace-nowrap">
                <span class="ui-badge">{{ t(`admin.pages.orders.blacklist.types.${entry.type}`, entry.type) }}</span>
              </td>
              <td class="ui-td whitespace-nowrap text-primary">
                {{ entry.type === 'CUSTOMER' ? (entry.customer?.name || entry.value) : entry.value }}
              </td>
              <td class="ui-td text-sm text-secondary">
                {{ entry.reason || '—' }}
              </td>
              <td class="ui-td whitespace-nowrap text-sm text-secondary">
                {{ formatDate(entry.createdAt) }}
              </td>
              <td class="ui-td whitespace-nowrap text-end">
                <button
                  class="ui-table-action ui-table-action--danger"
                  :title="t('admin.common.delete', 'Delete')"
                  @click="removeEntry(entry)"
                >
                  <Icon name="lucide:trash" class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AdminConfirmModal
      v-model="deleteOpen"
      :title="t('admin.confirmModal.defaults.title', 'Are you sure?')"
      :message="t('admin.pages.orders.blacklist.deleteConfirm', 'Remove this entry from the blacklist?')"
      :confirm-text="t('admin.common.delete', 'Delete')"
      :error="deleteError"
      @confirm="confirmRemove"
      @cancel="deleteError = null"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseInput from '~/components/ui/BaseInput.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.orders.blacklist.title'
})

const authStore = useAuthStore()
const { t, locale } = useI18n({ useScope: 'global' })

interface BlacklistEntry {
  id: string
  type: 'PHONE' | 'CUSTOMER' | 'IP'
  value: string
  reason: string | null
  createdAt: string
  customer: { id: string; name: string; phone: string } | null
}

const entries = ref<BlacklistEntry[]>([])
const loading = ref(true)
const submitting = ref(false)
const formError = ref<string | null>(null)
const form = ref({ type: 'PHONE' as 'PHONE' | 'IP', value: '', reason: '' })

const deleteOpen = ref(false)
const deleteError = ref<string | null>(null)
const entryToDelete = ref<BlacklistEntry | null>(null)

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const intlLocale = locale.value === 'fr' ? 'fr-FR' : locale.value === 'ar' ? 'ar-DZ' : 'en-US'
  return date.toLocaleDateString(intlLocale, { year: 'numeric', month: 'short', day: 'numeric' })
}

async function fetchEntries() {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/blacklist', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    }) as { items: BlacklistEntry[] }
    entries.value = data.items
  } catch (error) {
    console.error('Failed to fetch blacklist entries:', error)
  } finally {
    loading.value = false
  }
}

async function submitCreate() {
  formError.value = null
  submitting.value = true
  try {
    await $fetch('/api/admin/blacklist', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { type: form.value.type, value: form.value.value, reason: form.value.reason || undefined }
    })
    form.value.value = ''
    form.value.reason = ''
    await fetchEntries()
  } catch (error: any) {
    console.error('Failed to create blacklist entry:', error)
    formError.value = error?.data?.statusMessage || t('admin.common.error', 'An error occurred. Please try again.')
  } finally {
    submitting.value = false
  }
}

function removeEntry(entry: BlacklistEntry) {
  entryToDelete.value = entry
  deleteError.value = null
  deleteOpen.value = true
}

async function confirmRemove() {
  if (!entryToDelete.value) return
  try {
    await $fetch(`/api/admin/blacklist/${entryToDelete.value.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    entries.value = entries.value.filter((e) => e.id !== entryToDelete.value?.id)
    deleteOpen.value = false
  } catch (error: any) {
    console.error('Failed to delete blacklist entry:', error)
    deleteError.value = error?.data?.statusMessage || t('admin.common.error', 'An error occurred. Please try again.')
  }
}

onMounted(() => {
  fetchEntries()
})
</script>
