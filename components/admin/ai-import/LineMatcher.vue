<template>
  <div class="space-y-1.5">
    <UiSelect
      :model-value="selection"
      :options="options"
      @update:model-value="onSelect"
    />

    <div class="flex flex-wrap items-center gap-1.5">
      <UiBadge
        :tone="sourceTone"
        class="text-micro"
      >
        {{ sourceLabel }}
      </UiBadge>
      <span
        v-if="line.action === 'match' && line.matchScore < 1"
        class="text-micro text-tertiary font-mono-nums"
      >
        {{ Math.round(line.matchScore * 100) }}%
      </span>
      <span
        v-if="line.action === 'create'"
        class="text-micro text-tertiary"
      >
        {{ t('admin.pages.aiImport.match.willCreate') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DraftLine } from '~/composables/useAiImportJob'

const props = defineProps<{
  line: DraftLine
  variants: Record<string, { sku: string; title: string; cost: string; price: string }>
}>()
const emit = defineEmits<{ (e: 'update', patch: Partial<DraftLine>): void }>()

const { t } = useI18n({ useScope: 'global' })

const CREATE = '__create__'

const selection = computed(() =>
  props.line.action === 'match' && props.line.variantId ? props.line.variantId : CREATE
)

/**
 * Only the candidates this line actually scored against, plus "create new".
 * A full product picker for a 2000-product catalogue belongs behind a search,
 * not in a table cell; a merchant who needs one edits the line's label so the
 * next match runs against something better, or fixes it on the purchase order.
 */
const options = computed(() => {
  const seen = new Set<string>()
  const entries: { value: string; label: string }[] = []

  const push = (variantId: string, score?: number) => {
    if (seen.has(variantId)) return
    const variant = props.variants[variantId]
    if (!variant) return
    seen.add(variantId)
    entries.push({
      value: variantId,
      label: score !== undefined && score < 1
        ? `${variant.title} (${variant.sku}) · ${Math.round(score * 100)}%`
        : `${variant.title} (${variant.sku})`
    })
  }

  if (props.line.variantId) push(props.line.variantId, props.line.matchScore)
  for (const candidate of props.line.candidates) push(candidate.variantId, candidate.score)

  return [
    ...entries,
    { value: CREATE, label: t('admin.pages.aiImport.match.createNew') }
  ]
})

const sourceLabel = computed(() => t(`admin.pages.aiImport.match.source.${props.line.matchSource}`))

const sourceTone = computed(() => {
  switch (props.line.matchSource) {
    case 'barcode':
    case 'sku':
      return 'emerald'
    case 'alias':
      return 'indigo'
    case 'fuzzy':
      return 'amber'
    default:
      return 'slate'
  }
})

const onSelect = (value: string) => {
  if (value === CREATE) return emit('update', { action: 'create', variantId: null })
  emit('update', { action: 'match', variantId: value })
}
</script>
