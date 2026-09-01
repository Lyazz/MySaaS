<template>
  <div class="relative">
    <button
 class="notification-trigger relative flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-150 border-line text-secondary"
 :class="{ 'notification-trigger--pulse': unreadCount> 0 }"
 
 aria-label="Notifications"
 :aria-expanded="isOpen ? 'true' : 'false'"
 aria-haspopup="dialog"
 @click="togglePanel"
>
      <Icon
        name="lucide:bell"
        class="h-4 w-4"
      />
      <span
        v-if="unreadCount > 0"
        :key="badgeAnimationKey"
        class="notification-badge absolute -end-1 -top-1 flex min-w-[17px] items-center justify-center rounded-full px-1 text-micro font-extrabold leading-[17px]"
        style="background: var(--brand); color: var(--brand-contrast); border: 1px solid var(--admin-topbar-bg)"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <Teleport to="body">
      <Transition name="notifications-overlay">
        <div
          v-if="isOpen"
          class="fixed inset-0 z-[70]"
          @click.self="closePanel"
        >
          <div
            class="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          <div
            class="notification-panel absolute start-4 end-4 top-[60px] overflow-hidden rounded-xl sm:start-auto sm:end-4 sm:w-[380px]"
            style="background: var(--surface-1); border: 1px solid var(--surface-border); box-shadow: 0 8px 28px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.08)"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
          >
            <div class="h-[3px] bg-gradient-to-r from-[var(--brand)] to-[#86EFAC]" />

            <div class="flex items-center gap-3 px-4 py-3">
              <div
 class="flex h-[34px] w-[34px] items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[#86EFAC] text-brand-contrast"
 
>
                <Icon
                  name="lucide:bell"
                  class="h-4 w-4"
                />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p
 class="truncate text-sm font-bold tracking-[-0.02em] text-primary"
 
>
                    Notifications
                  </p>
                  <span
 v-if="unreadCount> 0"
 class="rounded-full px-1.5 py-0.5 text-micro font-bold ui-wash"
 
>
                    {{ unreadCount }} new
                  </span>
                </div>
                <p
 class="text-mini text-tertiary"
 
>
                  {{ unreadCount === 0 ? 'All caught up' : `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` }}
                </p>
              </div>

              <div class="flex items-center gap-1">
                <button
 v-if="unreadCount> 0"
 class="notification-action flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-150 border-line text-tertiary"
 
 aria-label="Mark all read"
 @click="handleMarkAllRead"
>
                  <Icon
                    name="lucide:check-check"
                    class="h-[13px] w-[13px]"
                  />
                </button>
                <button
 class="notification-action flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-150 border-line text-tertiary"
 
 aria-label="Refresh notifications"
 @click="handleRefresh"
>
                  <Icon
                    name="lucide:refresh-cw"
                    class="h-[13px] w-[13px]"
                    :class="{ 'animate-spin': isLoading }"
                  />
                </button>
                <button
 class="notification-action flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-150 border-line text-tertiary"
 
 aria-label="Close notifications"
 @click="closePanel"
>
                  <Icon
                    name="lucide:x"
                    class="h-[13px] w-[13px]"
                  />
                </button>
              </div>
            </div>

            <div class="border-t border-line" />

            <div class="max-h-[560px] overflow-y-auto">
              <div
                v-if="isLoading && items.length === 0"
                class="space-y-3 p-4"
              >
                <div
                  v-for="index in 3"
                  :key="`notification-loading-${index}`"
                  class="flex items-start gap-3"
                >
                  <div
 class="h-9 w-9 animate-pulse rounded-xl ui-skeleton"
 
 />
                  <div class="flex-1 space-y-2 pt-1">
                    <div
                      class="h-[11px] animate-pulse rounded-lg"
                      style="width: 72%; background: rgba(255,255,255,0.08)"
                    />
                    <div
                      class="h-[9px] animate-pulse rounded-lg"
                      style="width: 46%; background: rgba(255,255,255,0.05)"
                    />
                  </div>
                </div>
              </div>

              <div
                v-else-if="items.length === 0"
                class="px-4 py-9 text-center"
              >
                <div
                  class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-gradient-to-br from-[rgba(198,244,50,0.12)] to-[rgba(134,239,172,0.05)]"
                  style="border-color: rgba(var(--brand-rgb) / 0.2)"
                >
                  <Icon
                    name="lucide:bell-off"
                    class="h-6 w-6"
                    style="color: rgba(var(--brand-rgb) / 0.7)"
                  />
                </div>
                <p
 class="mt-3 text-sm font-bold text-primary"
 
>
                  All caught up!
                </p>
                <p
 class="mt-1 text-mini text-secondary"
 
>
                  No new notifications right now.
                </p>
              </div>

              <div v-else>
                <template v-if="groupedItems.today.length">
                  <p
 class="px-4 pb-1 pt-3 text-micro font-bold uppercase tracking-[0.12em] text-tertiary"
 
>
                    Today
                  </p>
                  <button
                    v-for="item in groupedItems.today"
                    :key="item.id"
                    class="notification-row flex w-full items-start gap-3 px-4 py-[11px] text-start transition-all duration-150"
                    :style="item.readAt ? '' : 'background: rgba(var(--brand-rgb) / 0.04)'"
                    @click="openNotification(item)"
                  >
                    <span
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      :style="item.readAt
                        ? 'background: var(--nav-hover-bg); color: var(--text-tertiary)'
                        : 'background: rgba(var(--brand-rgb) / 0.15); color: var(--brand); border: 1px solid rgba(var(--brand-rgb) / 0.3)'"
                    >
                      <Icon
                        :name="getAdminNotificationIcon(item)"
                        class="h-4 w-4"
                      />
                    </span>

                    <span class="min-w-0 flex-1">
                      <span class="flex items-center gap-1.5">
                        <span
                          class="truncate text-xs tracking-[-0.01em]"
                          :style="item.readAt ? 'color: var(--text-primary); font-weight: 600' : 'color: var(--text-primary); font-weight: 700'"
                        >
                          {{ item.title }}
                        </span>
                        <span
 class="ms-auto shrink-0 text-micro text-tertiary"
 
>
                          {{ formatAdminNotificationRelative(item.createdAt, locale) }}
                        </span>
                        <span
 v-if="!item.readAt"
 class="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
 
 />
                      </span>
                      <span
 class="mt-1 line-clamp-2 block text-mini leading-[1.4] text-secondary"
 
>
                        {{ item.body }}
                      </span>
                    </span>

                    <span class="notification-row-arrow pt-1.5">
                      <Icon
 name="lucide:arrow-right"
 class="h-[13px] w-[13px] text-tertiary"
 
 />
                    </span>
                  </button>
                </template>

                <template v-if="groupedItems.earlier.length">
                  <p
 class="px-4 pb-1 pt-3 text-micro font-bold uppercase tracking-[0.12em] text-tertiary"
 
>
                    Earlier
                  </p>
                  <button
                    v-for="item in groupedItems.earlier"
                    :key="item.id"
                    class="notification-row flex w-full items-start gap-3 px-4 py-[11px] text-start transition-all duration-150"
                    :style="item.readAt ? '' : 'background: rgba(var(--brand-rgb) / 0.04)'"
                    @click="openNotification(item)"
                  >
                    <span
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      :style="item.readAt
                        ? 'background: var(--nav-hover-bg); color: var(--text-tertiary)'
                        : 'background: rgba(var(--brand-rgb) / 0.15); color: var(--brand); border: 1px solid rgba(var(--brand-rgb) / 0.3)'"
                    >
                      <Icon
                        :name="getAdminNotificationIcon(item)"
                        class="h-4 w-4"
                      />
                    </span>

                    <span class="min-w-0 flex-1">
                      <span class="flex items-center gap-1.5">
                        <span
                          class="truncate text-xs tracking-[-0.01em]"
                          :style="item.readAt ? 'color: var(--text-primary); font-weight: 600' : 'color: var(--text-primary); font-weight: 700'"
                        >
                          {{ item.title }}
                        </span>
                        <span
 class="ms-auto shrink-0 text-micro text-tertiary"
 
>
                          {{ formatAdminNotificationRelative(item.createdAt, locale) }}
                        </span>
                        <span
 v-if="!item.readAt"
 class="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
 
 />
                      </span>
                      <span
 class="mt-1 line-clamp-2 block text-mini leading-[1.4] text-secondary"
 
>
                        {{ item.body }}
                      </span>
                    </span>

                    <span class="notification-row-arrow pt-1.5">
                      <Icon
 name="lucide:arrow-right"
 class="h-[13px] w-[13px] text-tertiary"
 
 />
                    </span>
                  </button>
                </template>
              </div>
            </div>

            <template v-if="items.length > 0">
              <div class="border-t border-line" />
              <button
 class="notification-footer flex w-full items-center justify-center gap-1 px-4 py-[11px] text-xs font-semibold transition-all duration-150 text-tertiary"
 
 @click="goToAllNotifications"
>
                <span>View all notifications</span>
                <Icon
                  name="lucide:arrow-right"
                  class="h-3 w-3"
                />
              </button>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  formatAdminNotificationRelative,
  getAdminNotificationIcon,
  splitAdminNotifications,
  useAdminNotifications,
  type AdminNotificationItem
} from '~/composables/useAdminNotifications'

const router = useRouter()
const { locale } = useI18n({ useScope: 'global' })
const isOpen = ref(false)
const badgeAnimationKey = ref(0)

const {
  items,
  unreadCount,
  isLoading,
  refreshNotifications,
  markRead,
  markAllRead,
  connectStream,
  disconnectStream
} = useAdminNotifications()

const groupedItems = computed(() => splitAdminNotifications(items.value.slice(0, 20)))

watch(unreadCount, (value, oldValue) => {
  if (value !== oldValue) {
    badgeAnimationKey.value += 1
  }
})

function closePanel() {
  isOpen.value = false
}

function togglePanel() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    refreshNotifications()
  }
}

async function handleRefresh() {
  await refreshNotifications()
}

async function handleMarkAllRead() {
  await markAllRead()
}

function resolveNotificationRoute(item: AdminNotificationItem) {
  const route = String(item.data?.route || '').trim()
  if (route) {
    return route.startsWith('/admin') ? route : `/admin${route}`
  }

  const orderId = String(item.data?.orderId || '').trim()
  if (orderId) {
    return `/admin/orders/${orderId}`
  }

  return ''
}

async function openNotification(item: AdminNotificationItem) {
  await markRead(item.id)
  closePanel()

  const targetRoute = resolveNotificationRoute(item)
  if (targetRoute) {
    router.push(targetRoute)
  }
}

function goToAllNotifications() {
  closePanel()
  router.push('/admin/notifications')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closePanel()
  }
}

onMounted(() => {
  refreshNotifications()
  connectStream()
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  disconnectStream()
})
</script>

<style scoped>
.notification-trigger {
  background: transparent;
}

.notification-trigger:hover,
.notification-trigger:focus-visible,
.notification-trigger[aria-expanded='true'] {
  background: var(--nav-hover-bg);
  color: var(--text-primary) !important;
}

.notification-trigger--pulse > :deep(.iconify) {
  animation: notification-bell-pulse 1.8s ease-in-out infinite;
  transform-origin: center;
}

.notification-badge {
  animation: notification-badge-pop 0.35s ease-out;
}

.notification-action:hover,
.notification-action:focus-visible {
  background: var(--nav-hover-bg);
  color: var(--text-primary) !important;
}

.notification-row:hover,
.notification-row:focus-visible {
  background: var(--nav-hover-bg) !important;
}

.notification-row-arrow {
  opacity: 0;
  transition: opacity 130ms ease;
}

.notification-row:hover .notification-row-arrow,
.notification-row:focus-visible .notification-row-arrow {
  opacity: 1;
}

.notification-footer:hover,
.notification-footer:focus-visible {
  background: var(--nav-hover-bg);
  color: var(--text-primary) !important;
}

.notifications-overlay-enter-active,
.notifications-overlay-leave-active {
  transition: opacity 180ms ease;
}

.notifications-overlay-enter-active .notification-panel,
.notifications-overlay-leave-active .notification-panel {
  transition: transform 180ms ease, opacity 180ms ease;
}

.notifications-overlay-enter-from,
.notifications-overlay-leave-to {
  opacity: 0;
}

.notifications-overlay-enter-from .notification-panel,
.notifications-overlay-leave-to .notification-panel {
  opacity: 0;
  transform: translateY(-10px);
}

@keyframes notification-bell-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.18);
  }
}

@keyframes notification-badge-pop {
  0% {
    transform: scale(0.55);
  }

  72% {
    transform: scale(1.08);
  }

  100% {
    transform: scale(1);
  }
}
</style>
