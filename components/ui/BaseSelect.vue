<template>
  <div class="relative">
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <div v-if="$slots.prefix" class="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2">
        <slot name="prefix" />
      </div>
      <select
        :value="modelValue"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white appearance-none pr-10"
        :class="[
          error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500',
          $slots.prefix ? 'pl-10' : '',
          $attrs.class
        ]"
        v-bind="{ ...$attrs, class: undefined }"
        @input="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="placeholder" value="" disabled selected>
          {{ placeholder }}
        </option>
        <slot>
          <option
            v-for="option in options"
            :key="String(option.value)"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </slot>
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
        <Icon name="lucide:chevron-down" class="h-4 w-4" />
      </div>
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
interface Option {
  label: string
  value: string | number | boolean
}

defineOptions({
  inheritAttrs: false
})

defineProps<{
  modelValue?: string | number | boolean | null
  label?: string
  placeholder?: string
  options?: Option[]
  error?: string
  hint?: string
  required?: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: string | number | boolean | null): void
}>()
</script>
