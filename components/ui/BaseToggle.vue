<template>
  <button
    type="button"
    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    :class="[modelValue ? activeColor : '[background:var(--surface-3)] [border-color:var(--surface-border)]']"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    @click="toggle"
  >
    <span class="sr-only">{{ srLabel }}</span>
    <span
      aria-hidden="true"
      class="pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-[color:var(--surface-1)] shadow-sm ring-0 transition duration-200 ease-in-out"
      :class="[modelValue ? 'translate-x-[22px]' : 'translate-x-0.5']"
    />
  </button>
</template>

<script setup lang="ts">
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  srLabel: {
    type: String,
    default: 'Toggle'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  activeColor: {
    type: String,
    default: 'bg-brand border-brand'
  }
})

const emit = defineEmits(['update:modelValue'])

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>
