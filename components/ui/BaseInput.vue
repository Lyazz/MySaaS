<template>
  <div>
    <label v-if="label" class="ui-label">
      {{ label }}
      <span v-if="required" class="text-red-400">*</span>
    </label>
    <div class="relative">
      <input
        :value="displayValue"
        class="ui-input"
        :class="[
          error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : '',
          $attrs.class
        ]"
        v-bind="{ ...$attrs, class: undefined }"
        @input="handleInput"
        @blur="handleBlur"
      >
      <slot name="suffix" />
    </div>
    <p v-if="error" class="mt-1 text-xs text-red-400">{{ error }}</p>
    <p v-if="hint && !error" class="mt-1 text-xs" style="color: var(--text-tertiary)">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatPriceAmount, parsePriceInput } from '~/shared/pricing/money-format'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  modelValue?: string | number
  label?: string
  error?: string
  hint?: string
  required?: boolean
  money?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const localValue = ref('')

const displayValue = computed(() => {
  if (!props.money) return props.modelValue
  return localValue.value
})

watch(
  () => [props.modelValue, props.money] as const,
  ([nextValue, isMoney]) => {
    if (!isMoney) return
    if (nextValue === null || nextValue === undefined || String(nextValue).trim() === '') {
      localValue.value = ''
      return
    }
    localValue.value = formatPriceAmount(nextValue) || String(nextValue)
  },
  { immediate: true }
)

const handleInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  if (!props.money) {
    emit('update:modelValue', value)
    return
  }
  localValue.value = value
}

const handleBlur = () => {
  if (!props.money) return
  const parsed = parsePriceInput(localValue.value)
  if (parsed === null) {
    localValue.value = ''
    emit('update:modelValue', '')
    return
  }
  const normalized = formatPriceAmount(parsed)
  localValue.value = normalized
  emit('update:modelValue', normalized)
}
</script>
