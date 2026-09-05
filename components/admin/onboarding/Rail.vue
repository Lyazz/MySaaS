<template>
  <nav class="flex flex-col gap-1" :aria-label="t('admin.pages.onboarding.title')">
    <button
      v-for="(item, index) in steps"
      :key="item.key"
      type="button"
      class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors disabled:cursor-not-allowed"
      :class="index === current ? 'surface-2' : 'hover:bg-hover'"
      :disabled="index > furthest"
      :aria-current="index === current ? 'step' : undefined"
      @click="emit('go', index)"
    >
      <span
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-micro font-bold"
        :class="index <= current ? 'text-brand-contrast' : 'surface-3 text-muted'"
        :style="index <= current ? { background: 'var(--brand)' } : undefined"
      >
        <Icon v-if="index < current" name="lucide:check" class="h-3 w-3" />
        <template v-else>{{ index + 1 }}</template>
      </span>

      <span
        class="min-w-0 flex-1 truncate text-sm font-medium"
        :class="index === current ? 'text-primary' : index <= furthest ? 'text-secondary' : 'text-muted'"
      >{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
interface RailStep { key: string; label: string }

defineProps<{
  steps: RailStep[]
  current: number
  /** Highest step reached, so a merchant can jump back but not skip ahead. */
  furthest: number
}>()

const emit = defineEmits<{ go: [index: number] }>()
const { t } = useI18n({ useScope: 'global' })
</script>
