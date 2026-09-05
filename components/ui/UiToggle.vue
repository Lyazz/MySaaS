<template>
  <button
    type="button"
    role="switch"
    class="ui-toggle"
    :class="{ 'is-on': modelValue }"
    :aria-checked="modelValue"
    :disabled="disabled"
    @click="toggle"
  >
    <span class="sr-only">{{ srLabel }}</span>
    <span aria-hidden="true" class="ui-toggle__thumb" :class="{ 'is-on': modelValue }" />
  </button>
</template>

<script setup lang="ts">
/** The switch. Focus ring comes from the shell's `[role='switch']` rule. */
const props = withDefaults(defineProps<{
  modelValue: boolean
  srLabel?: string
  disabled?: boolean
}>(), { srLabel: 'Toggle' })

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<style scoped>
.ui-toggle {
  position: relative;
  display: inline-flex;
  height: 24px;
  width: 44px;
  flex-shrink: 0;
  align-items: center;
  border-radius: 9999px;
  border: 1px solid var(--surface-border);
  background: var(--surface-3);
  transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
}

.ui-toggle.is-on {
  background: var(--brand);
  border-color: var(--brand);
}

.ui-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/*
 * `translateX` is physical, so a hard-coded positive offset pushes the thumb
 * off the left edge under RTL. Mirror the sign with the document direction.
 */
.ui-toggle__thumb {
  --thumb-offset: 2px;
  pointer-events: none;
  display: inline-block;
  height: 18px;
  width: 18px;
  border-radius: 9999px;
  background: var(--surface-1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transform: translateX(var(--thumb-offset));
  transition: transform 0.2s ease-in-out;
}

.ui-toggle__thumb.is-on {
  --thumb-offset: 22px;
}

:global([dir='rtl']) .ui-toggle__thumb {
  transform: translateX(calc(var(--thumb-offset) * -1));
}
</style>
