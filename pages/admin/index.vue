<template>
  <div class="space-y-5">

    <!-- Page header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-[10.5px] font-bold uppercase tracking-widest mb-1" style="color: var(--text-tertiary)">
          {{ t('admin.pages.dashboard.snapshot') }}
        </p>
        <h2 class="text-[22px] font-semibold tracking-tight" style="color: var(--text-primary); letter-spacing: -0.02em">
          {{ t('admin.pages.dashboard.welcomeBack', { tenant: tenantName }) }}
        </h2>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <NuxtLink
          v-if="!storeSettings?.isCompleted"
          to="/admin/onboarding"
          class="ui-btn ui-btn--md ui-btn--primary"
        >
          <Icon name="lucide:sparkles" class="h-4 w-4" />
          {{ t('admin.pages.dashboard.finishSetup') }}
        </NuxtLink>
        <button
          type="button"
          class="ui-btn ui-btn--sm ui-btn--secondary"
          :disabled="pending"
          @click="refresh()"
        >
          <Icon name="lucide:refresh-cw" class="h-3.5 w-3.5" :class="pending ? 'animate-spin' : ''" />
          {{ t('admin.pages.dashboard.refresh') }}
        </button>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-if="error && !pending"
      class="rounded-xl px-4 py-3 text-sm flex items-center gap-3"
      style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.18); color: #f87171"
    >
      <Icon name="lucide:triangle-alert" class="h-4 w-4 shrink-0" />
      <div>
        <span class="font-semibold">{{ t('admin.pages.dashboard.loadErrorTitle') }}</span>
        <span class="ml-1.5 opacity-70">{{ t('admin.pages.dashboard.loadErrorHint') }}</span>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        tone="brand"
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

    <!-- Main content -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">

      <!-- Recent orders (2/3) -->
      <div class="lg:col-span-2 rounded-2xl overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <div class="flex items-center justify-between gap-4 px-5 py-4" style="border-bottom: 1px solid var(--surface-border)">
          <div class="min-w-0">
            <h3 class="text-[13.5px] font-semibold" style="color: var(--text-primary)">
              {{ t('admin.pages.dashboard.recentOrders.title') }}
            </h3>
            <p class="mt-0.5 text-[12px]" style="color: var(--text-tertiary)">
              {{ t('admin.pages.dashboard.recentOrders.hint') }}
            </p>
          </div>
          <NuxtLink
            to="/admin/orders"
            class="ui-btn ui-btn--sm ui-btn--secondary shrink-0"
          >
            {{ t('admin.pages.dashboard.recentOrders.viewAll') }}
            <Icon name="lucide:arrow-right" class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr style="background: var(--surface-2)">
                <th v-for="col in tableColumns" :key="col" class="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style="color: var(--text-muted); border-bottom: 1px solid var(--surface-border)">
                  {{ col }}
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- Skeleton -->
              <tr v-if="pending" v-for="n in 5" :key="'sk-' + n">
                <td class="px-5 py-3.5" style="border-bottom: 1px solid var(--surface-border)">
                  <div class="h-3.5 w-20 rounded animate-pulse" style="background: rgba(255,255,255,0.06)" />
                </td>
                <td class="px-5 py-3.5" style="border-bottom: 1px solid var(--surface-border)">
                  <div class="space-y-1.5">
                    <div class="h-3.5 w-36 rounded animate-pulse" style="background: rgba(255,255,255,0.06)" />
                    <div class="h-3 w-24 rounded animate-pulse" style="background: rgba(255,255,255,0.04)" />
                  </div>
                </td>
                <td class="px-5 py-3.5" style="border-bottom: 1px solid var(--surface-border)">
                  <div class="h-3.5 w-20 rounded animate-pulse font-mono-nums" style="background: rgba(255,255,255,0.06)" />
                </td>
                <td class="px-5 py-3.5" style="border-bottom: 1px solid var(--surface-border)">
                  <div class="h-5 w-20 rounded-md animate-pulse" style="background: rgba(255,255,255,0.06)" />
                </td>
                <td class="px-5 py-3.5" style="border-bottom: 1px solid var(--surface-border)">
                  <div class="h-3.5 w-28 rounded animate-pulse" style="background: rgba(255,255,255,0.06)" />
                </td>
                <td class="px-5 py-3.5 text-right" style="border-bottom: 1px solid var(--surface-border)">
                  <div class="ml-auto h-3.5 w-12 rounded animate-pulse" style="background: rgba(255,255,255,0.06)" />
                </td>
              </tr>

              <!-- Empty -->
              <tr v-else-if="dashboard.recentOrders.length === 0">
                <td colspan="6" class="px-5 py-14 text-center">
                  <div class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
                    <Icon name="lucide:inbox" class="h-5 w-5" style="color: var(--text-muted)" />
                  </div>
                  <p class="text-[13px] font-semibold" style="color: var(--text-secondary)">
                    {{ t('admin.pages.dashboard.recentOrders.empty.title') }}
                  </p>
                  <p class="mt-1 text-[12px]" style="color: var(--text-tertiary)">
                    {{ t('admin.pages.dashboard.recentOrders.empty.hint') }}
                  </p>
                  <NuxtLink
                    to="/"
                    class="ui-btn ui-btn--sm ui-btn--secondary mt-4 mx-auto"
                  >
                    {{ t('admin.pages.dashboard.recentOrders.empty.viewStorefront') }}
                    <Icon name="lucide:external-link" class="h-3.5 w-3.5" />
                  </NuxtLink>
                </td>
              </tr>

              <!-- Rows -->
              <tr
                v-else
                v-for="order in dashboard.recentOrders"
                :key="order.id"
                class="table-row-hover"
              >
                <td class="px-5 py-3.5 whitespace-nowrap" style="border-bottom: 1px solid var(--surface-border)">
                  <span class="text-[12px] font-semibold font-mono-nums" style="color: var(--text-primary)">#{{ order.id.substring(0, 8) }}</span>
                </td>
                <td class="px-5 py-3.5" style="border-bottom: 1px solid var(--surface-border)">
                  <p class="text-[13px] font-medium" style="color: var(--text-primary)">{{ order.customerName }}</p>
                  <p class="text-[11px] mt-0.5" style="color: var(--text-tertiary)">{{ order.customerPhone }}</p>
                </td>
                <td class="px-5 py-3.5 whitespace-nowrap" style="border-bottom: 1px solid var(--surface-border)">
                  <span class="text-[13px] font-semibold font-mono-nums" style="color: var(--text-primary)">{{ formatMoney(order.totalAmount) }}</span>
                </td>
                <td class="px-5 py-3.5 whitespace-nowrap" style="border-bottom: 1px solid var(--surface-border)">
                  <AdminOrderStatusBadge :status="order.status" />
                </td>
                <td class="px-5 py-3.5 whitespace-nowrap text-[12px]" style="border-bottom: 1px solid var(--surface-border); color: var(--text-tertiary)">
                  {{ formatDateTime(order.createdAt) }}
                </td>
                <td class="px-5 py-3.5 whitespace-nowrap text-right" style="border-bottom: 1px solid var(--surface-border)">
                  <NuxtLink
                    :to="`/admin/orders/${order.id}`"
                    class="inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-70"
                    style="color: var(--brand)"
                  >
                    <Icon name="lucide:eye" class="h-3.5 w-3.5" />
                    {{ t('common.view') }}
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right column -->
      <div class="space-y-4">

        <!-- Order status breakdown -->
        <div class="rounded-2xl p-5" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
          <h3 class="text-[13.5px] font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.dashboard.orderStatus.title') }}
          </h3>
          <p class="mt-0.5 text-[12px]" style="color: var(--text-tertiary)">
            {{ t('admin.pages.dashboard.orderStatus.hint') }}
          </p>

          <div class="mt-4 space-y-1.5">
            <NuxtLink
              v-for="s in statusRows"
              :key="s.status"
              :to="`/admin/orders?status=${encodeURIComponent(s.status)}`"
              class="status-row flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-150"
            >
              <span class="inline-flex items-center gap-2.5 text-[12.5px] font-medium" style="color: var(--text-secondary)">
                <span class="h-2 w-2 rounded-full shrink-0" :class="s.dotClass" />
                {{ t(s.labelKey) }}
              </span>
              <span class="text-[12px] font-semibold font-mono-nums" style="color: var(--text-primary)">{{ s.count }}</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Quick links -->
        <div class="rounded-2xl p-5" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
          <h3 class="text-[13.5px] font-semibold" style="color: var(--text-primary)">
            {{ t('admin.pages.dashboard.quickLinks.title') }}
          </h3>
          <p class="mt-0.5 text-[12px]" style="color: var(--text-tertiary)">
            {{ t('admin.pages.dashboard.quickLinks.hint') }}
          </p>

          <div class="mt-4 space-y-1.5">
            <NuxtLink
              v-for="link in quickLinks"
              :key="link.to"
              :to="link.to"
              class="status-row flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-150"
            >
              <span class="inline-flex items-center gap-2.5 text-[12.5px] font-medium" style="color: var(--text-secondary)">
                <Icon :name="link.icon" class="h-3.5 w-3.5 shrink-0" style="color: var(--text-tertiary)" />
                {{ link.label }}
              </span>
              <Icon name="lucide:chevron-right" class="h-3.5 w-3.5" style="color: var(--text-muted)" />
            </NuxtLink>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.table-row-hover {
  transition: background 0.1s ease;
}
.table-row-hover:hover {
  background: rgba(255,255,255,0.025);
}

.status-row {
  background: transparent;
}
.status-row:hover {
  background: rgba(255,255,255,0.04);
}
</style>

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
  counts: { products: number; categories: number; orders: number }
  last7d: { orders: number; revenue: number }
  inventory: { lowStockProducts: number; outOfStockProducts: number }
  ordersByStatus: Record<string, number>
  recentOrders: Array<{
    id: string; status: string; totalAmount: number
    customerName: string; customerPhone: string; createdAt: string
  }>
}

const storeSettings = useState<any>('storeSettings')
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
  { server: false, watch: [() => authStore.token], default: () => emptyDashboard }
)

const dashboard = computed(() => data.value || emptyDashboard)
const { format: formatMoney } = useCurrency()

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  const intlLocale = locale.value === 'fr' ? 'fr-FR' : locale.value === 'ar' ? 'ar-DZ' : 'en-US'
  return date.toLocaleString(intlLocale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const tableColumns = computed(() => [
  t('admin.pages.dashboard.recentOrders.table.order'),
  t('admin.pages.dashboard.recentOrders.table.customer'),
  t('admin.pages.dashboard.recentOrders.table.total'),
  t('admin.pages.dashboard.recentOrders.table.status'),
  t('admin.pages.dashboard.recentOrders.table.date'),
  t('admin.pages.dashboard.recentOrders.table.action')
])

const statusRows = computed(() => {
  const byStatus = dashboard.value.ordersByStatus || {}
  return [
    { status: 'PENDING',   labelKey: 'admin.orderStatus.pending',   dotClass: 'bg-amber-500' },
    { status: 'CONFIRMED', labelKey: 'admin.orderStatus.confirmed', dotClass: 'bg-blue-500' },
    { status: 'SHIPPED',   labelKey: 'admin.orderStatus.shipped',   dotClass: 'bg-indigo-400' },
    { status: 'DELIVERED', labelKey: 'admin.orderStatus.delivered', dotClass: 'bg-emerald-500' },
    { status: 'CANCELLED', labelKey: 'admin.orderStatus.cancelled', dotClass: 'bg-red-500' },
    { status: 'RETURNED',  labelKey: 'admin.orderStatus.returned',  dotClass: 'bg-purple-400' }
  ].map((r) => ({ ...r, count: Number(byStatus[r.status] || 0) }))
})

const quickLinks = computed(() => [
  { to: '/admin/products/create', icon: 'lucide:plus', label: t('admin.pages.dashboard.quickLinks.addProduct') },
  { to: '/admin/products', icon: 'lucide:package', label: t('admin.pages.dashboard.quickLinks.manageProducts') },
  { to: '/admin/categories', icon: 'lucide:tags', label: t('admin.pages.dashboard.quickLinks.categories') },
  { to: '/admin/settings/appearance', icon: 'lucide:palette', label: t('admin.pages.dashboard.quickLinks.appearance') }
])
</script>
