<template>
  <UiField :label="label" :hint="hint" :error="error" :required="required">
    <template #default="{ fieldId, describedBy, invalid }">
      <textarea
        :id="fieldId"
        :value="modelValue"
        class="ui-input ui-input--textarea"
        :class="$attrs.class"
        :rows="rows"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
        v-bind="{ ...$attrs, class: undefined }"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      />
    </template>
  </UiField>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  modelValue?: string
  label?: string
  error?: string
  hint?: string
  required?: boolean
  rows?: number
}>(), { rows: 4 })

defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>
