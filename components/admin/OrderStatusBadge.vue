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
  PENDING: 'admin.orderStatus.pending',
  CONFIRMED: 'admin.orderStatus.confirmed',
  SHIPPED: 'admin.orderStatus.shipped',
  DELIVERED: 'admin.orderStatus.delivered',
  CANCELLED: 'admin.orderStatus.cancelled',
  RETURNED: 'admin.orderStatus.returned'
}

const label = computed(() => {
  const key = statusKeys[String(props.status || '').toUpperCase()]
  return key ? t(key) : props.status
})

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
