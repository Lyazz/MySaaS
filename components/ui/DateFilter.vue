<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end">
    <div>
      <label class="ui-label block mb-1">
        {{ t('admin.common.startDate') }}
      </label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="lucide:calendar" class="h-4 w-4" style="color: var(--text-muted)" />
        </div>
        <input
          type="date"
          :value="startDate"
          class="ui-input block w-full pl-10 pr-3 py-2 sm:text-sm"
          @input="updateStartDate(($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>

    <div>
      <label class="ui-label block mb-1">
        {{ t('admin.common.endDate') }}
      </label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="lucide:calendar" class="h-4 w-4" style="color: var(--text-muted)" />
        </div>
        <input
          type="date"
          :value="endDate"
          class="ui-input block w-full pl-10 pr-3 py-2 sm:text-sm"
          @input="updateEndDate(($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  startDate?: string
  endDate?: string
}>()

const emit = defineEmits<{
  (e: 'update:startDate', value: string): void
  (e: 'update:endDate', value: string): void
}>()

function updateStartDate(val: string) {
  emit('update:startDate', val)
}

function updateEndDate(val: string) {
  emit('update:endDate', val)
}


</script>
