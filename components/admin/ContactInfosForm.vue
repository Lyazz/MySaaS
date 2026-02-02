<template>
  <div class="space-y-6">
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="p-6 md:p-8 flex items-start justify-between gap-6">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Store Contact Info</h2>
          <p class="text-slate-600 mt-2 max-w-2xl">
            Add phone numbers, emails, address and social media links. Active items are shown in your storefront footer.
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
          :disabled="loading"
          @click="addDraft"
        >
          <Icon name="lucide:plus" class="w-4 h-4" />
          Add
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
      {{ errorMessage }}
    </div>

    <div v-if="draft" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="p-6 md:p-8 space-y-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
              <Icon :name="kindDef(draft.kind).iconName" class="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <div class="text-sm font-semibold text-slate-900">New contact item</div>
              <div class="text-xs text-slate-500">Choose a type and value, then create.</div>
            </div>
          </div>

          <button type="button" class="text-sm text-slate-500 hover:text-slate-700" @click="draft = null">
            Cancel
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div class="md:col-span-4">
            <label class="block text-sm font-medium text-slate-700 mb-2">Type</label>
            <select
              v-model="draft.kind"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option v-for="d in kindDefs" :key="d.kind" :value="d.kind">{{ d.label }}</option>
            </select>
          </div>

          <div class="md:col-span-4">
            <label class="block text-sm font-medium text-slate-700 mb-2">Label (optional)</label>
            <input
              v-model="draft.label"
              type="text"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Support, Sales…"
            >
          </div>

          <div class="md:col-span-4">
            <label class="block text-sm font-medium text-slate-700 mb-2">Value</label>
            <input
              v-model="draft.value"
              type="text"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              :placeholder="kindDef(draft.kind).placeholder"
            >
          </div>
        </div>

        <div class="flex items-center justify-between gap-4">
          <div class="text-xs text-slate-500">
            Preview link:
            <span class="font-mono text-slate-700">{{ buildHref(draft.kind, draft.value || '') || '—' }}</span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
            :disabled="creating || !draft.value?.trim()"
            @click="createDraft"
          >
            <Icon v-if="creating" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
            Create
          </button>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="p-6 md:p-8">
        <div class="flex items-center justify-between gap-4 mb-6">
          <h3 class="text-lg font-semibold text-slate-900">Items</h3>
          <div class="text-sm text-slate-500">{{ items.length }} total</div>
        </div>

        <div v-if="loading" class="text-sm text-slate-500">Loading…</div>

        <div v-else class="space-y-4">
          <div
            v-for="(item, index) in items"
            :key="item.id"
            class="rounded-xl border border-slate-200 p-4 md:p-5"
          >
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div class="flex items-start gap-3 flex-1">
                <div class="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <Icon :name="kindDef(item.kind).iconName" class="w-5 h-5 text-slate-700" />
                </div>

                <div class="flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <select
                      v-model="item.kind"
                      class="px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      @change="saveItem(item)"
                    >
                      <option v-for="d in kindDefs" :key="d.kind" :value="d.kind">{{ d.label }}</option>
                    </select>
                    <label class="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        v-model="item.isActive"
                        type="checkbox"
                        class="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        @change="saveItem(item)"
                      >
                      Active
                    </label>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <input
                      v-model="item.label"
                      type="text"
                      class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Label (optional)"
                      @blur="saveItem(item)"
                    >
                    <input
                      v-model="item.value"
                      type="text"
                      class="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      :placeholder="kindDef(item.kind).placeholder"
                      @blur="saveItem(item)"
                    >
                  </div>

                  <div class="mt-2 text-xs text-slate-500">
                    Preview link:
                    <span class="font-mono text-slate-700">{{ buildHref(item.kind, item.value || '') || '—' }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  class="h-10 w-10 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50"
                  title="Move up"
                  :disabled="index === 0"
                  @click="moveItem(index, -1)"
                >
                  <Icon name="lucide:chevron-up" class="w-5 h-5 mx-auto" />
                </button>
                <button
                  type="button"
                  class="h-10 w-10 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50"
                  title="Move down"
                  :disabled="index === items.length - 1"
                  @click="moveItem(index, 1)"
                >
                  <Icon name="lucide:chevron-down" class="w-5 h-5 mx-auto" />
                </button>
                <button
                  type="button"
                  class="h-10 w-10 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 disabled:opacity-50"
                  title="Delete"
                  :disabled="savingIds.has(item.id)"
                  @click="deleteItem(item)"
                >
                  <Icon name="lucide:trash-2" class="w-5 h-5 mx-auto" />
                </button>
              </div>
            </div>
          </div>

          <div v-if="items.length === 0" class="text-sm text-slate-500">
            No contact infos yet. Click “Add” to create your first one.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import {
  CONTACT_INFO_KIND_DEFS,
  CONTACT_INFO_DEF_BY_KIND,
  buildContactInfoHref,
  type ContactInfoKind
} from '~/shared/contact-infos'

type ContactInfoItem = {
  id: string
  tenantId: string
  kind: ContactInfoKind
  label: string | null
  value: string
  position: number
  isActive: boolean
}

const authStore = useAuthStore()
const loading = ref(false)
const creating = ref(false)
const errorMessage = ref('')
const items = ref<ContactInfoItem[]>([])
const savingIds = ref(new Set<string>())

const kindDefs = CONTACT_INFO_KIND_DEFS
const kindDef = (kind: ContactInfoKind) => CONTACT_INFO_DEF_BY_KIND[kind]
const buildHref = (kind: ContactInfoKind, value: string) => buildContactInfoHref(kind, value)

const draft = ref<{ kind: ContactInfoKind; label: string; value: string } | null>(null)

const fetchItems = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch<{ items: ContactInfoItem[] }>('/api/admin/contact-infos', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    items.value = (res.items || []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  } catch (e: any) {
    console.error('Failed to load contact infos', e)
    errorMessage.value = e.data?.statusMessage || 'Failed to load contact infos.'
  } finally {
    loading.value = false
  }
}

const addDraft = () => {
  draft.value = { kind: 'phone', label: '', value: '' }
}

const createDraft = async () => {
  if (!draft.value) return
  creating.value = true
  errorMessage.value = ''
  try {
    const created = await $fetch<ContactInfoItem>('/api/admin/contact-infos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        kind: draft.value.kind,
        label: draft.value.label?.trim() || null,
        value: draft.value.value
      }
    })
    items.value = [...items.value, created].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    useState<any[]>('contactInfos', () => []).value = items.value.filter((i) => i.isActive)
    draft.value = null
  } catch (e: any) {
    console.error('Failed to create contact info', e)
    errorMessage.value = e.data?.statusMessage || 'Failed to create contact info.'
  } finally {
    creating.value = false
  }
}

const saveItem = async (item: ContactInfoItem) => {
  if (!item?.id) return
  savingIds.value.add(item.id)
  errorMessage.value = ''
  try {
    const updated = await $fetch<ContactInfoItem>(`/api/admin/contact-infos/${item.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        kind: item.kind,
        label: item.label,
        value: item.value,
        position: item.position,
        isActive: item.isActive
      }
    })

    items.value = items.value.map((x) => (x.id === updated.id ? { ...x, ...updated } : x))
    useState<any[]>('contactInfos', () => []).value = items.value.filter((i) => i.isActive)
  } catch (e: any) {
    console.error('Failed to update contact info', e)
    errorMessage.value = e.data?.statusMessage || 'Failed to update contact info.'
  } finally {
    savingIds.value.delete(item.id)
  }
}

const moveItem = async (index: number, direction: -1 | 1) => {
  const a = items.value[index]
  const b = items.value[index + direction]
  if (!a || !b) return

  const aPos = a.position
  const bPos = b.position
  a.position = bPos
  b.position = aPos

  items.value = items.value.slice().sort((x, y) => (x.position ?? 0) - (y.position ?? 0))
  await Promise.all([saveItem(a), saveItem(b)])
}

const deleteItem = async (item: ContactInfoItem) => {
  if (!confirm('Delete this contact item?')) return
  savingIds.value.add(item.id)
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/contact-infos/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    items.value = items.value.filter((x) => x.id !== item.id)
    useState<any[]>('contactInfos', () => []).value = items.value.filter((i) => i.isActive)
  } catch (e: any) {
    console.error('Failed to delete contact info', e)
    errorMessage.value = e.data?.statusMessage || 'Failed to delete contact info.'
  } finally {
    savingIds.value.delete(item.id)
  }
}

onMounted(() => {
  fetchItems()
})
</script>

