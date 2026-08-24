<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    :disabled="disabled"
    class="delivery-switch"
    :class="[modelValue ? 'is-on' : 'is-off', size === 'sm' ? 'is-sm' : '']"
    @click.stop="toggle"
  >
    <span
      aria-hidden="true"
      class="delivery-switch__knob"
      :class="modelValue ? 'is-on' : ''"
    />
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label: string
    disabled?: boolean
    size?: 'sm' | 'md'
  }>(),
  { disabled: false, size: 'md' }
)

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<style scoped>
.delivery-switch {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  width: 2.5rem;
  height: 1.375rem;
  padding: 2px;
  border-radius: 999px;
  border: 1px solid var(--surface-border);
  background: var(--surface-3);
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.delivery-switch.is-sm {
  width: 2.125rem;
  height: 1.1875rem;
}

.delivery-switch.is-on {
  background: var(--brand);
  border-color: var(--brand);
}

.delivery-switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.delivery-switch:focus-visible {
  outline: 2px solid rgb(var(--brand-rgb) / 0.7);
  outline-offset: 2px;
}

.delivery-switch__knob {
  display: block;
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  background: var(--text-primary);
  transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.3, 1), background 0.18s ease;
}

.is-sm .delivery-switch__knob {
  width: 0.8125rem;
  height: 0.8125rem;
}

.delivery-switch__knob.is-on {
  background: var(--brand-contrast);
  transform: translateX(1.125rem);
}

.is-sm .delivery-switch__knob.is-on {
  transform: translateX(0.9375rem);
}

[dir='rtl'] .delivery-switch__knob.is-on {
  transform: translateX(-1.125rem);
}

[dir='rtl'] .is-sm .delivery-switch__knob.is-on {
  transform: translateX(-0.9375rem);
}

@media (prefers-reduced-motion: reduce) {
  .delivery-switch,
  .delivery-switch__knob {
    transition: none;
  }
}
</style>
