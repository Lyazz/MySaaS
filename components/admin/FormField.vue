<template>
  <div class="mb-4">
    <label
      v-if="label"
      :for="inputId"
      class="ui-label"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-400 ms-0.5"
      >*</span>
    </label>
    <slot :input-id="inputId" />
    <p
      v-if="error"
      class="mt-1 text-xs text-red-400"
    >
      {{ error }}
    </p>
    <p
      v-if="hint && !error"
      class="mt-1 text-xs" style="color: var(--text-tertiary)"
    >
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

defineProps<Props>()

const inputId = `field-${Math.random().toString(36).substr(2, 9)}`
</script>
