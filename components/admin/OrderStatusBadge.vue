  <template>
  <span :class="badgeClasses">
    {{ label }}<template v-if="detailLabel"> ({{ detailLabel }})</template>
  </span>
</template>

<script setup lang="ts">
interface Props {
  status: string
  detail?: string | null
}

const props = defineProps<Props>()
const { t, te } = useI18n()

const statusKeys: Record<string, string> = {
  PENDING: 'admin.orderStatus.pending',
  CONFIRMED: 'admin.orderStatus.confirmed',
  SHIPPED: 'admin.orderStatus.shipped',
  DELIVERED: 'admin.orderStatus.delivered',
  CANCELLED: 'admin.orderStatus.cancelled',
  RETURNED: 'admin.orderStatus.returned'
}

const label = computed(() => {
  const key = statusKeys[String(props.status || '').trim().toUpperCase()]
  return key ? t(key) : props.status
})

// Only surface the carrier-level detail when the order status isn't already
// self-explanatory (pending/delivered) — otherwise it's redundant noise.
const detailLabel = computed(() => {
  const raw = String(props.detail || '').trim()
  if (!raw) return null

  const statusCode = String(props.status || '').trim().toUpperCase()
  if (statusCode === 'PENDING' || statusCode === 'DELIVERED') return null

  const lower = raw.toLowerCase()
  const providerKey = `admin.orderStatus.providerDetail.${lower}`
  if (te(providerKey)) return t(providerKey)

  const genericKey = statusKeys[raw.toUpperCase()]
  if (genericKey) return t(genericKey)

  return raw
})

const badgeClasses = computed(() => {
  const baseClasses = 'ui-badge'

  const tones: Record<string, string> = {
    PENDING: 'ui-badge--amber',
    CONFIRMED: 'ui-badge--indigo',
    SHIPPED: 'ui-badge--lime',
    DELIVERED: 'ui-badge--emerald',
    CANCELLED: 'ui-badge--red',
    RETURNED: 'ui-badge--slate'
  }

  const tone = tones[String(props.status || '').toUpperCase()] || 'ui-badge--slate'
  return `${baseClasses} ${tone}`
})
</script>
