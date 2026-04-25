<template>
  <div class="w-full overflow-x-auto mb-5 scrollbar-hide">
    <div class="inline-flex items-center border-b min-w-full" style="border-color: var(--surface-border)">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="relative flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium transition-all duration-150 whitespace-nowrap shrink-0"
        :class="tab.key === modelValue ? 'tab-active' : 'tab-idle'"
        @click="$emit('update:modelValue', tab.key)"
      >
        {{ tab.label }}
        <span
          v-if="tab.count !== undefined"
          class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          :style="countStyle(tab.key)"
        >{{ tab.count }}</span>
        <!-- Active underline -->
        <span
          v-if="tab.key === modelValue"
          class="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
          style="background: var(--brand)"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.tab-active {
  color: var(--brand);
}

.tab-idle {
  color: var(--text-tertiary);
}

.tab-idle:hover {
  color: var(--text-secondary);
  background: var(--nav-hover-bg);
}
</style>

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

function countStyle(key: string) {
  if (key === props.modelValue) {
    return 'background: rgba(var(--brand-rgb) / 0.15); color: var(--brand);'
  }
  return 'background: var(--surface-2); color: var(--text-tertiary); border: 1px solid var(--surface-border);'
}
</script>
