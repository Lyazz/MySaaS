<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div class="rounded-2xl p-5" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
      <h3 class="text-[13.5px] font-semibold" style="color: var(--text-primary)">
        {{ t('admin.pages.dashboard.insights.topProducts.title') }}
      </h3>
      <p class="mt-0.5 text-[12px]" style="color: var(--text-tertiary)">
        {{ t('admin.pages.dashboard.insights.topProducts.hint') }}
      </p>

      <div v-if="loading" class="mt-4 space-y-2.5">
        <div v-for="i in 4" :key="`prod-sk-${i}`" class="h-8 rounded-lg animate-pulse" style="background: rgba(255,255,255,0.05)" />
      </div>
      <div v-else-if="topProducts.length === 0" data-testid="top-products-empty" class="mt-4 text-[12px]" style="color: var(--text-tertiary)">
        {{ t('admin.pages.dashboard.insights.topProducts.empty') }}
      </div>
      <div v-else data-testid="top-products-populated" class="mt-4 space-y-2">
        <div
          v-for="product in topProducts"
          :key="product.productId"
          class="rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
          style="background: var(--surface-2); border: 1px solid var(--surface-border)"
        >
          <p class="text-[12px] font-medium truncate" style="color: var(--text-primary)">
            {{ product.title }}
          </p>
          <div class="text-right shrink-0">
            <p class="text-[11px] font-semibold font-mono-nums" style="color: var(--text-primary)">
              {{ formatMoney(product.revenue) }}
            </p>
            <p class="text-[10px] font-mono-nums" style="color: var(--text-tertiary)">
              {{ t('admin.pages.dashboard.insights.units', { count: product.quantity }) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-2xl p-5" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
      <h3 class="text-[13.5px] font-semibold" style="color: var(--text-primary)">
        {{ t('admin.pages.dashboard.insights.topCategories.title') }}
      </h3>
      <p class="mt-0.5 text-[12px]" style="color: var(--text-tertiary)">
        {{ t('admin.pages.dashboard.insights.topCategories.hint') }}
      </p>

      <div v-if="loading" class="mt-4 space-y-2.5">
        <div v-for="i in 4" :key="`cat-sk-${i}`" class="h-8 rounded-lg animate-pulse" style="background: rgba(255,255,255,0.05)" />
      </div>
      <div v-else-if="topCategories.length === 0" data-testid="top-categories-empty" class="mt-4 text-[12px]" style="color: var(--text-tertiary)">
        {{ t('admin.pages.dashboard.insights.topCategories.empty') }}
      </div>
      <div v-else data-testid="top-categories-populated" class="mt-4 space-y-2">
        <div
          v-for="category in topCategories"
          :key="category.categoryId"
          class="rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
          style="background: var(--surface-2); border: 1px solid var(--surface-border)"
        >
          <p class="text-[12px] font-medium truncate" style="color: var(--text-primary)">
            {{ category.title }}
          </p>
          <div class="text-right shrink-0">
            <p class="text-[11px] font-semibold font-mono-nums" style="color: var(--text-primary)">
              {{ formatMoney(category.revenue) }}
            </p>
            <p class="text-[10px] font-mono-nums" style="color: var(--text-tertiary)">
              {{ t('admin.pages.dashboard.insights.units', { count: category.quantity }) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-2xl p-5" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
      <h3 class="text-[13.5px] font-semibold" style="color: var(--text-primary)">
        {{ t('admin.pages.dashboard.insights.criticalStock.title') }}
      </h3>
      <p class="mt-0.5 text-[12px]" style="color: var(--text-tertiary)">
        {{ t('admin.pages.dashboard.insights.criticalStock.hint') }}
      </p>

      <div v-if="loading" class="mt-4 space-y-2.5">
        <div v-for="i in 4" :key="`stock-sk-${i}`" class="h-8 rounded-lg animate-pulse" style="background: rgba(255,255,255,0.05)" />
      </div>
      <div v-else-if="criticalStock.length === 0" data-testid="critical-stock-empty" class="mt-4 text-[12px]" style="color: var(--text-tertiary)">
        {{ t('admin.pages.dashboard.insights.criticalStock.empty') }}
      </div>
      <div v-else data-testid="critical-stock-populated" class="mt-4 space-y-2">
        <div
          v-for="product in criticalStock"
          :key="product.productId"
          class="rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
          style="background: var(--surface-2); border: 1px solid var(--surface-border)"
        >
          <p class="text-[12px] font-medium truncate" style="color: var(--text-primary)">
            {{ product.title }}
          </p>
          <div class="text-right shrink-0">
            <p class="text-[11px] font-semibold font-mono-nums" style="color: #f59e0b">
              {{ product.stock }}
            </p>
            <p class="text-[10px] font-mono-nums" style="color: var(--text-tertiary)">
              {{ t('admin.pages.dashboard.insights.criticalStock.threshold', { count: product.lowStockThreshold }) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

withDefaults(defineProps<{
  topProducts: Array<{ productId: string; title: string; quantity: number; revenue: number }>
  topCategories: Array<{ categoryId: string; title: string; quantity: number; revenue: number }>
  criticalStock: Array<{ productId: string; title: string; stock: number; lowStockThreshold: number }>
  loading?: boolean
  formatMoney: (value: number) => string
}>(), {
  loading: false
})
</script>
