<template>
  <UiCard :title="t('admin.pages.aiImport.supplier.title')">
    <div class="grid gap-4 sm:grid-cols-2">
      <UiSelect
        :model-value="selection"
        :label="t('admin.pages.aiImport.supplier.selectLabel')"
        :options="options"
        @update:model-value="onSelect"
      />

      <UiInput
        v-if="isCreating"
        :model-value="modelValue.name ?? ''"
        :label="t('admin.pages.aiImport.supplier.nameLabel')"
        :hint="t('admin.pages.aiImport.supplier.nameHint')"
        @update:model-value="patch({ name: $event })"
      />

      <div
        v-else-if="matchNote"
        class="flex items-end"
      >
        <p class="mb-2 text-mini text-tertiary">
          {{ matchNote }}
        </p>
      </div>
    </div>

    <div
      v-if="isCreating"
      class="mt-4 grid gap-4 sm:grid-cols-2"
    >
      <UiInput
        :model-value="modelValue.phone ?? ''"
        :label="t('admin.pages.aiImport.supplier.phoneLabel')"
        @update:model-value="patch({ phone: $event })"
      />
      <UiInput
        :model-value="modelValue.address ?? ''"
        :label="t('admin.pages.aiImport.supplier.addressLabel')"
        @update:model-value="patch({ address: $event })"
      />
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AiDocumentDraft } from '~/composables/useAiImportJob'

type DraftSupplier = AiDocumentDraft['supplier']

const props = defineProps<{
  modelValue: DraftSupplier
  suppliers: { id: string; name: string }[]
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: DraftSupplier): void }>()

const { t } = useI18n({ useScope: 'global' })

const CREATE = '__create__'
const NONE = '__none__'

const selection = computed(() => {
  if (props.modelValue.supplierId) return props.modelValue.supplierId
  return props.modelValue.create ? CREATE : NONE
})

const isCreating = computed(() => selection.value === CREATE)

/**
 * Suggested matches float to the top with their score, so the merchant can see
 * why a supplier was proposed rather than just finding it pre-selected.
 */
const options = computed(() => {
  const suggested = props.modelValue.candidates.map((c) => ({
    value: c.supplierId,
    label: `${c.name} · ${Math.round(c.score * 100)}%`
  }))
  const suggestedIds = new Set(props.modelValue.candidates.map((c) => c.supplierId))
  const rest = props.suppliers
    .filter((s) => !suggestedIds.has(s.id))
    .map((s) => ({ value: s.id, label: s.name }))

  return [
    ...(props.modelValue.name
      ? [{ value: CREATE, label: t('admin.pages.aiImport.supplier.createOption', { name: props.modelValue.name }) }]
      : []),
    { value: NONE, label: t('admin.pages.aiImport.supplier.noneOption') },
    ...suggested,
    ...rest
  ]
})

const matchNote = computed(() => {
  if (!props.modelValue.supplierId || !props.modelValue.matchScore) return null
  return t('admin.pages.aiImport.supplier.matchedNote', {
    percent: Math.round(props.modelValue.matchScore * 100)
  })
})

const patch = (partial: Partial<DraftSupplier>) =>
  emit('update:modelValue', { ...props.modelValue, ...partial })

const onSelect = (value: string) => {
  if (value === CREATE) return patch({ supplierId: null, create: true })
  if (value === NONE) return patch({ supplierId: null, create: false })
  patch({ supplierId: value, create: false })
}
</script>
