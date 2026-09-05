import { useAuthStore } from '~/stores/auth'

export type AdminNotificationItem = {
  id: string
  deliveryId?: string | null
  type: string
  entityType: string
  entityId: string
  title: string
  body: string
  data: Record<string, string>
  readAt?: string | null
  createdAt: string
}

type NotificationsResponse = {
  items?: AdminNotificationItem[]
}

let streamAbort: AbortController | null = null
let streamToken: string | null = null

export function getAdminNotificationIcon(item: AdminNotificationItem) {
  if (item.type === 'ORDER_CREATED' || item.entityType === 'ORDER') return 'lucide:shopping-bag'
  if (item.entityType === 'PRODUCT') return 'lucide:package'
  if (item.entityType === 'CUSTOMER') return 'lucide:user'
  if (item.entityType === 'PAYMENT') return 'lucide:credit-card'
  return 'lucide:bell'
}

export function formatAdminNotificationRelative(value: string, locale?: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 60_000) return 'now'

  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 60) return `${diffMinutes}m`

  const diffHours = Math.floor(diffMs / 3_600_000)
  if (diffHours < 24) return `${diffHours}h`

  return new Intl.DateTimeFormat(locale || undefined, {
    month: 'short',
    day: 'numeric'
  }).format(date)
}

export function formatAdminNotificationAbsolute(value: string, locale?: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(locale || undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function splitAdminNotifications(items: AdminNotificationItem[]) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const today: AdminNotificationItem[] = []
  const earlier: AdminNotificationItem[] = []

  for (const item of items) {
    const createdAt = new Date(item.createdAt).getTime()
    if (!Number.isNaN(createdAt) && createdAt >= todayStart) {
      today.push(item)
      continue
    }

    earlier.push(item)
  }

  return { today, earlier }
}

function asNotification(raw: any): AdminNotificationItem | null {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id || raw.eventId || '').trim()
  if (!id) return null

  return {
    id,
    deliveryId: raw.deliveryId ? String(raw.deliveryId) : null,
    type: String(raw.type || ''),
    entityType: String(raw.entityType || ''),
    entityId: String(raw.entityId || ''),
    title: String(raw.title || 'New notification'),
    body: String(raw.body || ''),
    data: Object.fromEntries(
      Object.entries(raw.data || {}).map(([key, value]) => [key, String(value ?? '')])
    ),
    readAt: raw.readAt ? String(raw.readAt) : null,
    createdAt: String(raw.createdAt || new Date().toISOString())
  }
}

function sortNotifications(items: AdminNotificationItem[]) {
  return [...items].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function useAdminNotifications() {
  const authStore = useAuthStore()
  const items = useState<AdminNotificationItem[]>('admin-notifications', () => [])
  const isLoading = useState('admin-notifications-loading', () => false)
  const error = useState<string | null>('admin-notifications-error', () => null)

  const unreadCount = computed(() => items.value.filter((item) => !item.readAt).length)

  async function refreshNotifications() {
    if (!authStore.token) {
      items.value = []
      return []
    }

    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch('/api/admin/notifications', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }) as NotificationsResponse

      items.value = sortNotifications((data.items || []).map(asNotification).filter(Boolean) as AdminNotificationItem[])
      return items.value
    } catch (err: any) {
      error.value = String(err?.message || 'Failed to load notifications')
      return items.value
    } finally {
      isLoading.value = false
    }
  }

  function upsertNotification(item: AdminNotificationItem) {
    const existingIndex = items.value.findIndex((candidate) => candidate.id === item.id)
    if (existingIndex >= 0) {
      const next = [...items.value]
      next[existingIndex] = { ...next[existingIndex], ...item }
      items.value = sortNotifications(next)
      return
    }

    items.value = sortNotifications([{ ...item, readAt: item.readAt ?? null }, ...items.value]).slice(0, 50)
  }

  async function markRead(id: string) {
    if (!authStore.token || !id) return

    await $fetch(`/api/admin/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` }
    }).catch(() => null)

    items.value = items.value.map((item) => {
      if (item.id !== id) return item
      return { ...item, readAt: item.readAt || new Date().toISOString() }
    })
  }

  async function markAllRead() {
    if (!authStore.token) return

    await $fetch('/api/admin/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` }
    }).catch(() => null)

    const readAt = new Date().toISOString()
    items.value = items.value.map((item) => {
      if (item.readAt) return item
      return { ...item, readAt }
    })
  }

  async function connectStream() {
    if (!process.client || !authStore.token) return
    if (streamAbort && streamToken === authStore.token) return

    disconnectStream()
    streamToken = authStore.token
    streamAbort = new AbortController()

    try {
      const response = await fetch('/api/admin/notifications/stream', {
        headers: {
          Authorization: `Bearer ${authStore.token}`,
          Accept: 'text/event-stream'
        },
        signal: streamAbort.signal
      })
      if (!response.ok || !response.body) return

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ''

      while (streamAbort && !streamAbort.signal.aborted) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += value

        let separator = buffer.indexOf('\n\n')
        while (separator >= 0) {
          const block = buffer.slice(0, separator)
          buffer = buffer.slice(separator + 2)
          const payload = block
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('\n')

          if (payload) {
            try {
              const parsed = JSON.parse(payload)
              const item = asNotification(parsed)
              if (item) upsertNotification(item)
            } catch {
              // Ignore malformed heartbeat/debug payloads from intermediary proxies.
            }
          }
          separator = buffer.indexOf('\n\n')
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        error.value = String(err?.message || 'Notification stream disconnected')
      }
    }
  }

  function disconnectStream() {
    streamAbort?.abort()
    streamAbort = null
    streamToken = null
  }

  return {
    items,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
    markRead,
    markAllRead,
    connectStream,
    disconnectStream
  }
}
