<template>
  <button
    @click="uiStore.toggleTheme()"
    class="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150"
    :style="btnStyle"
    :aria-label="uiStore.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <Transition name="theme-icon" mode="out-in">
      <Icon
        v-if="uiStore.theme === 'dark'"
        key="sun"
        name="lucide:sun"
        class="w-4 h-4"
        :style="iconStyle"
      />
      <Icon
        v-else
        key="moon"
        name="lucide:moon"
        class="w-4 h-4"
        :style="iconStyle"
      />
    </Transition>
  </button>
</template>

<script setup lang="ts">
import { useUiStore } from '~/stores/ui'

const uiStore = useUiStore()
const hovered = ref(false)

const btnStyle = computed(() => ({
  background: hovered.value ? 'var(--nav-hover-bg)' : 'transparent',
  border: '1px solid var(--surface-border)',
  color: hovered.value ? 'var(--text-primary)' : 'var(--text-secondary)',
}))

const iconStyle = computed(() => ({
  color: hovered.value ? 'var(--text-primary)' : 'var(--text-secondary)',
}))
</script>

<style scoped>
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.theme-icon-enter-from {
  opacity: 0;
  transform: rotate(-30deg) scale(0.8);
}
.theme-icon-leave-to {
  opacity: 0;
  transform: rotate(30deg) scale(0.8);
}
</style>
