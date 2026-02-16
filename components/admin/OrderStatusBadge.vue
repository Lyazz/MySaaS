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
  const baseClasses = 'ui-badge'

  const tones: Record<string, string> = {
    PENDING: 'ui-badge--amber',
    CONFIRMED: 'ui-badge--indigo',
    SHIPPED: 'ui-badge--teal',
    DELIVERED: 'ui-badge--emerald',
    CANCELLED: 'ui-badge--red',
    RETURNED: 'ui-badge--slate'
  }

  const tone = tones[String(props.status || '').toUpperCase()] || 'ui-badge--slate'
  return `${baseClasses} ${tone}`
})
</script>
