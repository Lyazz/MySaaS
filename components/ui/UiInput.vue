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

        <input
          :id="fieldId"
          :value="displayValue"
          class="ui-input"
          :class="[$slots.prefix ? 'ps-10' : '', $attrs.class]"
          :aria-invalid="invalid || undefined"
          :aria-describedby="describedBy"
          v-bind="{ ...$attrs, class: undefined }"
          @input="handleInput"
          @blur="handleBlur"
        >

        <!--
          Suffix content positions itself (callers use `absolute inset-y-0
          end-0` for reveal-password style buttons) and pairs with a `pe-*`
          class on the input, so no wrapper here.
        -->
        <slot name="suffix" />
      </div>
    </template>
  </UiField>
</template>

<script setup lang="ts">
/**
 * Text input. `money` keeps the shared price formatting from
 * `shared/pricing/money-format` — the field shows a formatted amount and only
 * normalises it on blur, so typing "1 250,5" isn't fought mid-keystroke.
 */
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

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const localValue = ref('')

const displayValue = computed(() => (props.money ? localValue.value : props.modelValue))

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
