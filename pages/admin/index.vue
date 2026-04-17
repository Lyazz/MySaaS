<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ t('admin.pages.dashboard.welcomeBack', { tenant: tenantName }) }}
        </h2>
        <p class="mt-1 text-slate-600">
          {{ t('admin.pages.dashboard.snapshot') }}
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
          {{ t('admin.pages.dashboard.refresh') }}
        </button>
        <NuxtLink
          v-if="!storeSettings?.isCompleted"
          to="/admin/onboarding"
          class="ui-btn ui-btn--primary ui-btn--md"
        >
          <Icon name="lucide:sparkles" class="h-4 w-4" />
          {{ t('admin.pages.dashboard.finishSetup') }}
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
            {{ t('admin.pages.dashboard.loadErrorTitle') }}
          </p>
          <p class="mt-1 text-red-700/80">
            {{ t('admin.pages.dashboard.loadErrorHint') }}
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <AdminDashboardStatCard
        :label="t('admin.pages.dashboard.stats.orders7d')"
        :value="dashboard.last7d.orders"
        icon="lucide:clipboard-list"
        :loading="pending"
        tone="blue"
        to="/admin/orders"
      />
      <AdminDashboardStatCard
        :label="t('admin.pages.dashboard.stats.revenue7d')"
        :value="formatMoney(dashboard.last7d.revenue)"
        icon="lucide:banknote"
        :loading="pending"
        tone="brand"
        to="/admin/orders"
      />
      <AdminDashboardStatCard
        :label="t('admin.pages.dashboard.stats.products')"
        :value="dashboard.counts.products"
        icon="lucide:package"
        :loading="pending"
        tone="teal"
        to="/admin/products"
      />
      <AdminDashboardStatCard
        :label="t('admin.pages.dashboard.stats.lowStock')"
        :value="dashboard.inventory.lowStockProducts"
        :hint="dashboard.inventory.outOfStockProducts ? t('admin.pages.dashboard.stats.outOfStock', { count: dashboard.inventory.outOfStockProducts }) : undefined"
        icon="lucide:alert-circle"
        :loading="pending"
        tone="amber"
        to="/admin/products"
      />
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 rounded-2xl bg-white overflow-hidden" style="border: 1px solid #eaecf0; box-shadow: 0 1px 3px rgba(0,0,0,0.04)">
        <div class="flex items-center justify-between gap-4 border-b border-slate-200/70 px-5 py-4">
          <div class="min-w-0">
            <h3 class="font-semibold text-slate-900">
              {{ t('admin.pages.dashboard.recentOrders.title') }}
            </h3>
            <p class="mt-0.5 text-sm text-slate-500">
              {{ t('admin.pages.dashboard.recentOrders.hint') }}
            </p>
          </div>
          <NuxtLink
            to="/admin/orders"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {{ t('admin.pages.dashboard.recentOrders.viewAll') }}
            <Icon name="lucide:arrow-right" class="h-4 w-4" />
          </NuxtLink>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200/70">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {{ t('admin.pages.dashboard.recentOrders.table.order') }}
                </th>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {{ t('admin.pages.dashboard.recentOrders.table.customer') }}
                </th>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {{ t('admin.pages.dashboard.recentOrders.table.total') }}
                </th>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {{ t('admin.pages.dashboard.recentOrders.table.status') }}
                </th>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {{ t('admin.pages.dashboard.recentOrders.table.date') }}
                </th>
                <th class="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {{ t('admin.pages.dashboard.recentOrders.table.action') }}
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
                    {{ t('admin.pages.dashboard.recentOrders.empty.title') }}
                  </p>
                  <p class="mt-1 text-sm text-slate-500">
                    {{ t('admin.pages.dashboard.recentOrders.empty.hint') }}
                  </p>
                  <NuxtLink
                    to="/"
                    class="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {{ t('admin.pages.dashboard.recentOrders.empty.viewStorefront') }}
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
                    class="inline-flex items-center gap-2 text-brand hover:opacity-80"
                  >
                    <Icon name="lucide:eye" class="h-4 w-4" />
                    {{ t('common.view') }}
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="space-y-6">
        <div class="rounded-2xl bg-white p-5" style="border: 1px solid #eaecf0; box-shadow: 0 1px 3px rgba(0,0,0,0.04)">
          <h3 class="font-semibold text-slate-900">
            {{ t('admin.pages.dashboard.orderStatus.title') }}
          </h3>
          <p class="mt-1 text-sm text-slate-500">
            {{ t('admin.pages.dashboard.orderStatus.hint') }}
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
                    {{ t(s.labelKey) }}
                  </span>
                </span>
                <span class="font-semibold text-slate-900">
                  {{ s.count }}
                </span>
            </NuxtLink>
          </div>
        </div>

        <div class="rounded-2xl bg-white p-5" style="border: 1px solid #eaecf0; box-shadow: 0 1px 3px rgba(0,0,0,0.04)">
          <h3 class="font-semibold text-slate-900">
            {{ t('admin.pages.dashboard.quickLinks.title') }}
          </h3>
          <p class="mt-1 text-sm text-slate-500">
            {{ t('admin.pages.dashboard.quickLinks.hint') }}
          </p>

          <div class="mt-4 grid grid-cols-1 gap-2">
            <NuxtLink
              to="/admin/products/create"
              class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span class="inline-flex items-center gap-2 font-medium text-slate-700">
                <Icon name="lucide:plus" class="h-4 w-4" />
                {{ t('admin.pages.dashboard.quickLinks.addProduct') }}
              </span>
              <Icon name="lucide:chevron-right" class="h-4 w-4 text-slate-400" />
            </NuxtLink>
            <NuxtLink
              to="/admin/products"
              class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span class="inline-flex items-center gap-2 font-medium text-slate-700">
                <Icon name="lucide:package" class="h-4 w-4" />
                {{ t('admin.pages.dashboard.quickLinks.manageProducts') }}
              </span>
              <Icon name="lucide:chevron-right" class="h-4 w-4 text-slate-400" />
            </NuxtLink>
            <NuxtLink
              to="/admin/categories"
              class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span class="inline-flex items-center gap-2 font-medium text-slate-700">
                <Icon name="lucide:tags" class="h-4 w-4" />
                {{ t('admin.pages.dashboard.quickLinks.categories') }}
              </span>
              <Icon name="lucide:chevron-right" class="h-4 w-4 text-slate-400" />
            </NuxtLink>
            <NuxtLink
              to="/admin/settings/appearance"
              class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span class="inline-flex items-center gap-2 font-medium text-slate-700">
                <Icon name="lucide:palette" class="h-4 w-4" />
                {{ t('admin.pages.dashboard.quickLinks.appearance') }}
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
  titleKey: 'admin.pages.dashboard.title'
})

const authStore = useAuthStore()
const { t, locale } = useI18n({ useScope: 'global' })

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
  const intlLocale = locale.value === 'fr' ? 'fr-FR' : locale.value === 'ar' ? 'ar-DZ' : 'en-US'
  return date.toLocaleString(intlLocale, {
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
    { status: 'PENDING', labelKey: 'admin.orderStatus.pending', dotClass: 'bg-amber-500' },
    { status: 'CONFIRMED', labelKey: 'admin.orderStatus.confirmed', dotClass: 'bg-blue-500' },
    { status: 'SHIPPED', labelKey: 'admin.orderStatus.shipped', dotClass: 'bg-cyan-500' },
    { status: 'DELIVERED', labelKey: 'admin.orderStatus.delivered', dotClass: 'bg-green-500' },
    { status: 'CANCELLED', labelKey: 'admin.orderStatus.cancelled', dotClass: 'bg-red-500' },
    { status: 'RETURNED', labelKey: 'admin.orderStatus.returned', dotClass: 'bg-purple-500' }
  ]
  return rows.map((r) => ({ ...r, count: Number(byStatus[r.status] || 0) }))
})
</script>
