<template>
  <span :class="badgeClasses">
    {{ status }}
  </span>
</template>

<script setup lang="ts">
interface Props {
  status: string
}

const props = defineProps<Props>()

const badgeClasses = computed(() => {
  const baseClasses = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full'
  
  const statusColors: Record<string, string> = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'CONFIRMED': 'bg-blue-100 text-blue-800',
    'SHIPPED': 'bg-cyan-100 text-cyan-800',
    'DELIVERED': 'bg-green-100 text-green-800',
    'CANCELLED': 'bg-red-100 text-red-800'
  }
  
  const colorClass = statusColors[props.status] || 'bg-gray-100 text-gray-800'
  
  return `${baseClasses} ${colorClass}`
})
</script>
