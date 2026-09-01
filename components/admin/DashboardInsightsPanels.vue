<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div class="rounded-2xl p-5 surface-1 border border-line shadow-card">
      <h3 class="text-sm font-semibold text-primary">
        {{ t('admin.pages.dashboard.insights.topProducts.title') }}
      </h3>
      <p class="mt-0.5 text-xs text-tertiary">
        {{ t('admin.pages.dashboard.insights.topProducts.hint') }}
      </p>

      <div v-if="loading" class="mt-4 space-y-2.5">
        <div v-for="i in 4" :key="`prod-sk-${i}`" class="h-8 rounded-lg animate-pulse ui-skeleton" />
      </div>
      <div v-else-if="topProducts.length === 0" data-testid="top-products-empty" class="mt-4 text-xs text-tertiary">
        {{ t('admin.pages.dashboard.insights.topProducts.empty') }}
      </div>
      <div v-else data-testid="top-products-populated" class="mt-4 space-y-2">
        <div
 v-for="product in topProducts"
 :key="product.productId"
 class="rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 surface-2 border border-line"
 
>
          <p class="text-xs font-medium truncate text-primary">
            {{ product.title }}
          </p>
          <div class="text-end shrink-0">
            <p class="text-mini font-semibold font-mono-nums text-primary">
              {{ formatMoney(product.revenue) }}
            </p>
            <p class="text-micro font-mono-nums text-tertiary">
              {{ t('admin.pages.dashboard.insights.units', { count: product.quantity }) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-2xl p-5 surface-1 border border-line shadow-card">
      <h3 class="text-sm font-semibold text-primary">
        {{ t('admin.pages.dashboard.insights.topCategories.title') }}
      </h3>
      <p class="mt-0.5 text-xs text-tertiary">
        {{ t('admin.pages.dashboard.insights.topCategories.hint') }}
      </p>

      <div v-if="loading" class="mt-4 space-y-2.5">
        <div v-for="i in 4" :key="`cat-sk-${i}`" class="h-8 rounded-lg animate-pulse ui-skeleton" />
      </div>
      <div v-else-if="topCategories.length === 0" data-testid="top-categories-empty" class="mt-4 text-xs text-tertiary">
        {{ t('admin.pages.dashboard.insights.topCategories.empty') }}
      </div>
      <div v-else data-testid="top-categories-populated" class="mt-4 space-y-2">
        <div
 v-for="category in topCategories"
 :key="category.categoryId"
 class="rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 surface-2 border border-line"
 
>
          <p class="text-xs font-medium truncate text-primary">
            {{ category.title }}
          </p>
          <div class="text-end shrink-0">
            <p class="text-mini font-semibold font-mono-nums text-primary">
              {{ formatMoney(category.revenue) }}
            </p>
            <p class="text-micro font-mono-nums text-tertiary">
              {{ t('admin.pages.dashboard.insights.units', { count: category.quantity }) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-2xl p-5 surface-1 border border-line shadow-card">
      <h3 class="text-sm font-semibold text-primary">
        {{ t('admin.pages.dashboard.insights.criticalStock.title') }}
      </h3>
      <p class="mt-0.5 text-xs text-tertiary">
        {{ t('admin.pages.dashboard.insights.criticalStock.hint') }}
      </p>

      <div v-if="loading" class="mt-4 space-y-2.5">
        <div v-for="i in 4" :key="`stock-sk-${i}`" class="h-8 rounded-lg animate-pulse ui-skeleton" />
      </div>
      <div v-else-if="criticalStock.length === 0" data-testid="critical-stock-empty" class="mt-4 text-xs text-tertiary">
        {{ t('admin.pages.dashboard.insights.criticalStock.empty') }}
      </div>
      <div v-else data-testid="critical-stock-populated" class="mt-4 space-y-2">
        <div
 v-for="product in criticalStock"
 :key="product.productId"
 class="rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 surface-2 border border-line"
 
>
          <p class="text-xs font-medium truncate text-primary">
            {{ product.title }}
          </p>
          <div class="text-end shrink-0">
            <p class="text-mini font-semibold font-mono-nums text-brand">
              {{ product.stock }}
            </p>
            <p class="text-micro font-mono-nums text-tertiary">
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
