<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <input
        :value="modelValue"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        :class="[
          error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500',
          $attrs.class
        ]"
        v-bind="{ ...$attrs, class: undefined }"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <slot name="suffix" />
    </div>
    <p v-if="error" class="mt-1 text-sm text-red-600">
      {{ error }}
    </p>
    <p v-if="hint && !error" class="mt-1 text-sm text-gray-500">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})

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
