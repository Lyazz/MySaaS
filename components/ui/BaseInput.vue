<template>
  <div>
    <label v-if="label" class="ui-label">
      {{ label }}
      <span v-if="required" class="text-red-400">*</span>
    </label>
    <div class="relative">
      <input
        :value="modelValue"
        class="ui-input"
        :class="[
          error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : '',
          $attrs.class
        ]"
        v-bind="{ ...$attrs, class: undefined }"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <slot name="suffix" />
    </div>
    <p v-if="error" class="mt-1 text-xs text-red-400">{{ error }}</p>
    <p v-if="hint && !error" class="mt-1 text-xs" style="color: var(--text-tertiary)">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

defineProps<{
  modelValue?: string | number
  label?: string
  error?: string
  hint?: string
  required?: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>
