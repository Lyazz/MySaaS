<template>
  <div class="contact-form">
    <SettingsPageHeader
      :title="t('admin.contactInfosForm.title')"
      :subtitle="t('admin.contactInfosForm.subtitle')"
    >
      <template #actions>
        <button
          type="button"
          class="header-action header-action-primary"
          :disabled="loading || !!draft"
          @click="addDraft"
        >
          <Icon name="lucide:plus" class="w-3.5 h-3.5" />
          {{ t('admin.common.create') }}
        </button>
      </template>
    </SettingsPageHeader>

    <SettingsStatus
      :message="errorMessage"
      type="error"
    />

    <SettingsSection
      icon="lucide:phone"
      :title="t('admin.contactInfosForm.items.title')"
      :subtitle="t('admin.contactInfosForm.subtitle')"
    >
      <template #aside>
        <span class="contact-count">{{ t('admin.contactInfosForm.items.total', { count: items.length }) }}</span>
      </template>

      <!-- Draft (new entry) -->
      <Transition name="contact-draft">
        <div v-if="draft" class="contact-draft">
          <div class="contact-draft-head">
            <div class="contact-draft-icon">
              <Icon :name="kindDef(draft.kind).iconName" class="w-4 h-4" />
            </div>
            <div class="contact-draft-titles">
              <p class="contact-draft-title">{{ t('admin.contactInfosForm.draft.title') }}</p>
              <p class="contact-draft-subtitle">{{ t('admin.contactInfosForm.draft.subtitle') }}</p>
            </div>
            <button type="button" class="contact-draft-cancel" @click="draft = null">
              <Icon name="lucide:x" class="w-3.5 h-3.5" />
              {{ t('admin.common.cancel') }}
            </button>
          </div>

          <div class="contact-grid">
            <div class="field contact-field-type">
              <label class="field-label">{{ t('admin.contactInfosForm.fields.type') }}</label>
              <select v-model="draft.kind" class="field-input">
                <option v-for="d in kindDefs" :key="d.kind" :value="d.kind">{{ d.label }}</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">{{ t('admin.contactInfosForm.fields.labelOptional') }}</label>
              <input
                v-model="draft.label"
                type="text"
                class="field-input"
                :placeholder="t('admin.contactInfosForm.fields.labelPlaceholder')"
              >
            </div>
            <div class="field">
              <label class="field-label">{{ t('admin.contactInfosForm.fields.value') }}</label>
              <input
                v-model="draft.value"
                type="text"
                class="field-input"
                :placeholder="kindDef(draft.kind).placeholder"
              >
            </div>
          </div>

          <div class="contact-draft-foot">
            <p class="contact-preview">
              <span class="contact-preview-label">{{ t('admin.contactInfosForm.previewLink') }}</span>
              <span class="contact-preview-value">{{ buildHref(draft.kind, draft.value || '') || '—' }}</span>
            </p>
            <button
              type="button"
              class="header-action header-action-primary"
              :disabled="creating || !draft.value?.trim()"
              @click="createDraft"
            >
              <Icon v-if="creating" name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
              <Icon v-else name="lucide:check" class="w-3.5 h-3.5" />
              {{ creating ? t('admin.common.creating') : t('admin.common.create') }}
            </button>
          </div>
        </div>
      </Transition>

      <div v-if="loading" class="contact-loading">
        <Icon name="lucide:loader-2" class="w-4 h-4 animate-spin" />
        <span>{{ t('admin.common.loading') }}</span>
      </div>

      <div v-else-if="items.length === 0 && !draft" class="contact-empty">
        <Icon name="lucide:phone-off" class="contact-empty-icon" />
        <p class="contact-empty-title">{{ t('admin.contactInfosForm.items.empty') }}</p>
        <button type="button" class="contact-empty-cta" @click="addDraft">
          <Icon name="lucide:plus" class="w-3.5 h-3.5" />
          {{ t('admin.common.create') }}
        </button>
      </div>

      <div v-else class="contact-list">
        <div
          v-for="(item, index) in items"
          :key="item.id"
          class="contact-row"
          :class="{ 'is-inactive': !item.isActive }"
        >
          <div class="contact-row-icon">
            <Icon :name="kindDef(item.kind).iconName" class="w-4 h-4" />
          </div>

          <div class="contact-row-body">
            <div class="contact-row-controls">
              <select
                v-model="item.kind"
                class="contact-row-select"
                @change="saveItem(item)"
              >
                <option v-for="d in kindDefs" :key="d.kind" :value="d.kind">{{ d.label }}</option>
              </select>
              <label class="contact-row-active">
                <input
                  v-model="item.isActive"
                  type="checkbox"
                  class="contact-row-checkbox"
                  @change="saveItem(item)"
                >
                <span>{{ t('admin.common.active') }}</span>
              </label>
            </div>

            <div class="contact-row-fields">
              <input
                v-model="item.label"
                type="text"
                class="field-input"
                :placeholder="t('admin.contactInfosForm.fields.labelOptional')"
                @blur="saveItem(item)"
              >
              <input
                v-model="item.value"
                type="text"
                class="field-input"
                :placeholder="kindDef(item.kind).placeholder"
                @blur="saveItem(item)"
              >
            </div>

            <p class="contact-preview">
              <span class="contact-preview-label">{{ t('admin.contactInfosForm.previewLink') }}</span>
              <span class="contact-preview-value">{{ buildHref(item.kind, item.value || '') || '—' }}</span>
            </p>
          </div>

          <div class="contact-row-actions">
            <button
              type="button"
              class="contact-row-action"
              :title="t('admin.contactInfosForm.actions.moveUp')"
              :disabled="index === 0"
              @click="moveItem(index, -1)"
            >
              <Icon name="lucide:chevron-up" class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="contact-row-action"
              :title="t('admin.contactInfosForm.actions.moveDown')"
              :disabled="index === items.length - 1"
              @click="moveItem(index, 1)"
            >
              <Icon name="lucide:chevron-down" class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="contact-row-action contact-row-action-danger"
              :title="t('admin.common.delete')"
              :disabled="savingIds.has(item.id)"
              @click="deleteItem(item)"
            >
              <Icon name="lucide:trash-2" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </SettingsSection>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SettingsPageHeader from './settings/SettingsPageHeader.vue'
import SettingsStatus from './settings/SettingsStatus.vue'
import SettingsSection from './settings/SettingsSection.vue'
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

<style scoped>

.header-action-primary {
  background: var(--brand);
  border-color: var(--brand);
  color: #0a0a0a;
}

.header-action-primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand) 88%, #fff);
}

.contact-count {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-tertiary);
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--surface-3);
}

/* Draft */
.contact-draft {
  background: var(--surface-1);
  border: 1px solid rgba(var(--brand-rgb) / 0.36);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.contact-draft-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.contact-draft-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(var(--brand-rgb) / 0.15);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.contact-draft-titles {
  flex: 1;
  min-width: 0;
}

.contact-draft-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.contact-draft-subtitle {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--text-tertiary);
}

.contact-draft-cancel {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 11.5px;
  font-weight: 500;
  border-radius: 7px;
  border: 1px solid var(--surface-border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.contact-draft-cancel:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.contact-draft-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.contact-draft-enter-from,
.contact-draft-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.contact-draft-enter-active,
.contact-draft-leave-active {
  transition: all 0.18s ease;
}

/* Grid */
.contact-grid {
  display: grid;
  grid-template-columns: 200px 1fr 1fr;
  gap: 12px;
}

@media (max-width: 720px) {
  .contact-grid {
    grid-template-columns: 1fr;
  }
}

/* Preview */
.contact-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}

.contact-preview-label {
  font-weight: 600;
  color: var(--text-muted);
}

.contact-preview-value {
  font-family: ui-monospace, monospace;
  color: var(--text-secondary);
  word-break: break-all;
}

/* Loading & empty */
.contact-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
  font-size: 13px;
  color: var(--text-tertiary);
  justify-content: center;
}

.contact-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 56px 20px;
  background: var(--surface-1);
  border: 1px dashed var(--surface-border);
  border-radius: 14px;
  text-align: center;
}

.contact-empty-icon {
  width: 36px;
  height: 36px;
  color: var(--text-muted);
}

.contact-empty-title {
  font-size: 13.5px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.contact-empty-cta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 9px;
  background: var(--surface-2);
  border: 1px solid var(--surface-border);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.contact-empty-cta:hover {
  background: var(--nav-hover-bg);
  border-color: rgba(var(--brand-rgb) / 0.4);
}

/* List rows */
.contact-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contact-row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 14px;
  padding: 14px 16px;
  background: var(--surface-1);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.contact-row:hover {
  border-color: color-mix(in srgb, var(--surface-border) 70%, var(--text-muted));
}

.contact-row.is-inactive {
  opacity: 0.55;
}

.contact-row-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--surface-3);
  border: 1px solid var(--surface-border);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.contact-row-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.contact-row-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.contact-row-select {
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 7px;
  border: 1px solid var(--surface-border);
  background: var(--surface-2);
  color: var(--text-primary);
  cursor: pointer;
}

.contact-row-active {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
}

.contact-row-checkbox {
  width: 14px;
  height: 14px;
  accent-color: var(--brand);
  cursor: pointer;
}

.contact-row-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

@media (max-width: 600px) {
  .contact-row-fields {
    grid-template-columns: 1fr;
  }
}

.contact-row-actions {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  flex-shrink: 0;
}

.contact-row-action {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: transparent;
  border: 1px solid var(--surface-border);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.contact-row-action:hover:not(:disabled) {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.contact-row-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.contact-row-action-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);
}

.animate-spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
