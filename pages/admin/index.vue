<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome back, {{ tenantName }}
        </h2>
        <p class="mt-1 text-slate-600">
          A quick snapshot of your store.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          :disabled="pending"
          @click="refresh()"
        >
          <Icon
            name="lucide:refresh-cw"
            class="h-4 w-4"
            :class="pending ? 'animate-spin' : ''"
          />
          Refresh
        </button>
        <NuxtLink
          v-if="!storeSettings?.isCompleted"
          to="/admin/onboarding"
          class="inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--brand-rgb))] px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95"
        >
          <Icon name="lucide:sparkles" class="h-4 w-4" />
          Finish setup
        </NuxtLink>
      </div>
    </div>

    <div
      v-if="error && !pending"
      class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <div class="flex items-start gap-3">
        <Icon name="lucide:triangle-alert" class="mt-0.5 h-4 w-4" />
        <div class="min-w-0">
          <p class="font-medium">
            Dashboard data couldn’t be loaded.
          </p>
          <p class="mt-1 text-red-700/80">
            Try refreshing. If it keeps happening, check your connection or login session.
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <AdminDashboardStatCard
        label="Orders (7 days)"
        :value="dashboard.last7d.orders"
        icon="lucide:clipboard-list"
        :loading="pending"
        tone="blue"
        to="/admin/orders"
      />
      <AdminDashboardStatCard
        label="Revenue (7 days)"
        :value="formatMoney(dashboard.last7d.revenue)"
        icon="lucide:banknote"
        :loading="pending"
        tone="brand"
        to="/admin/orders"
      />
      <AdminDashboardStatCard
        label="Products"
        :value="dashboard.counts.products"
        icon="lucide:package"
        :loading="pending"
        tone="teal"
        to="/admin/products"
      />
      <AdminDashboardStatCard
        label="Low stock"
        :value="dashboard.inventory.lowStockProducts"
        :hint="dashboard.inventory.outOfStockProducts ? `${dashboard.inventory.outOfStockProducts} out of stock` : undefined"
        icon="lucide:alert-circle"
        :loading="pending"
        tone="amber"
        to="/admin/products"
      />
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        <div class="flex items-center justify-between gap-4 border-b border-slate-200/70 px-5 py-4">
          <div class="min-w-0">
            <h3 class="font-semibold text-slate-900">
              Recent orders
            </h3>
            <p class="mt-0.5 text-sm text-slate-500">
              Latest 8 orders for this tenant.
            </p>
          </div>
          <NuxtLink
            to="/admin/orders"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View all
            <Icon name="lucide:arrow-right" class="h-4 w-4" />
          </NuxtLink>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200/70">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Order
                </th>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Customer
                </th>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total
                </th>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th class="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-200/70 bg-white">
              <tr
                v-if="pending"
                v-for="n in 6"
                :key="n"
                class="hover:bg-slate-50"
              >
                <td class="px-5 py-4">
                  <div class="h-4 w-24 rounded bg-slate-100 animate-pulse" />
                </td>
                <td class="px-5 py-4">
                  <div class="h-4 w-48 rounded bg-slate-100 animate-pulse" />
                </td>
                <td class="px-5 py-4">
                  <div class="h-4 w-28 rounded bg-slate-100 animate-pulse" />
                </td>
                <td class="px-5 py-4">
                  <div class="h-5 w-24 rounded-full bg-slate-100 animate-pulse" />
                </td>
                <td class="px-5 py-4">
                  <div class="h-4 w-36 rounded bg-slate-100 animate-pulse" />
                </td>
                <td class="px-5 py-4 text-right">
                  <div class="ml-auto h-4 w-16 rounded bg-slate-100 animate-pulse" />
                </td>
              </tr>

              <tr
                v-else-if="dashboard.recentOrders.length === 0"
                class="bg-white"
              >
                <td
                  colspan="6"
                  class="px-5 py-10 text-center"
                >
                  <Icon name="lucide:inbox" class="mx-auto h-10 w-10 text-slate-300" />
                  <p class="mt-3 text-sm font-medium text-slate-900">
                    No orders yet
                  </p>
                  <p class="mt-1 text-sm text-slate-500">
                    New orders will appear here as customers checkout.
                  </p>
                  <NuxtLink
                    to="/"
                    class="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View storefront
                    <Icon name="lucide:external-link" class="h-4 w-4" />
                  </NuxtLink>
                </td>
              </tr>

              <tr
                v-else
                v-for="order in dashboard.recentOrders"
                :key="order.id"
                class="hover:bg-slate-50"
              >
                <td class="px-5 py-4 whitespace-nowrap">
                  <p class="text-sm font-semibold text-slate-900">
                    #{{ order.id.substring(0, 8) }}
                  </p>
                </td>
                <td class="px-5 py-4">
                  <p class="text-sm font-medium text-slate-900">
                    {{ order.customerName }}
                  </p>
                  <p class="text-sm text-slate-500">
                    {{ order.customerPhone }}
                  </p>
                </td>
                <td class="px-5 py-4 whitespace-nowrap">
                  <p class="text-sm font-semibold text-slate-900">
                    {{ formatMoney(order.totalAmount) }}
                  </p>
                </td>
                <td class="px-5 py-4 whitespace-nowrap">
                  <AdminOrderStatusBadge :status="order.status" />
                </td>
                <td class="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
                  {{ formatDateTime(order.createdAt) }}
                </td>
                <td class="px-5 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <NuxtLink
                    :to="`/admin/orders/${order.id}`"
                    class="inline-flex items-center gap-2 text-[rgb(var(--brand-rgb))] hover:opacity-80"
                  >
                    <Icon name="lucide:eye" class="h-4 w-4" />
                    View
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="space-y-6">
        <div class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <h3 class="font-semibold text-slate-900">
            Order status
          </h3>
          <p class="mt-1 text-sm text-slate-500">
            Quick filters to jump into your order list.
          </p>

          <div class="mt-4 space-y-2">
            <NuxtLink
              v-for="s in statusRows"
              :key="s.status"
              :to="`/admin/orders?status=${encodeURIComponent(s.status)}`"
              class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span class="inline-flex items-center gap-2 text-slate-700">
                <span
                  class="h-2.5 w-2.5 rounded-full"
                  :class="s.dotClass"
                />
                <span class="font-medium">
                  {{ s.label }}
                </span>
              </span>
              <span class="font-semibold text-slate-900">
                {{ s.count }}
              </span>
            </NuxtLink>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <h3 class="font-semibold text-slate-900">
            Quick actions
          </h3>
          <p class="mt-1 text-sm text-slate-500">
            The most common admin tasks.
          </p>

          <div class="mt-4 grid grid-cols-1 gap-2">
            <NuxtLink
              to="/admin/products/create"
              class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span class="inline-flex items-center gap-2 font-medium text-slate-700">
                <Icon name="lucide:plus" class="h-4 w-4" />
                Add product
              </span>
              <Icon name="lucide:chevron-right" class="h-4 w-4 text-slate-400" />
            </NuxtLink>
            <NuxtLink
              to="/admin/products"
              class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span class="inline-flex items-center gap-2 font-medium text-slate-700">
                <Icon name="lucide:package" class="h-4 w-4" />
                Manage products
              </span>
              <Icon name="lucide:chevron-right" class="h-4 w-4 text-slate-400" />
            </NuxtLink>
            <NuxtLink
              to="/admin/categories"
              class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span class="inline-flex items-center gap-2 font-medium text-slate-700">
                <Icon name="lucide:tags" class="h-4 w-4" />
                Categories
              </span>
              <Icon name="lucide:chevron-right" class="h-4 w-4 text-slate-400" />
            </NuxtLink>
            <NuxtLink
              to="/admin/settings/appearance"
              class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span class="inline-flex items-center gap-2 font-medium text-slate-700">
                <Icon name="lucide:palette" class="h-4 w-4" />
                Appearance
              </span>
              <Icon name="lucide:chevron-right" class="h-4 w-4 text-slate-400" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Dashboard'
})

const authStore = useAuthStore()

type DashboardResponse = {
  counts: {
    products: number
    categories: number
    orders: number
  }
  last7d: {
    orders: number
    revenue: number
  }
  inventory: {
    lowStockProducts: number
    outOfStockProducts: number
  }
  ordersByStatus: Record<string, number>
  recentOrders: Array<{
    id: string
    status: string
    totalAmount: number
    customerName: string
    customerPhone: string
    createdAt: string
  }>
}

const storeSettings = useState<any>('storeSettings')
const currencyCode = computed(() => storeSettings.value?.currencyCode || 'DZD')
const tenantName = computed(() => authStore.user?.tenant?.name || 'your store')

const emptyDashboard: DashboardResponse = {
  counts: { products: 0, categories: 0, orders: 0 },
  last7d: { orders: 0, revenue: 0 },
  inventory: { lowStockProducts: 0, outOfStockProducts: 0 },
  ordersByStatus: {},
  recentOrders: []
}

const { data, pending, error, refresh } = await useAsyncData<DashboardResponse>(
  'adminDashboard',
  async () => {
    const token = (authStore as any).token?.value ?? (authStore as any).token
    if (!token || typeof token !== 'string') return emptyDashboard
    return $fetch<DashboardResponse>('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
  },
  {
    // Admin pages don't need SSR; this also avoids token-ref quirks during hard refresh.
    server: false,
    watch: [() => authStore.token],
    default: () => emptyDashboard
  }
)

const dashboard = computed(() => data.value || emptyDashboard)

const { format: formatMoney } = useCurrency()

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const statusRows = computed(() => {
  const byStatus = dashboard.value.ordersByStatus || {}
  const rows = [
    { status: 'PENDING', label: 'Pending', dotClass: 'bg-amber-500' },
    { status: 'CONFIRMED', label: 'Confirmed', dotClass: 'bg-blue-500' },
    { status: 'SHIPPED', label: 'Shipped', dotClass: 'bg-cyan-500' },
    { status: 'DELIVERED', label: 'Delivered', dotClass: 'bg-green-500' },
    { status: 'CANCELLED', label: 'Cancelled', dotClass: 'bg-red-500' },
    { status: 'RETURNED', label: 'Returned', dotClass: 'bg-purple-500' }
  ]
  return rows.map((r) => ({ ...r, count: Number(byStatus[r.status] || 0) }))
})
</script>
