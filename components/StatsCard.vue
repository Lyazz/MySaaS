<template>
  <div
    class="stat-card"
    :class="`stat-card-${color}`"
  >
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium opacity-80">
          {{ label }}
        </p>
        <p class="text-3xl font-bold mt-1">
          {{ formattedValue }}
        </p>
      </div>
      <div class="text-4xl opacity-70">
        {{ icon }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon: string
  label: string
  value: number | string
  color?: 'teal' | 'blue' | 'green' | 'orange' | 'red'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'teal'
})

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})
</script>

<style scoped>
.stat-card {
  @apply p-6 rounded-xl backdrop-blur-sm border transition-all duration-200 hover:scale-105;
}

.stat-card-teal {
  @apply bg-teal-900/50 border-teal-500/30 text-teal-100;
}

.stat-card-blue {
  @apply bg-blue-900/50 border-blue-500/30 text-blue-100;
}

.stat-card-green {
  @apply bg-green-900/50 border-green-500/30 text-green-100;
}

.stat-card-orange {
  @apply bg-orange-900/50 border-orange-500/30 text-orange-100;
}

.stat-card-red {
  @apply bg-red-900/50 border-red-500/30 text-red-100;
}
</style>
