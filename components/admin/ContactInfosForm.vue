<template>
  <div class="max-w-4xl mx-auto space-y-8 pb-24">
    <div class="space-y-6">
      <div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold" style="color: var(--text-primary)">{{ t('admin.contactInfosForm.title') }}</h1>
          <p style="color: var(--text-secondary)" class="mt-1 max-w-2xl">
            {{ t('admin.contactInfosForm.subtitle') }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="ui-btn ui-btn--secondary"
            :disabled="loading"
            @click="fetchItems"
          >
            {{ t('admin.common.reset') || 'Cancel' }}
          </button>

          <button
            type="button"
            class="ui-btn ui-btn--secondary"
            :disabled="loading"
            @click="addDraft"
          >
            <Icon name="lucide:plus" class="w-4 h-4" />
            {{ t('admin.common.create') }}
          </button>

          <button
            type="button"
            class="px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            :disabled="loading"
            @click="fetchItems"
          >
            {{ t('admin.common.saveChanges') || 'Save' }}
          </button>
        </div>
      </div>

    <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
      {{ errorMessage }}
    </div>

    <div v-if="draft" class="rounded-xl shadow-sm overflow-hidden" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
      <div class="p-6 md:p-8 space-y-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg flex items-center justify-center" style="background: var(--surface-3); border: 1px solid var(--surface-border)">
              <Icon :name="kindDef(draft.kind).iconName" class="w-5 h-5" style="color: var(--text-secondary)" />
            </div>
            <div>
              <div class="text-sm font-semibold" style="color: var(--text-primary)">{{ t('admin.contactInfosForm.draft.title') }}</div>
              <div class="text-xs" style="color: var(--text-tertiary)">{{ t('admin.contactInfosForm.draft.subtitle') }}</div>
            </div>
          </div>

          <button type="button" class="ui-btn ui-btn--secondary" @click="draft = null">
            {{ t('admin.common.cancel') }}
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div class="md:col-span-4">
            <label class="ui-label mb-2 block">{{ t('admin.contactInfosForm.fields.type') }}</label>
            <select
              v-model="draft.kind"
              class="ui-input w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:[--tw-ring-color:var(--brand)]"
            >
              <option v-for="d in kindDefs" :key="d.kind" :value="d.kind">{{ d.label }}</option>
            </select>
          </div>

          <div class="md:col-span-4">
            <label class="ui-label mb-2 block">{{ t('admin.contactInfosForm.fields.labelOptional') }}</label>
            <input
              v-model="draft.label"
              type="text"
              class="ui-input w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:[--tw-ring-color:var(--brand)]"
              :placeholder="t('admin.contactInfosForm.fields.labelPlaceholder')"
            >
          </div>

          <div class="md:col-span-4">
            <label class="ui-label mb-2 block">{{ t('admin.contactInfosForm.fields.value') }}</label>
            <input
              v-model="draft.value"
              type="text"
              class="ui-input w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:[--tw-ring-color:var(--brand)]"
              :placeholder="kindDef(draft.kind).placeholder"
            >
          </div>
        </div>

        <div class="flex items-center justify-between gap-4">
          <div class="text-xs" style="color: var(--text-tertiary)">
            {{ t('admin.contactInfosForm.previewLink') }}
            <span class="font-mono" style="color: var(--text-secondary)">{{ buildHref(draft.kind, draft.value || '') || '—' }}</span>
          </div>
          <button
            type="button"
            class="px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            :disabled="creating || !draft.value?.trim()"
            @click="createDraft"
          >
            <Icon v-if="creating" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
            {{ creating ? t('admin.common.creating') : t('admin.common.create') }}
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-xl shadow-sm overflow-hidden" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
      <div class="p-6 md:p-8">
        <div class="flex items-center justify-between gap-4 mb-6">
          <h3 class="text-lg font-semibold" style="color: var(--text-primary)">{{ t('admin.contactInfosForm.items.title') }}</h3>
          <div class="text-sm" style="color: var(--text-tertiary)">{{ t('admin.contactInfosForm.items.total', { count: items.length }) }}</div>
        </div>

        <div v-if="loading" class="text-sm" style="color: var(--text-tertiary)">{{ t('admin.common.loading') }}</div>

        <div v-else class="space-y-4">
          <div
            v-for="(item, index) in items"
            :key="item.id"
            class="rounded-xl transition-all duration-200 relative group shadow-sm"
            style="background: var(--surface-2); border: 1px solid var(--surface-border)"
          >
            <div class="p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div class="flex items-start gap-3 flex-1">
                <div class="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style="background: var(--surface-3); border: 1px solid var(--surface-border)">
                  <Icon :name="kindDef(item.kind).iconName" class="w-5 h-5" style="color: var(--text-secondary)" />
                </div>

                <div class="flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <select
                      v-model="item.kind"
                      class="ui-input px-2.5 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:[--tw-ring-color:var(--brand)]"
                      @change="saveItem(item)"
                    >
                      <option v-for="d in kindDefs" :key="d.kind" :value="d.kind">{{ d.label }}</option>
                    </select>
                    <label class="inline-flex items-center gap-2 text-sm" style="color: var(--text-secondary)">
                      <input
                        v-model="item.isActive"
                        type="checkbox"
                        class="rounded [color:var(--brand)] focus:[--tw-ring-color:var(--brand)]"
                        @change="saveItem(item)"
                      >
                      {{ t('admin.common.active') }}
                    </label>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <input
                      v-model="item.label"
                      type="text"
                      class="ui-input w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:[--tw-ring-color:var(--brand)]"
                      :placeholder="t('admin.contactInfosForm.fields.labelOptional')"
                      @blur="saveItem(item)"
                    >
                    <input
                      v-model="item.value"
                      type="text"
                      class="ui-input w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:[--tw-ring-color:var(--brand)]"
                      :placeholder="kindDef(item.kind).placeholder"
                      @blur="saveItem(item)"
                    >
                  </div>

                  <div class="mt-2 text-xs" style="color: var(--text-tertiary)">
                    {{ t('admin.contactInfosForm.previewLink') }}
                    <span class="font-mono" style="color: var(--text-secondary)">{{ buildHref(item.kind, item.value || '') || '—' }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  class="h-10 w-10 rounded-lg disabled:opacity-50" style="border: 1px solid var(--surface-border); color: var(--text-secondary)"
                  :title="t('admin.contactInfosForm.actions.moveUp')"
                  :disabled="index === 0"
                  @click="moveItem(index, -1)"
                >
                  <Icon name="lucide:chevron-up" class="w-5 h-5 mx-auto" />
                </button>
                <button
                  type="button"
                  class="h-10 w-10 rounded-lg disabled:opacity-50" style="border: 1px solid var(--surface-border); color: var(--text-secondary)"
                  :title="t('admin.contactInfosForm.actions.moveDown')"
                  :disabled="index === items.length - 1"
                  @click="moveItem(index, 1)"
                >
                  <Icon name="lucide:chevron-down" class="w-5 h-5 mx-auto" />
                </button>
                <button
                  type="button"
                  class="h-10 w-10 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 disabled:opacity-50"
                  :title="t('admin.common.delete')"
                  :disabled="savingIds.has(item.id)"
                  @click="deleteItem(item)"
                >
                  <Icon name="lucide:trash-2" class="w-5 h-5 mx-auto" />
                </button>
              </div>
            </div>
          </div>

          <div v-if="items.length === 0" class="text-sm text-center py-12 rounded-xl border-2 border-dashed" style="color: var(--text-tertiary); background: var(--surface-2); border-color: var(--surface-border)">
            <Icon name="lucide:list" class="w-12 h-12 mx-auto mb-3" style="color: var(--text-muted)" />
            <p class="font-medium" style="color: var(--text-tertiary)">{{ t('admin.contactInfosForm.items.empty') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions Footer -->
    <div class="fixed bottom-6 right-6 md:static md:flex md:justify-end mt-6">
       <div class="md:bg-transparent p-2 md:p-0 rounded-full shadow-lg md:shadow-none md:border-none flex items-center gap-3" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
          <button
            type="button"
            class="hidden md:inline-flex ui-btn ui-btn--secondary"
            :disabled="loading"
            @click="fetchItems"
          >
            {{ t('admin.common.reset') || 'Cancel' }}
          </button>
          
          <button
            type="button"
            class="inline-flex px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2 justify-center min-w-[140px]"
            :disabled="loading"
            @click="fetchItems"
          >
            {{ t('admin.common.saveChanges') || 'Save' }}
          </button>
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
const { t } = useI18n({ useScope: 'global' })
const loading = ref(false)
const creating = ref(false)
const errorMessage = ref('')
const items = ref<ContactInfoItem[]>([])
const savingIds = ref(new Set<string>())

const kindDefs = computed(() => {
  return CONTACT_INFO_KIND_DEFS.map((d) => ({
    ...d,
    label: t(`admin.contactInfosForm.kinds.${d.kind}.label`),
    placeholder: t(`admin.contactInfosForm.kinds.${d.kind}.placeholder`)
  }))
})

const kindDef = (kind: ContactInfoKind) => {
  return kindDefs.value.find((d) => d.kind === kind) || CONTACT_INFO_DEF_BY_KIND[kind]
}
const buildHref = (kind: ContactInfoKind, value: string) => buildContactInfoHref(kind, value)

const draft = ref<{ kind: ContactInfoKind; label: string; value: string } | null>(null)

const fetchItems = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch('/api/admin/contact-infos', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    }) as { items: ContactInfoItem[] }
    items.value = (res.items || []).slice().sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
  } catch (e: any) {
    console.error('Failed to load contact infos', e)
    errorMessage.value = e.data?.statusMessage || t('admin.contactInfosForm.messages.loadFailed')
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
    const created = await $fetch('/api/admin/contact-infos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        kind: draft.value.kind,
        label: draft.value.label?.trim() || null,
        value: draft.value.value
      }
    }) as ContactInfoItem
    items.value = [...items.value, created].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    useState<any[]>('contactInfos', () => []).value = items.value.filter((i) => i.isActive)
    draft.value = null
  } catch (e: any) {
    console.error('Failed to create contact info', e)
    errorMessage.value = e.data?.statusMessage || t('admin.contactInfosForm.messages.createFailed')
  } finally {
    creating.value = false
  }
}

const saveItem = async (item: ContactInfoItem) => {
  if (!item?.id) return
  savingIds.value.add(item.id)
  errorMessage.value = ''
  try {
    const updated = await $fetch(`/api/admin/contact-infos/${item.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        kind: item.kind,
        label: item.label,
        value: item.value,
        position: item.position,
        isActive: item.isActive
      }
    }) as ContactInfoItem

    items.value = items.value.map((x) => (x.id === updated.id ? { ...x, ...updated } : x))
    useState<any[]>('contactInfos', () => []).value = items.value.filter((i) => i.isActive)
  } catch (e: any) {
    console.error('Failed to update contact info', e)
    errorMessage.value = e.data?.statusMessage || t('admin.contactInfosForm.messages.updateFailed')
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
  if (!confirm(t('admin.contactInfosForm.confirm.delete'))) return
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
    errorMessage.value = e.data?.statusMessage || t('admin.contactInfosForm.messages.deleteFailed')
  } finally {
    savingIds.value.delete(item.id)
  }
}

onMounted(() => {
  fetchItems()
})
</script>
