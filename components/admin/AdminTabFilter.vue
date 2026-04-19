<template>
  <div class="w-full overflow-x-auto mb-4 scrollbar-hide">
  <div
    class="inline-flex items-center gap-0.5 p-1 rounded-xl"
    style="background: var(--surface-2); border: 1px solid var(--surface-border);"
  >
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 whitespace-nowrap"
      :style="tabStyle(tab.key)"
      @click="$emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
      <span
        v-if="tab.count !== undefined"
        class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
        :style="countStyle(tab.key)"
      >{{ tab.count }}</span>
    </button>
  </div>
  </div>
</template>

<script setup lang="ts">
interface Tab {
  key: string
  label: string
  count?: number
}

const props = defineProps<{
  modelValue: string
  tabs: Tab[]
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

function tabStyle(key: string) {
  if (key === props.modelValue) {
    return 'background: rgba(var(--brand-rgb) / 0.1); color: var(--brand); box-shadow: 0 1px 2px rgba(0,0,0,0.08);'
  }
  return 'color: var(--text-secondary); background: transparent;'
}

function countStyle(key: string) {
  if (key === props.modelValue) {
    return 'background: rgba(var(--brand-rgb) / 0.15); color: var(--brand);'
  }
  return 'background: var(--surface-3); color: var(--text-tertiary);'
}
</script>
