<script setup lang="ts">
const props = defineProps<{
  currentPage: number
  totalPages: number
  pageNumbers?: number[]
  canGoPrev: boolean
  canGoNext: boolean
}>()

const emit = defineEmits<{
  (e: 'go-to-page', page: number): void
  (e: 'go-prev'): void
  (e: 'go-next'): void
}>()

const visiblePages = computed<(number | 'ellipsis')[]>(() => {
  const total = props.totalPages
  const current = props.currentPage

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  let start = Math.max(2, current - 1)
  let end = Math.min(total - 1, current + 1)

  if (current <= 4) {
    start = 2
    end = 4
  }

  if (current >= total - 3) {
    start = total - 3
    end = total - 1
  }

  if (start > 2) {
    pages.push('ellipsis')
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (end < total - 1) {
    pages.push('ellipsis')
  }

  pages.push(total)
  return pages
})
</script>

<template>
  <nav
    v-if="totalPages > 1"
    class="col-span-full mt-8 w-full"
    aria-label="Products pagination"
  >
    <div class="flex justify-center overflow-x-auto overflow-y-hidden px-1 py-1">
      <div class="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm">
        <button
          type="button"
          class="h-9 min-w-9 rounded-full px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!canGoPrev"
          aria-label="Previous page"
          @click="emit('go-prev')"
        >
          Prev
        </button>

        <template
          v-for="(item, index) in visiblePages"
          :key="`${item}-${index}`"
        >
          <span
            v-if="item === 'ellipsis'"
            class="px-1 text-sm font-semibold text-slate-400"
            aria-hidden="true"
          >
            ...
          </span>
          <button
            v-else
            type="button"
            class="h-9 min-w-9 rounded-full px-3 text-sm font-semibold transition"
            :class="item === currentPage ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
            :aria-current="item === currentPage ? 'page' : undefined"
            @click="emit('go-to-page', item)"
          >
            {{ item }}
          </button>
        </template>

        <button
          type="button"
          class="h-9 min-w-9 rounded-full px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!canGoNext"
          aria-label="Next page"
          @click="emit('go-next')"
        >
          Next
        </button>
      </div>
    </div>
  </nav>
</template>
