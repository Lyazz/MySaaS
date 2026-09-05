<template>
  <UiCard :padded="false">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-primary">
          {{ t('admin.pages.aiImport.table.title', { count: lines.length }) }}
        </h3>
        <p class="text-mini text-tertiary font-mono-nums">
          {{ t('admin.pages.aiImport.table.total', { total: formatMoney(totalCost) }) }}
        </p>
      </div>
    </template>

    <div class="overflow-x-auto">
      <table class="ui-table">
        <thead class="ui-thead">
          <tr>
            <th class="ui-th">
              {{ t('admin.pages.aiImport.table.label') }}
            </th>
            <th class="ui-th">
              {{ t('admin.pages.aiImport.table.product') }}
            </th>
            <th class="ui-th text-end">
              {{ t('admin.pages.aiImport.table.quantity') }}
            </th>
            <th class="ui-th text-end">
              {{ t('admin.pages.aiImport.table.unitCost') }}
            </th>
            <th class="ui-th text-end">
              {{ t('admin.pages.aiImport.table.salePrice') }}
            </th>
            <th class="ui-th text-end">
              {{ t('admin.pages.aiImport.table.margin') }}
            </th>
            <th class="ui-th">
              <span class="sr-only">{{ t('admin.pages.aiImport.table.actions') }}</span>
            </th>
          </tr>
        </thead>

        <tbody class="ui-tbody">
          <tr
            v-for="line in lines"
            :key="line.index"
            class="ui-tr"
            :class="line.action === 'skip' ? 'opacity-50' : ''"
          >
            <td class="ui-td min-w-[14rem]">
              <UiInput
                :model-value="line.label"
                :class="cellClass(line, 'label')"
                @update:model-value="update(line, { label: $event })"
                @focus="review(line, 'label')"
              />
              <p
                v-if="line.sku || line.barcode"
                class="mt-1 text-micro uppercase text-tertiary"
              >
                {{ [line.sku, line.barcode].filter(Boolean).join(' · ') }}
              </p>
            </td>

            <td class="ui-td min-w-[16rem]">
              <AdminAiImportLineMatcher
                :line="line"
                :variants="variants"
                @update="update(line, $event)"
              />
            </td>

            <td class="ui-td text-end">
              <UiInput
                :model-value="String(line.quantity)"
                type="number"
                min="0"
                step="1"
                class="w-24"
                :class="cellClass(line, 'quantity')"
                @update:model-value="update(line, { quantity: toInt($event) })"
                @focus="review(line, 'quantity')"
              />
            </td>

            <td class="ui-td text-end">
              <UiInput
                :model-value="String(line.unitCost)"
                type="number"
                min="0"
                step="1"
                class="w-28"
                :class="cellClass(line, 'unitCost')"
                @update:model-value="update(line, { unitCost: toNumber($event) })"
                @focus="review(line, 'unitCost')"
              />
            </td>

            <td class="ui-td text-end">
              <UiInput
                :model-value="line.salePrice === null ? '' : String(line.salePrice)"
                type="number"
                min="0"
                step="1"
                class="w-28"
                @update:model-value="update(line, { salePrice: toNumber($event), salePricePinned: true })"
              />
              <button
                v-if="line.salePricePinned"
                type="button"
                class="mt-1 text-micro uppercase text-brand"
                @click="update(line, { salePricePinned: false })"
              >
                {{ t('admin.pages.aiImport.table.unpin') }}
              </button>
            </td>

            <td class="ui-td text-end">
              <span
                class="text-mini font-mono-nums"
                :class="marginTone(line)"
              >
                {{ marginLabel(line) }}
              </span>
            </td>

            <td class="ui-td">
              <button
                type="button"
                class="ui-table-action"
                :aria-label="
                  line.action === 'skip'
                    ? t('admin.pages.aiImport.table.include')
                    : t('admin.pages.aiImport.table.skip')
                "
                @click="toggleSkip(line)"
              >
                <Icon
                  :name="line.action === 'skip' ? 'lucide:undo-2' : 'lucide:x'"
                  class="h-4 w-4"
                />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UiEmptyState
      v-if="!lines.length"
      icon="lucide:file-search"
      :title="t('admin.pages.aiImport.table.emptyTitle')"
      :description="t('admin.pages.aiImport.table.emptyHint')"
    />
  </UiCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DraftLine } from '~/composables/useAiImportJob'

const props = defineProps<{
  lines: DraftLine[]
  variants: Record<string, { sku: string; title: string; cost: string; price: string }>
  pendingReview: Set<string>
}>()

const emit = defineEmits<{
  (e: 'update', line: DraftLine, patch: Partial<DraftLine>): void
  (e: 'review', line: DraftLine, field: string): void
}>()

const { t } = useI18n({ useScope: 'global' })
const { format: formatMoney } = useCurrency()

const totalCost = computed(() =>
  props.lines.filter((l) => l.action !== 'skip').reduce((s, l) => s + l.quantity * l.unitCost, 0)
)

const toInt = (value: string) => {
  const n = Math.trunc(Number(value))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const toNumber = (value: string) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const update = (line: DraftLine, patch: Partial<DraftLine>) => emit('update', line, patch)
const review = (line: DraftLine, field: string) => emit('review', line, field)

/**
 * Amber ring on anything the model read but was unsure about. Focusing the cell
 * counts as reviewing it, which is what unblocks the confirm button.
 */
const cellClass = (line: DraftLine, field: string) =>
  props.pendingReview.has(`${line.index}:${field}`) ? 'ui-input--flagged' : ''

const marginPercent = (line: DraftLine): number | null => {
  if (!line.unitCost || line.salePrice === null) return null
  return ((line.salePrice - line.unitCost) / line.unitCost) * 100
}

const marginLabel = (line: DraftLine) => {
  const margin = marginPercent(line)
  return margin === null ? '—' : `${margin.toFixed(0)}%`
}

const marginTone = (line: DraftLine) => {
  const margin = marginPercent(line)
  if (margin === null) return 'text-tertiary'
  return margin < 0 ? 'text-danger' : margin < 5 ? 'text-warning' : 'text-secondary'
}

const toggleSkip = (line: DraftLine) =>
  update(line, {
    action: line.action === 'skip' ? (line.variantId ? 'match' : 'create') : 'skip'
  })
</script>
