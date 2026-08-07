<template>
  <div class="rounded-2xl overflow-hidden" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
    <div class="px-5 py-4" style="border-bottom: 1px solid var(--surface-border)">
      <h3 class="text-[13px] font-semibold" style="color: var(--text-primary)">{{ title }}</h3>
    </div>
    <div class="overflow-x-auto max-h-[420px]">
      <table class="min-w-full">
        <tbody>
          <tr v-if="rows.length === 0">
            <td class="px-5 py-8 text-center text-[12.5px]" style="color: var(--text-tertiary)">{{ empty }}</td>
          </tr>
          <tr v-for="(row, index) in rows" :key="rowKey(row, index)" class="table-row-hover">
            <slot name="row" :row="row" :index="index" />
          </tr>
        </tbody>
      </table>
    </div>
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
const props = defineProps<{
  title: string
  empty: string
  rows: Array<Record<string, any>>
}>()

function rowKey(row: Record<string, any>, index: number) {
  return row.productId || row.customerId || row.wilayaCode || row.provider || index
}
</script>
