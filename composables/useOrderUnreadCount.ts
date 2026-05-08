import { useAuthStore } from '~/stores/auth'

type UnreadCountResponse = {
  unreadCount: number
}

export function useOrderUnreadCount() {
  const authStore = useAuthStore()
  const unreadOrderCount = useState('admin-order-unread-count', () => 0)
  const unreadOrderCountLoaded = useState('admin-order-unread-count-loaded', () => false)

  async function refreshUnreadOrderCount() {
    if (!authStore.token) {
      unreadOrderCount.value = 0
      unreadOrderCountLoaded.value = false
      return 0
    }

    const data = await $fetch('/api/admin/orders/unread-count', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    }) as UnreadCountResponse

    unreadOrderCount.value = Number(data?.unreadCount ?? 0)
    unreadOrderCountLoaded.value = true
    return unreadOrderCount.value
  }

  async function markOrderAsRead(orderId: string) {
    if (!authStore.token || !orderId) return null

    const response = await $fetch('/api/admin/orders/' + encodeURIComponent(orderId) + '/mark-read', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    }) as { success: boolean; orderId: string; readAt: string }

    await refreshUnreadOrderCount()
    return response
  }

  return {
    unreadOrderCount,
    unreadOrderCountLoaded,
    refreshUnreadOrderCount,
    markOrderAsRead
  }
}
