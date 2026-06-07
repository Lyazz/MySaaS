<template>
  <div ref="rootRef" class="relative">
    <button
      class="relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150"
      style="color: var(--text-secondary); border: 1px solid var(--surface-border); background: transparent"
      aria-label="Notifications"
      @click="togglePanel"
      @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }"
      @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }"
    >
      <Icon name="lucide:bell" class="h-3.5 w-3.5" />
      <span
        v-if="unreadCount > 0"
        class="absolute -right-1 -top-1 flex min-w-[17px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-[17px]"
        style="background: var(--brand); color: var(--brand-contrast); border: 1px solid var(--admin-topbar-bg)"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <div
      v-if="isOpen"
      class="absolute right-0 top-10 z-50 w-[340px] overflow-hidden rounded-xl shadow-2xl"
      style="background: var(--admin-sidebar-bg); border: 1px solid var(--surface-border)"
    >
      <div class="flex items-center justify-between px-3.5 py-3" style="border-bottom: 1px solid var(--surface-border)">
        <div>
          <p class="text-[12px] font-semibold" style="color: var(--text-primary)">Notifications</p>
          <p class="text-[10.5px]" style="color: var(--text-tertiary)">
            {{ unreadCount }} unread
          </p>
        </div>
        <button
          class="rounded-md p-1.5 transition-colors"
          style="color: var(--text-tertiary)"
          aria-label="Refresh notifications"
          @click="refreshNotifications"
          @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }"
          @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }"
        >
          <Icon name="lucide:refresh-cw" class="h-3.5 w-3.5" />
        </button>
      </div>

      <div class="max-h-[360px] overflow-y-auto custom-scrollbar">
        <div v-if="isLoading && items.length === 0" class="px-3.5 py-8 text-center text-[12px]" style="color: var(--text-tertiary)">
          Loading notifications...
        </div>
        <div v-else-if="items.length === 0" class="px-3.5 py-8 text-center">
          <Icon name="lucide:bell-off" class="mx-auto mb-2 h-5 w-5" style="color: var(--text-tertiary)" />
          <p class="text-[12px] font-medium" style="color: var(--text-secondary)">No notifications yet</p>
        </div>
        <button
          v-for="item in items.slice(0, 8)"
          :key="item.id"
          class="flex w-full gap-3 px-3.5 py-3 text-left transition-colors"
          :style="!item.readAt ? 'background: rgba(var(--brand-rgb) / 0.06)' : ''"
          @click="openNotification(item)"
          @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)' }"
          @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = !item.readAt ? 'rgba(var(--brand-rgb) / 0.06)' : '' }"
        >
          <span
            class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            :style="!item.readAt ? 'background: rgba(var(--brand-rgb) / 0.14); color: var(--brand)' : 'background: var(--nav-hover-bg); color: var(--text-tertiary)'"
          >
            <Icon :name="iconFor(item)" class="h-3.5 w-3.5" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex items-start gap-2">
              <span class="line-clamp-1 text-[12px] font-semibold" style="color: var(--text-primary)">{{ item.title }}</span>
              <span v-if="!item.readAt" class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style="background: var(--brand)" />
            </span>
            <span class="mt-0.5 line-clamp-2 text-[11px] leading-relaxed" style="color: var(--text-secondary)">{{ item.body }}</span>
            <span class="mt-1 block text-[10px]" style="color: var(--text-tertiary)">{{ formatTime(item.createdAt) }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminNotificationItem } from '~/composables/useAdminNotifications'
import { useAdminNotifications } from '~/composables/useAdminNotifications'

const router = useRouter()
const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const {
  items,
  unreadCount,
  isLoading,
  refreshNotifications,
  markRead,
  connectStream,
  disconnectStream
} = useAdminNotifications()

function togglePanel() {
  isOpen.value = !isOpen.value
  if (isOpen.value) refreshNotifications()
}

function iconFor(item: AdminNotificationItem) {
  if (item.type === 'ORDER_CREATED' || item.entityType === 'ORDER') return 'lucide:shopping-bag'
  return 'lucide:bell'
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short'
  }).format(date)
}

async function openNotification(item: AdminNotificationItem) {
  await markRead(item.id)
  isOpen.value = false
  const route = item.data?.route || (item.data?.orderId ? `/admin/orders/${item.data.orderId}` : '')
  if (route) router.push(route.startsWith('/admin') ? route : `/admin${route}`)
}

function onDocumentClick(event: MouseEvent) {
  const root = rootRef.value
  if (!root || root.contains(event.target as Node)) return
  isOpen.value = false
}

onMounted(() => {
  refreshNotifications()
  connectStream()
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  disconnectStream()
})
</script>
