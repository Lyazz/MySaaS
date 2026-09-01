<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <section
      class="rounded-2xl p-6 sm:p-7"
      style="background: linear-gradient(135deg, rgba(var(--brand-rgb) / 0.1), rgba(134, 239, 172, 0.06)); border: 1px solid rgba(var(--brand-rgb) / 0.18); box-shadow: var(--card-shadow)"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-start gap-4">
          <div
 class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[#86EFAC] text-brand-contrast"
 
>
            <Icon
              name="lucide:bell"
              class="h-6 w-6"
            />
          </div>

          <div class="min-w-0">
            <h2
 class="text-2xl font-bold tracking-[-0.03em] text-primary"
 
>
              All Notifications
            </h2>
            <p
 class="mt-1 text-sm text-secondary"
 
>
              Manage and view your store activity.
            </p>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span
 class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-mini font-semibold ui-wash"
 
>
                <span
 class="h-2 w-2 rounded-full bg-brand"
 
 />
                {{ unreadCount === 0 ? 'All caught up' : `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` }}
              </span>
              <span
 class="inline-flex items-center rounded-full px-3 py-1.5 text-mini font-medium surface-1 text-secondary border border-line"
 
>
                {{ items.length }} total
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            v-if="unreadCount > 0"
            class="ui-btn ui-btn--secondary"
            @click="handleMarkAllRead"
          >
            <Icon
              name="lucide:check-check"
              class="h-4 w-4"
            />
            Mark all read
          </button>
          <button
            class="ui-btn ui-btn--secondary"
            :disabled="isLoading"
            @click="refreshNotifications"
          >
            <Icon
              name="lucide:refresh-cw"
              class="h-4 w-4"
              :class="{ 'animate-spin': isLoading }"
            />
            Refresh
          </button>
        </div>
      </div>
    </section>

    <div
      v-if="error"
      class="rounded-2xl px-4 py-3 text-sm"
      style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.18); color: #f87171"
    >
      <div class="flex items-start gap-3">
        <Icon
          name="lucide:triangle-alert"
          class="mt-0.5 h-4 w-4 shrink-0"
        />
        <div class="min-w-0">
          <p class="font-semibold">
            Notifications unavailable
          </p>
          <p class="mt-1 opacity-80">
            {{ error }}
          </p>
        </div>
      </div>
    </div>

    <section
 class="overflow-hidden rounded-2xl surface-1 border border-line shadow-card"
 
>
      <div
        v-if="isLoading && items.length === 0"
        class="space-y-4 p-6"
      >
        <div
 v-for="index in 4"
 :key="`notifications-page-loading-${index}`"
 class="flex items-start gap-4 rounded-2xl border p-4 border-line surface-2"
 
>
          <div
 class="h-10 w-10 animate-pulse rounded-xl ui-skeleton"
 
 />
          <div class="flex-1 space-y-2 pt-0.5">
            <div
              class="h-3 animate-pulse rounded-lg"
              style="width: 34%; background: rgba(255,255,255,0.08)"
            />
            <div
              class="h-2.5 animate-pulse rounded-lg"
              style="width: 78%; background: rgba(255,255,255,0.05)"
            />
            <div
              class="h-2.5 animate-pulse rounded-lg"
              style="width: 52%; background: rgba(255,255,255,0.04)"
            />
          </div>
        </div>
      </div>

      <div
        v-else-if="items.length === 0"
        class="px-6 py-16 text-center"
      >
        <div
          class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border bg-gradient-to-br from-[rgba(198,244,50,0.12)] to-[rgba(134,239,172,0.05)]"
          style="border-color: rgba(var(--brand-rgb) / 0.2)"
        >
          <Icon
            name="lucide:bell-off"
            class="h-7 w-7"
            style="color: rgba(var(--brand-rgb) / 0.7)"
          />
        </div>
        <h3
 class="mt-4 text-lg font-semibold text-primary"
 
>
          No notifications
        </h3>
        <p
 class="mt-1 text-sm text-secondary"
 
>
          No new notifications right now.
        </p>
      </div>

      <div
        v-else
        class="p-4 sm:p-5"
      >
        <template v-if="groupedItems.today.length">
          <p
 class="px-2 pb-2 text-micro font-bold uppercase tracking-[0.14em] text-tertiary"
 
>
            Today
          </p>
          <div class="space-y-2">
            <button
              v-for="item in groupedItems.today"
              :key="item.id"
              class="notification-page-row flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-start transition-all duration-150"
              :style="item.readAt
                ? 'border-color: var(--surface-border); background: var(--surface-1)'
                : 'border-color: rgba(var(--brand-rgb) / 0.28); background: rgba(var(--brand-rgb) / 0.05)'"
              @click="openNotification(item)"
            >
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                :style="item.readAt
                  ? 'background: var(--surface-2); color: var(--text-tertiary)'
                  : 'background: rgba(var(--brand-rgb) / 0.15); color: var(--brand)'"
              >
                <Icon
                  :name="getAdminNotificationIcon(item)"
                  class="h-[18px] w-[18px]"
                />
              </span>

              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2">
                  <span
                    class="text-base tracking-[-0.02em]"
                    :style="item.readAt ? 'color: var(--text-primary); font-weight: 600' : 'color: var(--text-primary); font-weight: 700'"
                  >
                    {{ item.title }}
                  </span>
                  <span
 v-if="!item.readAt"
 class="inline-flex h-2 w-2 rounded-full bg-brand"
 
 />
                  <span
 class="ms-auto text-xs text-tertiary"
 
>
                    {{ formatAdminNotificationAbsolute(item.createdAt, locale) }}
                  </span>
                </span>
                <span
 class="mt-1 block text-sm leading-[1.45] text-secondary"
 
>
                  {{ item.body }}
                </span>
              </span>

              <span class="notification-page-row-arrow pt-1">
                <Icon
 name="lucide:arrow-right"
 class="h-4 w-4 text-tertiary"
 
 />
              </span>
            </button>
          </div>
        </template>

        <template v-if="groupedItems.earlier.length">
          <p
 class="px-2 pb-2 pt-6 text-micro font-bold uppercase tracking-[0.14em] text-tertiary"
 
>
            Earlier
          </p>
          <div class="space-y-2">
            <button
              v-for="item in groupedItems.earlier"
              :key="item.id"
              class="notification-page-row flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-start transition-all duration-150"
              :style="item.readAt
                ? 'border-color: var(--surface-border); background: var(--surface-1)'
                : 'border-color: rgba(var(--brand-rgb) / 0.28); background: rgba(var(--brand-rgb) / 0.05)'"
              @click="openNotification(item)"
            >
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                :style="item.readAt
                  ? 'background: var(--surface-2); color: var(--text-tertiary)'
                  : 'background: rgba(var(--brand-rgb) / 0.15); color: var(--brand)'"
              >
                <Icon
                  :name="getAdminNotificationIcon(item)"
                  class="h-[18px] w-[18px]"
                />
              </span>

              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2">
                  <span
                    class="text-base tracking-[-0.02em]"
                    :style="item.readAt ? 'color: var(--text-primary); font-weight: 600' : 'color: var(--text-primary); font-weight: 700'"
                  >
                    {{ item.title }}
                  </span>
                  <span
 v-if="!item.readAt"
 class="inline-flex h-2 w-2 rounded-full bg-brand"
 
 />
                  <span
 class="ms-auto text-xs text-tertiary"
 
>
                    {{ formatAdminNotificationAbsolute(item.createdAt, locale) }}
                  </span>
                </span>
                <span
 class="mt-1 block text-sm leading-[1.45] text-secondary"
 
>
                  {{ item.body }}
                </span>
              </span>

              <span class="notification-page-row-arrow pt-1">
                <Icon
 name="lucide:arrow-right"
 class="h-4 w-4 text-tertiary"
 
 />
              </span>
            </button>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  formatAdminNotificationAbsolute,
  getAdminNotificationIcon,
  splitAdminNotifications,
  useAdminNotifications,
  type AdminNotificationItem
} from '~/composables/useAdminNotifications'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Notifications'
})

const router = useRouter()
const { locale } = useI18n({ useScope: 'global' })
const {
  items,
  unreadCount,
  isLoading,
  error,
  refreshNotifications,
  markRead,
  markAllRead
} = useAdminNotifications()

const groupedItems = computed(() => splitAdminNotifications(items.value))

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

async function handleMarkAllRead() {
  await markAllRead()
}

async function openNotification(item: AdminNotificationItem) {
  await markRead(item.id)

  const targetRoute = resolveNotificationRoute(item)
  if (targetRoute) {
    router.push(targetRoute)
  }
}

onMounted(() => {
  refreshNotifications()
})
</script>

<style scoped>
.notification-page-row:hover,
.notification-page-row:focus-visible {
  background: var(--nav-hover-bg) !important;
  border-color: rgba(var(--brand-rgb) / 0.25) !important;
}

.notification-page-row-arrow {
  opacity: 0;
  transition: opacity 130ms ease;
}

.notification-page-row:hover .notification-page-row-arrow,
.notification-page-row:focus-visible .notification-page-row-arrow {
  opacity: 1;
}
</style>
