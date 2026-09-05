<script setup lang="ts">
import type { PublicLoyaltyPreview } from '~/composables/useActiveProductLoyaltyPreview'

defineProps<{
  preview?: PublicLoyaltyPreview
}>()
</script>

<template>
  <div
    v-if="preview?.enabled"
    class="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm"
  >
    <div class="font-semibold">
      {{ preview.displayText }}
    </div>
    <div class="mt-2 grid gap-2 text-xs text-amber-900/90 sm:grid-cols-3">
      <div class="rounded-xl bg-white/70 px-3 py-2">
        <div class="text-[11px] uppercase tracking-[0.16em] text-amber-700/80">
          Base points
        </div>
        <div class="mt-1 text-sm font-semibold">
          {{ preview.basePoints }}
        </div>
      </div>
      <div class="rounded-xl bg-white/70 px-3 py-2">
        <div class="text-[11px] uppercase tracking-[0.16em] text-amber-700/80">
          Product points
        </div>
        <div class="mt-1 text-sm font-semibold">
          {{ preview.productPoints }}
        </div>
      </div>
      <div class="rounded-xl bg-white/70 px-3 py-2">
        <div class="text-[11px] uppercase tracking-[0.16em] text-amber-700/80">
          Total
        </div>
        <div class="mt-1 text-sm font-semibold">
          {{ preview.basePoints }} + {{ preview.productPoints }} = {{ preview.totalPoints }}
        </div>
      </div>
    </div>
  </div>
</template>
