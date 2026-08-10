<template>
  <div class="ui-card flex items-center gap-4 p-5">
    <div
      class="ui-icon-tile"
      :class="`ui-icon-tile--${color}`"
    >
      <Icon :name="icon" class="h-5 w-5" />
    </div>
    <div class="min-w-0 flex-1">
      <p
        class="truncate text-xs font-semibold uppercase tracking-wider"
        style="color: var(--text-tertiary)"
      >
        {{ label }}
      </p>
      <p
        class="mt-0.5 truncate text-2xl font-bold"
        style="color: var(--text-primary)"
      >
        {{ formattedValue }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon: string
  label: string
  value: number | string
  color?: 'slate' | 'emerald' | 'blue' | 'indigo' | 'lime' | 'amber' | 'red'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'lime'
})

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})
</script>
