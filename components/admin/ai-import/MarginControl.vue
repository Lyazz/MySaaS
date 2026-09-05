<template>
  <div class="flex flex-wrap items-end gap-3">
    <UiInput
      :model-value="String(modelValue)"
      type="number"
      min="-100"
      max="10000"
      step="1"
      class="w-32"
      :label="t('admin.pages.aiImport.margin.label')"
      :hint="t('admin.pages.aiImport.margin.hint')"
      @update:model-value="onInput"
    />

    <UiButton
      variant="secondary"
      size="sm"
      icon="lucide:refresh-cw"
      class="mb-6"
      @click="emit('apply')"
    >
      {{ t('admin.pages.aiImport.margin.apply') }}
    </UiButton>

    <p
      v-if="pinnedCount"
      class="mb-7 text-mini text-tertiary"
    >
      {{ t('admin.pages.aiImport.margin.pinnedNote', { count: pinnedCount }) }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: number; pinnedCount: number }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'apply'): void
}>()

const { t } = useI18n({ useScope: 'global' })

const onInput = (value: string) => {
  const parsed = Number(value)
  emit('update:modelValue', Number.isFinite(parsed) ? parsed : 0)
}
</script>
