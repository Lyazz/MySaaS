<template>
  <div class="min-w-0">
    <label v-if="label" :for="fieldId" class="ui-label">
      {{ label }}
      <span v-if="required" class="ms-0.5" :style="{ color: 'var(--status-cancelled-text)' }">*</span>
    </label>

    <slot :field-id="fieldId" :described-by="describedBy" :invalid="Boolean(error)" />

    <p v-if="error" :id="`${fieldId}-error`" class="ui-error">{{ error }}</p>
    <p v-else-if="hint" :id="`${fieldId}-hint`" class="ui-hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
/**
 * Label + control + hint/error, with the `for`/`id`/`aria-describedby` wiring
 * done once. Replaces the copies that used to live inside `FormField.vue`,
 * `BaseInput.vue` and `BaseSelect.vue`.
 */
import { computed, useId } from 'vue'

const props = defineProps<{
  label?: string
  hint?: string
  error?: string
  required?: boolean
  /** Pass an id when the control is rendered outside this component. */
  for?: string
}>()

const generatedId = useId()
const fieldId = computed(() => props.for || `field-${generatedId}`)

const describedBy = computed(() => {
  if (props.error) return `${fieldId.value}-error`
  if (props.hint) return `${fieldId.value}-hint`
  return undefined
})
</script>
