<template>
  <div class="relative">
    <label v-if="label" class="ui-label">
      {{ label }}
      <span v-if="required" class="text-red-400">*</span>
    </label>
    <div class="relative">
      <div v-if="$slots.prefix" class="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2">
        <slot name="prefix" />
      </div>
      <select
        :value="modelValue"
        class="ui-input appearance-none pr-9"
        :class="[
          error ? 'border-red-500/50 focus:border-red-500' : '',
          $slots.prefix ? 'pl-10' : '',
          $attrs.class
        ]"
        v-bind="{ ...$attrs, class: undefined }"
        @input="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="placeholder" value="" disabled selected style="background: var(--surface-2); color: var(--text-tertiary)">
          {{ placeholder }}
        </option>
        <slot>
          <option
            v-for="option in options"
            :key="String(option.value)"
            :value="option.value"
            style="background: var(--surface-2); color: var(--text-primary)"
          >
            {{ option.label }}
          </option>
        </slot>
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5" style="color: var(--text-tertiary)">
        <Icon name="lucide:chevron-down" class="h-3.5 w-3.5" />
      </div>
    </div>
    <p v-if="error" class="mt-1 text-xs text-red-400">{{ error }}</p>
    <p v-if="hint && !error" class="mt-1 text-xs" style="color: var(--text-tertiary)">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
interface Option {
  label: string
  value: string | number | boolean
}

defineOptions({ inheritAttrs: false })

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
