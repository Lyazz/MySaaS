<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <p class="text-[9.5px] font-bold uppercase tracking-[0.1em] mb-1" style="color: var(--text-muted)">
          {{ t('admin.pages.statistics.subtitle') }}
        </p>
        <h2 class="text-[20px] font-semibold" style="color: var(--text-primary); letter-spacing: -0.02em">
          {{ t('admin.pages.statistics.title') }}
        </h2>
      </div>

      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          class="ui-btn ui-btn--sm ui-btn--secondary"
          :disabled="exporting"
          @click="exportCsv"
        >
          <Icon v-if="exporting" name="lucide:loader-2" class="h-3.5 w-3.5 animate-spin" />
          <Icon v-else name="lucide:download" class="h-3.5 w-3.5" />
          {{ t('admin.pages.statistics.export') }}
        </button>

        <button
          type="button"
          class="ui-btn ui-btn--sm ui-btn--secondary"
          :disabled="pending"
          @click="refresh()"
        >
          <Icon name="lucide:refresh-cw" class="h-3.5 w-3.5" :class="pending ? 'animate-spin' : ''" />
          {{ t('admin.pages.statistics.refresh') }}
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="rounded-2xl p-4 flex flex-wrap items-end gap-3" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
      <DateFilter
        v-model:start-date="customFrom"
        v-model:end-date="customTo"
        v-model:range="selectedRange"
        :label="t('admin.pages.statistics.filters.range')"
        class="w-full sm:w-auto"
        testid="statistics"
      />

      <div v-if="activeTab !== 'delivery' && activeTab !== 'customers'" class="w-auto">
        <label class="ui-label block mb-1">{{ t('admin.pages.statistics.filters.channel') }}</label>
        <select v-model="channel" class="ui-input h-9 py-1 text-[12px]">
          <option value="all">{{ t('admin.pages.statistics.filters.channels.all') }}</option>
          <option value="online">{{ t('admin.pages.statistics.filters.channels.online') }}</option>
          <option value="pos">{{ t('admin.pages.statistics.filters.channels.pos') }}</option>
        </select>
      </div>

      <div v-if="activeTab === 'sales' || activeTab === 'products'" class="w-auto">
        <label class="ui-label block mb-1">{{ t('admin.pages.statistics.filters.category') }}</label>
        <select v-model="categoryId" class="ui-input h-9 py-1 text-[12px]">
          <option value="">{{ t('admin.pages.statistics.filters.allCategories') }}</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.title }}</option>
        </select>
      </div>

      <div v-if="activeTab === 'delivery'" class="w-auto">
        <label class="ui-label block mb-1">{{ t('admin.pages.statistics.filters.provider') }}</label>
        <select v-model="provider" class="ui-input h-9 py-1 text-[12px]">
          <option value="">{{ t('admin.pages.statistics.filters.allProviders') }}</option>
          <option v-for="p in providerOptions" :key="p" :value="p">{{ providerLabel(p) }}</option>
        </select>
      </div>

      <div v-if="activeTab === 'delivery' || activeTab === 'customers'" class="w-auto">
        <label class="ui-label block mb-1">{{ t('admin.pages.statistics.filters.wilaya') }}</label>
        <select v-model="wilayaCode" class="ui-input h-9 py-1 text-[12px]">
          <option value="">{{ t('admin.pages.statistics.filters.allWilayas') }}</option>
          <option v-for="w in DZ_WILAYAS" :key="w.code" :value="w.code">{{ w.name }}</option>
        </select>
      </div>
    </div>

    <AdminTabFilter v-model="activeTab" :tabs="tabDefs" />

    <div
      v-if="error && !pending"
      class="rounded-xl px-4 py-3 text-sm flex items-center gap-3"
      style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.18); color: #f87171"
    >
      <Icon name="lucide:triangle-alert" class="h-4 w-4 shrink-0" />
      <div>
        <span class="font-semibold">{{ t('admin.pages.statistics.loadErrorTitle') }}</span>
        <span class="ms-1.5 opacity-70">{{ t('admin.pages.statistics.loadErrorHint') }}</span>
      </div>
    </div>

    <!-- Sales tab -->
    <template v-if="activeTab === 'sales' && sales">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminDashboardStatCard
          :label="t('admin.pages.statistics.sales.kpis.revenue')"
          :value="formatMoney(sales.kpis.revenue.value)"
          :change-pct="sales.kpis.revenue.changePct"
          :compare-label="t('admin.pages.statistics.compareLabel')"
          icon="lucide:wallet" tone="brand" :loading="pending"
        />
        <AdminDashboardStatCard
          :label="t('admin.pages.statistics.sales.kpis.onlineRevenue')"
          :value="formatMoney(sales.kpis.onlineRevenue.value)"
          :change-pct="sales.kpis.onlineRevenue.changePct"
          :compare-label="t('admin.pages.statistics.compareLabel')"
          icon="lucide:shopping-bag" tone="blue" :loading="pending"
        />
        <AdminDashboardStatCard
          :label="t('admin.pages.statistics.sales.kpis.posRevenue')"
          :value="formatMoney(sales.kpis.posRevenue.value)"
          :change-pct="sales.kpis.posRevenue.changePct"
          :compare-label="t('admin.pages.statistics.compareLabel')"
          icon="lucide:monitor-smartphone" tone="indigo" :loading="pending"
        />
        <AdminDashboardStatCard
          :label="t('admin.pages.statistics.sales.kpis.ordersCount')"
          :value="sales.kpis.ordersCount.value"
          :change-pct="sales.kpis.ordersCount.changePct"
          :compare-label="t('admin.pages.statistics.compareLabel')"
          icon="lucide:clipboard-list" tone="amber" :loading="pending"
        />
        <AdminDashboardStatCard
          :label="t('admin.pages.statistics.sales.kpis.avgBasket')"
          :value="formatMoney(sales.kpis.avgBasket.value)"
          :change-pct="sales.kpis.avgBasket.changePct"
          :compare-label="t('admin.pages.statistics.compareLabel')"
          icon="lucide:shopping-basket" tone="slate" :loading="pending"
        />
      </div>

      <AdminStatsTrendChart
        :title="t('admin.pages.statistics.sales.trend.title')"
        :hint="t('admin.pages.statistics.sales.trend.hint')"
        :points="salesTrendPoints"
        color="#FF7A45"
        :loading="pending"
        :empty-label="t('admin.pages.dashboard.trends.empty')"
        v-model:selected-date="selectedTrendDate"
        :format-value="formatMoney"
      />

      <div class="rounded-2xl overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <div class="px-5 py-4" style="border-bottom: 1px solid var(--surface-border)">
          <h3 class="text-[13px] font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.statistics.sales.byCategory.title') }}</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <tbody>
              <tr v-if="sales.byCategory.length === 0">
                <td class="px-5 py-8 text-center text-[12.5px]" style="color: var(--text-tertiary)">{{ t('admin.pages.statistics.sales.byCategory.empty') }}</td>
              </tr>
              <tr v-for="row in sales.byCategory" :key="row.categoryId" class="table-row-hover">
                <td class="px-5 py-3 text-[13px]" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ row.title }}</td>
                <td class="px-5 py-3 text-end text-[12px] font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-tertiary)">{{ row.quantity }}</td>
                <td class="px-5 py-3 text-end text-[13px] font-semibold font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ formatMoney(row.revenue) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Delivery tab -->
    <template v-if="activeTab === 'delivery' && delivery">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminDashboardStatCard :label="t('admin.pages.statistics.delivery.kpis.totalShipments')" :value="delivery.kpis.totalShipments" icon="lucide:truck" tone="brand" :loading="pending" />
        <AdminDashboardStatCard :label="t('admin.pages.statistics.delivery.kpis.deliveredRate')" :value="`${delivery.kpis.deliveredRate}%`" icon="lucide:package-check" tone="blue" :loading="pending" />
        <AdminDashboardStatCard :label="t('admin.pages.statistics.delivery.kpis.returnedRate')" :value="`${delivery.kpis.returnedRate}%`" icon="lucide:package-x" tone="red" :loading="pending" />
        <AdminDashboardStatCard :label="t('admin.pages.statistics.delivery.kpis.cancelledRate')" :value="`${delivery.kpis.cancelledRate}%`" icon="lucide:ban" tone="amber" :loading="pending" />
        <AdminDashboardStatCard
          :label="t('admin.pages.statistics.delivery.kpis.avgDeliveryDays')"
          :value="delivery.kpis.avgDeliveryDays === null ? '—' : delivery.kpis.avgDeliveryDays"
          icon="lucide:clock" tone="indigo" :loading="pending"
        />
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-2xl overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
          <div class="px-5 py-4" style="border-bottom: 1px solid var(--surface-border)">
            <h3 class="text-[13px] font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.statistics.delivery.byProvider.title') }}</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead>
                <tr style="background: var(--surface-2)">
                  <th class="px-5 py-2.5 text-start text-[9.5px] font-bold uppercase tracking-[0.08em]" style="color: var(--text-muted); border-bottom: 1px solid var(--surface-border)">{{ t('admin.pages.statistics.delivery.table.provider') }}</th>
                  <th class="px-5 py-2.5 text-end text-[9.5px] font-bold uppercase tracking-[0.08em]" style="color: var(--text-muted); border-bottom: 1px solid var(--surface-border)">{{ t('admin.pages.statistics.delivery.table.total') }}</th>
                  <th class="px-5 py-2.5 text-end text-[9.5px] font-bold uppercase tracking-[0.08em]" style="color: var(--text-muted); border-bottom: 1px solid var(--surface-border)">{{ t('admin.pages.statistics.delivery.table.rate') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="delivery.byProvider.length === 0">
                  <td colspan="3" class="px-5 py-8 text-center text-[12.5px]" style="color: var(--text-tertiary)">{{ t('admin.pages.statistics.delivery.byProvider.empty') }}</td>
                </tr>
                <tr v-for="row in delivery.byProvider" :key="row.provider" class="table-row-hover">
                  <td class="px-5 py-3 text-[13px]" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ providerLabel(row.provider) }}</td>
                  <td class="px-5 py-3 text-end text-[12px] font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-tertiary)">{{ row.total }}</td>
                  <td class="px-5 py-3 text-end text-[13px] font-semibold font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ row.deliveredRate }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="rounded-2xl overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
          <div class="px-5 py-4" style="border-bottom: 1px solid var(--surface-border)">
            <h3 class="text-[13px] font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.statistics.delivery.byWilaya.title') }}</h3>
          </div>
          <div class="overflow-x-auto max-h-[360px]">
            <table class="min-w-full">
              <thead>
                <tr style="background: var(--surface-2)">
                  <th class="px-5 py-2.5 text-start text-[9.5px] font-bold uppercase tracking-[0.08em]" style="color: var(--text-muted); border-bottom: 1px solid var(--surface-border)">{{ t('admin.pages.statistics.delivery.table.wilaya') }}</th>
                  <th class="px-5 py-2.5 text-end text-[9.5px] font-bold uppercase tracking-[0.08em]" style="color: var(--text-muted); border-bottom: 1px solid var(--surface-border)">{{ t('admin.pages.statistics.delivery.table.total') }}</th>
                  <th class="px-5 py-2.5 text-end text-[9.5px] font-bold uppercase tracking-[0.08em]" style="color: var(--text-muted); border-bottom: 1px solid var(--surface-border)">{{ t('admin.pages.statistics.delivery.table.rate') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="delivery.byWilaya.length === 0">
                  <td colspan="3" class="px-5 py-8 text-center text-[12.5px]" style="color: var(--text-tertiary)">{{ t('admin.pages.statistics.delivery.byWilaya.empty') }}</td>
                </tr>
                <tr v-for="row in delivery.byWilaya" :key="row.wilayaCode" class="table-row-hover">
                  <td class="px-5 py-3 text-[13px]" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ wilayaName(row.wilayaCode) }}</td>
                  <td class="px-5 py-3 text-end text-[12px] font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-tertiary)">{{ row.total }}</td>
                  <td class="px-5 py-3 text-end text-[13px] font-semibold font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ row.deliveredRate }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Products tab -->
    <template v-if="activeTab === 'products' && products">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminDashboardStatCard :label="t('admin.pages.statistics.products.kpis.activeProducts')" :value="products.kpis.activeProducts" icon="lucide:package" tone="brand" :loading="pending" />
        <AdminDashboardStatCard :label="t('admin.pages.statistics.products.kpis.lowStockProducts')" :value="products.kpis.lowStockProducts" icon="lucide:triangle-alert" tone="amber" :loading="pending" />
        <AdminDashboardStatCard :label="t('admin.pages.statistics.products.kpis.outOfStockProducts')" :value="products.kpis.outOfStockProducts" icon="lucide:package-x" tone="red" :loading="pending" />
        <AdminDashboardStatCard :label="t('admin.pages.statistics.products.kpis.neverSoldProducts')" :value="products.kpis.neverSoldProducts" icon="lucide:eye-off" tone="slate" :loading="pending" />
        <AdminDashboardStatCard :label="t('admin.pages.statistics.products.kpis.clearanceDiscountTotal')" :value="formatMoney(products.kpis.clearanceDiscountTotal)" icon="lucide:tag" tone="indigo" :loading="pending" />
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatsTableCard :title="t('admin.pages.statistics.products.top.title')" :empty="t('admin.pages.statistics.products.top.empty')" :rows="products.topProducts">
          <template #row="{ row }">
            <td class="px-5 py-3 text-[13px]" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ row.title }}</td>
            <td class="px-5 py-3 text-end text-[12px] font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-tertiary)">{{ row.quantity }}</td>
            <td class="px-5 py-3 text-end text-[13px] font-semibold font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ formatMoney(row.revenue) }}</td>
          </template>
        </StatsTableCard>

        <StatsTableCard :title="t('admin.pages.statistics.products.flop.title')" :empty="t('admin.pages.statistics.products.flop.empty')" :rows="products.flopProducts">
          <template #row="{ row }">
            <td class="px-5 py-3 text-[13px]" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ row.title }}</td>
            <td class="px-5 py-3 text-end text-[12px] font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-tertiary)">{{ row.quantity }}</td>
            <td class="px-5 py-3 text-end text-[13px] font-semibold font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ formatMoney(row.revenue) }}</td>
          </template>
        </StatsTableCard>

        <div class="rounded-2xl overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
          <div class="px-5 py-4" style="border-bottom: 1px solid var(--surface-border)">
            <h3 class="text-[13px] font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.statistics.products.rotation.title') }}</h3>
            <p class="mt-0.5 text-[11.5px]" style="color: var(--text-tertiary)">{{ t('admin.pages.statistics.products.rotation.hint') }}</p>
          </div>
          <div class="overflow-x-auto max-h-[360px]">
            <table class="min-w-full">
              <tbody>
                <tr v-if="products.stockRotation.length === 0">
                  <td class="px-5 py-8 text-center text-[12.5px]" style="color: var(--text-tertiary)">{{ t('admin.pages.statistics.products.rotation.empty') }}</td>
                </tr>
                <tr v-for="row in products.stockRotation" :key="row.productId" class="table-row-hover">
                  <td class="px-5 py-3 text-[13px]" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ row.title }}</td>
                  <td class="px-5 py-3 text-end text-[12px] font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-tertiary)">{{ t('admin.pages.statistics.products.table.stock') }}: {{ row.stock }}</td>
                  <td class="px-5 py-3 text-end text-[13px] font-semibold font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ row.rotation === null ? '—' : row.rotation }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="rounded-2xl overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
          <div class="px-5 py-4" style="border-bottom: 1px solid var(--surface-border)">
            <h3 class="text-[13px] font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.statistics.products.criticalStock.title') }}</h3>
          </div>
          <div class="overflow-x-auto max-h-[360px]">
            <table class="min-w-full">
              <tbody>
                <tr v-if="products.criticalStock.length === 0">
                  <td class="px-5 py-8 text-center text-[12.5px]" style="color: var(--text-tertiary)">{{ t('admin.pages.statistics.products.criticalStock.empty') }}</td>
                </tr>
                <tr v-for="row in products.criticalStock" :key="row.productId" class="table-row-hover">
                  <td class="px-5 py-3 text-[13px]" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ row.title }}</td>
                  <td class="px-5 py-3 text-end text-[12px] font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-tertiary)">{{ t('admin.pages.statistics.products.table.threshold') }}: {{ row.lowStockThreshold }}</td>
                  <td class="px-5 py-3 text-end text-[13px] font-semibold font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ row.stock }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Customers tab -->
    <template v-if="activeTab === 'customers' && customersStats">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminDashboardStatCard
          :label="t('admin.pages.statistics.customers.kpis.newCustomers')"
          :value="customersStats.kpis.newCustomers.value"
          :change-pct="customersStats.kpis.newCustomers.changePct"
          :compare-label="t('admin.pages.statistics.compareLabel')"
          icon="lucide:user-plus" tone="brand" :loading="pending"
        />
        <AdminDashboardStatCard
          :label="t('admin.pages.statistics.customers.kpis.returningCustomers')"
          :value="customersStats.kpis.returningCustomers.value"
          :change-pct="customersStats.kpis.returningCustomers.changePct"
          :compare-label="t('admin.pages.statistics.compareLabel')"
          icon="lucide:repeat" tone="blue" :loading="pending"
        />
        <AdminDashboardStatCard :label="t('admin.pages.statistics.customers.kpis.repeatPurchaseRate')" :value="`${customersStats.kpis.repeatPurchaseRate}%`" icon="lucide:heart-handshake" tone="indigo" :loading="pending" />
        <AdminDashboardStatCard :label="t('admin.pages.statistics.customers.kpis.avgOrdersPerCustomer')" :value="customersStats.kpis.avgOrdersPerCustomer" icon="lucide:shopping-bag" tone="amber" :loading="pending" />
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatsTableCard :title="t('admin.pages.statistics.customers.top.title')" :empty="t('admin.pages.statistics.customers.top.empty')" :rows="customersStats.topCustomers">
          <template #row="{ row }">
            <td class="px-5 py-3" style="border-bottom: 1px solid var(--surface-border)">
              <p class="text-[13px] font-medium" style="color: var(--text-primary)">{{ row.name }}</p>
              <p class="text-[11px] mt-0.5" style="color: var(--text-tertiary)">{{ row.phone }}</p>
            </td>
            <td class="px-5 py-3 text-end text-[12px] font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-tertiary)">{{ row.ordersCount }}</td>
            <td class="px-5 py-3 text-end text-[13px] font-semibold font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ formatMoney(row.revenue) }}</td>
          </template>
        </StatsTableCard>

        <div class="rounded-2xl overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
          <div class="px-5 py-4" style="border-bottom: 1px solid var(--surface-border)">
            <h3 class="text-[13px] font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.statistics.customers.byWilaya.title') }}</h3>
          </div>
          <div class="overflow-x-auto max-h-[360px]">
            <table class="min-w-full">
              <tbody>
                <tr v-if="customersStats.byWilaya.length === 0">
                  <td class="px-5 py-8 text-center text-[12.5px]" style="color: var(--text-tertiary)">{{ t('admin.pages.statistics.customers.byWilaya.empty') }}</td>
                </tr>
                <tr v-for="row in customersStats.byWilaya" :key="row.wilayaCode" class="table-row-hover">
                  <td class="px-5 py-3 text-[13px]" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ wilayaName(row.wilayaCode) }}</td>
                  <td class="px-5 py-3 text-end text-[12px] font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-tertiary)">{{ row.customers }}</td>
                  <td class="px-5 py-3 text-end text-[13px] font-semibold font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ formatMoney(row.revenue) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Profitability tab -->
    <template v-if="activeTab === 'profitability' && profitability">
      <div
        v-if="profitability.kpis.costDataCoverage < 100"
        class="rounded-xl px-4 py-2.5 text-[12px] flex items-center gap-2"
        style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); color: #f59e0b"
      >
        <Icon name="lucide:info" class="h-3.5 w-3.5 shrink-0" />
        {{ t('admin.pages.statistics.noCostData', { pct: round1(100 - profitability.kpis.costDataCoverage) }) }}
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminDashboardStatCard :label="t('admin.pages.statistics.profitability.kpis.revenue')" :value="formatMoney(profitability.kpis.revenue)" icon="lucide:wallet" tone="brand" :loading="pending" />
        <AdminDashboardStatCard :label="t('admin.pages.statistics.profitability.kpis.cogs')" :value="formatMoney(profitability.kpis.cogs)" icon="lucide:package" tone="slate" :loading="pending" />
        <AdminDashboardStatCard
          :label="t('admin.pages.statistics.profitability.kpis.grossMargin')"
          :value="formatMoney(profitability.kpis.grossMargin)"
          :hint="profitability.kpis.grossMarginPct !== null ? `${profitability.kpis.grossMarginPct}%` : undefined"
          icon="lucide:trending-up" tone="blue" :loading="pending"
        />
        <AdminDashboardStatCard
          :label="t('admin.pages.statistics.profitability.kpis.netMargin')"
          :value="formatMoney(profitability.kpis.netMargin)"
          :hint="profitability.kpis.netMarginPct !== null ? `${profitability.kpis.netMarginPct}%` : undefined"
          icon="lucide:banknote" tone="indigo" :loading="pending"
        />
      </div>

      <div class="rounded-2xl overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <div class="px-5 py-4" style="border-bottom: 1px solid var(--surface-border)">
          <h3 class="text-[13px] font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.statistics.profitability.byProduct.title') }}</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr style="background: var(--surface-2)">
                <th class="px-5 py-2.5 text-start text-[9.5px] font-bold uppercase tracking-[0.08em]" style="color: var(--text-muted); border-bottom: 1px solid var(--surface-border)">{{ t('admin.pages.statistics.profitability.table.product') }}</th>
                <th class="px-5 py-2.5 text-end text-[9.5px] font-bold uppercase tracking-[0.08em]" style="color: var(--text-muted); border-bottom: 1px solid var(--surface-border)">{{ t('admin.pages.statistics.profitability.table.revenue') }}</th>
                <th class="px-5 py-2.5 text-end text-[9.5px] font-bold uppercase tracking-[0.08em]" style="color: var(--text-muted); border-bottom: 1px solid var(--surface-border)">{{ t('admin.pages.statistics.profitability.table.cogs') }}</th>
                <th class="px-5 py-2.5 text-end text-[9.5px] font-bold uppercase tracking-[0.08em]" style="color: var(--text-muted); border-bottom: 1px solid var(--surface-border)">{{ t('admin.pages.statistics.profitability.table.margin') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="profitability.byProduct.length === 0">
                <td colspan="4" class="px-5 py-8 text-center text-[12.5px]" style="color: var(--text-tertiary)">{{ t('admin.pages.statistics.profitability.byProduct.empty') }}</td>
              </tr>
              <tr v-for="row in profitability.byProduct" :key="row.productId" class="table-row-hover">
                <td class="px-5 py-3 text-[13px]" style="border-bottom: 1px solid var(--surface-border); color: var(--text-primary)">{{ row.title }}</td>
                <td class="px-5 py-3 text-end text-[12px] font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-tertiary)">{{ formatMoney(row.revenue) }}</td>
                <td class="px-5 py-3 text-end text-[12px] font-mono-nums" style="border-bottom: 1px solid var(--surface-border); color: var(--text-tertiary)">{{ formatMoney(row.cogs) }}</td>
                <td class="px-5 py-3 text-end text-[13px] font-semibold font-mono-nums" style="border-bottom: 1px solid var(--surface-border)" :style="{ color: row.margin >= 0 ? 'var(--text-primary)' : '#f87171' }">
                  {{ formatMoney(row.margin) }} <span v-if="row.marginPct !== null" class="opacity-60">({{ row.marginPct }}%)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.table-row-hover {
  transition: background 0.1s ease;
}
.table-row-hover:hover {
  background: rgba(255, 255, 255, 0.025);
}
</style>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { buildDashboardRangeQuery, defaultCustomDateRange, type DashboardRange } from '~/composables/admin/dashboardRange'
import DateFilter from '~/components/ui/DateFilter.vue'
import { DZ_WILAYAS } from '~/shared/geo/dz'
import StatsTableCard from '~/components/admin/StatsTableCard.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.statistics.title'
})

type Comparable = { value: number; previousValue: number; changePct: number | null }

type SalesStats = {
  period: { range: string; from: string; to: string; days: number }
  kpis: { revenue: Comparable; onlineRevenue: Comparable; posRevenue: Comparable; ordersCount: Comparable; avgBasket: Comparable }
  trends: Array<{ date: string; ordersCount: number; onlineRevenue: number; posRevenue: number; totalRevenue: number }>
  byCategory: Array<{ categoryId: string; title: string; revenue: number; quantity: number }>
}

type DeliveryStats = {
  period: { range: string; from: string; to: string; days: number }
  kpis: { totalShipments: number; deliveredRate: number; returnedRate: number; cancelledRate: number; avgDeliveryDays: number | null }
  byProvider: Array<{ provider: string; total: number; delivered: number; returned: number; cancelled: number; inTransit: number; deliveredRate: number }>
  byWilaya: Array<{ wilayaCode: string; total: number; delivered: number; returned: number; deliveredRate: number }>
  byStatus: Record<string, number>
}

type ProductsStats = {
  period: { range: string; from: string; to: string; days: number }
  kpis: { activeProducts: number; lowStockProducts: number; outOfStockProducts: number; neverSoldProducts: number; clearanceDiscountTotal: number }
  topProducts: Array<{ productId: string; title: string; quantity: number; revenue: number }>
  flopProducts: Array<{ productId: string; title: string; quantity: number; revenue: number }>
  stockRotation: Array<{ productId: string; title: string; stock: number; soldQuantity: number; rotation: number | null }>
  criticalStock: Array<{ productId: string; title: string; stock: number; lowStockThreshold: number }>
}

type CustomersStats = {
  period: { range: string; from: string; to: string; days: number }
  kpis: { newCustomers: Comparable; returningCustomers: Comparable; repeatPurchaseRate: number; avgOrdersPerCustomer: number }
  topCustomers: Array<{ customerId: string | null; name: string; phone: string; ordersCount: number; revenue: number }>
  byWilaya: Array<{ wilayaCode: string; customers: number; revenue: number }>
}

type ProfitabilityStats = {
  period: { range: string; from: string; to: string; days: number }
  kpis: {
    revenue: number; cogs: number; grossMargin: number; grossMarginPct: number | null
    shippingCost: number; netMargin: number; netMarginPct: number | null; costDataCoverage: number
  }
  byProduct: Array<{ productId: string; title: string; revenue: number; cogs: number; margin: number; marginPct: number | null; quantity: number }>
}

type Tab = 'sales' | 'delivery' | 'products' | 'customers' | 'profitability'

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })
const { format: formatMoney } = useCurrency()
const route = useRoute()
const router = useRouter()

const validTabs: Tab[] = ['sales', 'delivery', 'products', 'customers', 'profitability']
const activeTab = ref<Tab>(validTabs.includes(route.query.tab as Tab) ? (route.query.tab as Tab) : 'sales')
const tabDefs = computed(() => [
  { key: 'sales', label: t('admin.pages.statistics.tabs.sales') },
  { key: 'delivery', label: t('admin.pages.statistics.tabs.delivery') },
  { key: 'products', label: t('admin.pages.statistics.tabs.products') },
  { key: 'customers', label: t('admin.pages.statistics.tabs.customers') },
  { key: 'profitability', label: t('admin.pages.statistics.tabs.profitability') }
])

const validRanges: DashboardRange[] = ['today', '7d', '30d', '90d', 'custom']
const defaultCustomRange = defaultCustomDateRange()
const selectedRange = ref<DashboardRange>(validRanges.includes(route.query.range as DashboardRange) ? (route.query.range as DashboardRange) : '7d')
const customFrom = ref(typeof route.query.customFrom === 'string' ? route.query.customFrom : defaultCustomRange.from)
const customTo = ref(typeof route.query.customTo === 'string' ? route.query.customTo : defaultCustomRange.to)
const channel = ref<'all' | 'online' | 'pos'>(route.query.channel === 'online' || route.query.channel === 'pos' ? route.query.channel : 'all')
const categoryId = ref(typeof route.query.categoryId === 'string' ? route.query.categoryId : '')
const wilayaCode = ref(typeof route.query.wilayaCode === 'string' ? route.query.wilayaCode : '')
const provider = ref(typeof route.query.provider === 'string' ? route.query.provider : '')
const selectedTrendDate = ref<string | null>(null)

watch(selectedRange, (value) => {
  if (value === 'custom' && (!customFrom.value || !customTo.value)) {
    const defaults = defaultCustomDateRange()
    customFrom.value = defaults.from
    customTo.value = defaults.to
  }
})

watch(activeTab, () => {
  selectedTrendDate.value = null
})

const providerOptions = ['MAYSTRO', 'YALIDINE', 'ECOTRACK', 'ZR_EXPRESS', 'SELF']
function providerLabel(p: string) {
  if (p === 'SELF') return t('admin.pages.statistics.delivery.selfProvider')
  const labels: Record<string, string> = { MAYSTRO: 'Maystro', YALIDINE: 'Yalidine', ECOTRACK: 'Ecotrack', ZR_EXPRESS: 'ZR Express' }
  return labels[p] || p
}

const wilayaNameByCode = new Map(DZ_WILAYAS.map((w) => [w.code, w.name]))
function wilayaName(code: string) {
  return wilayaNameByCode.get(code) || code
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

const categories = ref<Array<{ id: string; title: string }>>([])
onMounted(async () => {
  const token = authStore.token
  if (!token) return
  try {
    const data = await $fetch<Array<{ id: string; title: string }>>('/api/admin/categories', {
      headers: { Authorization: `Bearer ${token}` }
    })
    categories.value = (data || []).map((c: any) => ({ id: c.id, title: c.title }))
  } catch {
    categories.value = []
  }
})

function buildQuery(): Record<string, string> {
  let query: Record<string, string>
  try {
    query = buildDashboardRangeQuery(selectedRange.value, customFrom.value, customTo.value)
  } catch {
    query = { range: '7d' }
  }
  if (channel.value !== 'all') query.channel = channel.value
  if (categoryId.value) query.categoryId = categoryId.value
  if (wilayaCode.value) query.wilayaCode = wilayaCode.value
  if (provider.value) query.provider = provider.value
  return query
}

const endpointByTab: Record<Tab, string> = {
  sales: '/api/admin/statistics/sales',
  delivery: '/api/admin/statistics/delivery',
  products: '/api/admin/statistics/products',
  customers: '/api/admin/statistics/customers',
  profitability: '/api/admin/statistics/profitability'
}

const sales = ref<SalesStats | null>(null)
const delivery = ref<DeliveryStats | null>(null)
const products = ref<ProductsStats | null>(null)
const customersStats = ref<CustomersStats | null>(null)
const profitability = ref<ProfitabilityStats | null>(null)

const pending = ref(false)
const error = ref(false)

async function fetchActiveTab() {
  const token = authStore.token
  if (!token) return
  pending.value = true
  error.value = false
  try {
    const query = buildQuery()
    const endpoint = endpointByTab[activeTab.value]
    const data = await $fetch<any>(endpoint, { headers: { Authorization: `Bearer ${token}` }, query })
    if (activeTab.value === 'sales') sales.value = data
    else if (activeTab.value === 'delivery') delivery.value = data
    else if (activeTab.value === 'products') products.value = data
    else if (activeTab.value === 'customers') customersStats.value = data
    else if (activeTab.value === 'profitability') profitability.value = data
  } catch {
    error.value = true
  } finally {
    pending.value = false
  }
}

function refresh() {
  return fetchActiveTab()
}

function syncToUrl() {
  router.replace({
    query: {
      ...route.query,
      tab: activeTab.value === 'sales' ? undefined : activeTab.value,
      range: selectedRange.value === '7d' ? undefined : selectedRange.value,
      customFrom: selectedRange.value === 'custom' ? customFrom.value : undefined,
      customTo: selectedRange.value === 'custom' ? customTo.value : undefined,
      channel: channel.value === 'all' ? undefined : channel.value,
      categoryId: categoryId.value || undefined,
      wilayaCode: wilayaCode.value || undefined,
      provider: provider.value || undefined
    }
  })
}

watch(
  [activeTab, selectedRange, customFrom, customTo, channel, categoryId, wilayaCode, provider, () => authStore.token],
  () => {
    syncToUrl()
    fetchActiveTab()
  },
  { immediate: true }
)

const salesTrendPoints = computed(() => (sales.value?.trends || []).map((t) => ({ date: t.date, value: t.totalRevenue })))

const exporting = ref(false)
async function exportCsv() {
  const token = authStore.token
  if (!token) return
  exporting.value = true
  try {
    const query = new URLSearchParams(buildQuery())
    const response = await fetch(`/api/admin/statistics/export/${activeTab.value}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statistics-${activeTab.value}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}
</script>
