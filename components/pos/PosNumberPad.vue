<template>
  <div class="grid grid-cols-3 gap-2">
    <button
      v-for="btn in buttons"
      :key="btn.label"
      class="h-12 rounded-xl text-lg font-semibold transition-all duration-100 active:scale-95 flex items-center justify-center"
      :class="btn.action === 'confirm' ? 'bg-brand text-brand-contrast hover:opacity-90 col-span-1' : 'surface-3 border border-line text-primary hover:opacity-80'"
      @click="handleInput(btn)"
    >
      <Icon
        v-if="btn.icon"
        :name="btn.icon"
        class="w-5 h-5"
      />
      <span v-else>{{ btn.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  allowDecimal?: boolean
}>()

const emit = defineEmits<{
  (e: 'input', value: string): void
  (e: 'backspace'): void
  (e: 'clear'): void
  (e: 'confirm'): void
}>()

const buttons = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
  { label: '6', value: '6' },
  { label: '7', value: '7' },
  { label: '8', value: '8' },
  { label: '9', value: '9' },
  { label: '.', value: '.', disabled: !props.allowDecimal },
  { label: '0', value: '0' },
  { label: '⌫', action: 'backspace', icon: 'lucide:delete' },
]

function handleInput(btn: any) {
  if (btn.action === 'backspace') {
    emit('backspace')
  } else if (btn.action === 'confirm') {
    emit('confirm')
  } else {
    emit('input', btn.value)
  }
}
</script>
