<script setup lang="ts">
defineProps<{
  currentPage: number
  totalPages: number
  pageNumbers: number[]
  canGoPrev: boolean
  canGoNext: boolean
}>()

const emit = defineEmits<{
  (e: 'go-to-page', page: number): void
  (e: 'go-prev'): void
  (e: 'go-next'): void
}>()
</script>

<template>
  <nav
    v-if="totalPages > 1"
    class="col-span-full mt-8 flex justify-center"
    aria-label="Products pagination"
  >
    <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm">
      <button
        type="button"
        class="h-9 min-w-9 rounded-full px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!canGoPrev"
        aria-label="Previous page"
        @click="emit('go-prev')"
      >
        Prev
      </button>

      <button
        v-for="page in pageNumbers"
        :key="page"
        type="button"
        class="h-9 min-w-9 rounded-full px-3 text-sm font-semibold transition"
        :class="page === currentPage ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
        :aria-current="page === currentPage ? 'page' : undefined"
        @click="emit('go-to-page', page)"
      >
        {{ page }}
      </button>

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
  </nav>
</template>
