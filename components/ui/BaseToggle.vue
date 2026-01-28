<template>
  <button
    type="button"
    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
    :class="[modelValue ? activeColor : 'bg-slate-200']"
    role="switch"
    :aria-checked="modelValue"
    @click="toggle"
  >
    <span class="sr-only">{{ srLabel }}</span>
    <span
      aria-hidden="true"
      class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
      :class="[modelValue ? 'translate-x-5' : 'translate-x-0']"
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
  activeColor: {
    type: String,
    default: 'bg-indigo-600'
  }
})

const emit = defineEmits(['update:modelValue'])

function toggle() {
  emit('update:modelValue', !props.modelValue)
}
</script>
