<template>
  <section class="ui-card" :class="{ 'overflow-hidden': flush }">
    <header v-if="hasHeader" class="ui-card-header flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <slot name="header">
          <h3 v-if="title" class="truncate text-sm font-semibold text-primary">{{ title }}</h3>
          <p v-if="subtitle" class="mt-0.5 text-mini text-tertiary">{{ subtitle }}</p>
        </slot>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </header>

    <div :class="padded ? 'ui-card-body' : ''">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="ui-card-header border-b-0 border-t">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
/**
 * A surface. `padded` off is for cards whose body is a table or a list that
 * needs to run edge to edge; `flush` clips children to the card radius.
 */
import { computed, useSlots } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  subtitle?: string
  padded?: boolean
  flush?: boolean
}>(), { padded: true })

const slots = useSlots()
const hasHeader = computed(() => Boolean(props.title || props.subtitle || slots.header || slots.actions))
</script>
