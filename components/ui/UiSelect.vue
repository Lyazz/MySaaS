<template>
  <UiField :label="label" :hint="hint" :error="error" :required="required">
    <template #default="{ fieldId, describedBy, invalid }">
      <div class="relative">
        <div
          v-if="$slots.prefix"
          class="pointer-events-none absolute inset-y-0 start-0 flex items-center px-3 text-tertiary"
        >
          <slot name="prefix" />
        </div>

        <select
          :id="fieldId"
          :value="modelValue"
          class="ui-input ui-input--select"
          :class="[$slots.prefix ? 'ps-10' : '', $attrs.class]"
          :aria-invalid="invalid || undefined"
          :aria-describedby="describedBy"
          v-bind="{ ...$attrs, class: undefined }"
          @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        >
          <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
          <slot>
            <option v-for="option in options" :key="String(option.value)" :value="option.value">
              {{ option.label }}
            </option>
          </slot>
        </select>

        <div class="pointer-events-none absolute inset-y-0 end-0 flex items-center px-2.5 text-tertiary">
          <Icon name="lucide:chevron-down" class="h-3.5 w-3.5" />
        </div>
      </div>
    </template>
  </UiField>
</template>

<script setup lang="ts">
/*
 * Options inherit the shell's `color-scheme`, so the native dropdown popup
 * follows the admin theme without per-option inline colours.
 */
defineOptions({ inheritAttrs: false })

defineProps<{
  modelValue?: string | number
  options?: Array<{ value: string | number, label: string }>
  placeholder?: string
  label?: string
  error?: string
  hint?: string
  required?: boolean
}>()

defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>
