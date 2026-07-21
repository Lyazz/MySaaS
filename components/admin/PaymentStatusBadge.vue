<template>
  <span :class="badgeClasses">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
interface Props {
  status: string
}

const props = defineProps<Props>()
const { t } = useI18n({ useScope: 'global' })

const statusKeys: Record<string, string> = {
  UNPAID: 'admin.paymentStatus.unpaid',
  PARTIALLY_PAID: 'admin.paymentStatus.partiallyPaid',
  PAID: 'admin.paymentStatus.paid'
}

const label = computed(() => {
  const key = statusKeys[String(props.status || '').toUpperCase()]
  return key ? t(key, props.status) : props.status
})

const badgeClasses = computed(() => {
  const baseClasses = 'ui-badge'

  const tones: Record<string, string> = {
    UNPAID: 'ui-badge--red',
    PARTIALLY_PAID: 'ui-badge--amber',
    PAID: 'ui-badge--emerald'
  }

  const tone = tones[String(props.status || '').toUpperCase()] || 'ui-badge--slate'
  return `${baseClasses} ${tone}`
})
</script>
