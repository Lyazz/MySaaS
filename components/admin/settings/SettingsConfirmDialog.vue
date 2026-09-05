<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="open"
        class="confirm-backdrop"
        @click.self="$emit('cancel')"
      >
        <div
          ref="panelRef"
          class="confirm-panel"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
          @keydown.esc.prevent="$emit('cancel')"
          @keydown.tab="trapFocus"
        >
          <div class="confirm-icon">
            <Icon name="lucide:triangle-alert" />
          </div>
          <h2
            :id="titleId"
            class="confirm-title"
          >
            {{ title }}
          </h2>
          <p
            :id="messageId"
            class="confirm-message"
          >
            {{ message }}
          </p>
          <div class="confirm-actions">
            <button
              ref="cancelRef"
              type="button"
              class="confirm-btn confirm-btn-secondary"
              @click="$emit('cancel')"
            >
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              class="confirm-btn confirm-btn-danger"
              @click="$emit('confirm')"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()

const uid = useId()
const titleId = `confirm-title-${uid}`
const messageId = `confirm-message-${uid}`

const panelRef = ref<HTMLElement | null>(null)
const cancelRef = ref<HTMLButtonElement | null>(null)
let lastFocused: HTMLElement | null = null

// Opens focused on the safe choice, so a stray Enter never discards work.
watch(() => props.open, (open) => {
  if (open) {
    lastFocused = document.activeElement as HTMLElement | null
    nextTick(() => cancelRef.value?.focus())
  } else {
    lastFocused?.focus()
    lastFocused = null
  }
})

function trapFocus(event: KeyboardEvent) {
  const focusables = panelRef.value?.querySelectorAll<HTMLElement>('button')
  if (!focusables?.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.confirm-panel {
  width: 100%;
  max-width: 400px;
  padding: 24px;
  background: var(--surface-1);
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
}

.confirm-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 14px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.14);
  color: #f59e0b;
}

.confirm-icon :deep(svg) {
  width: 19px;
  height: 19px;
}

.confirm-title {
  font-size: 16px;
  font-weight: 650;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.confirm-message {
  margin-top: 7px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 22px;
}

.confirm-btn {
  flex: 1;
  min-height: 42px;
  padding: 10px 16px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.confirm-btn:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.confirm-btn-secondary {
  background: transparent;
  border-color: var(--surface-border);
  color: var(--text-secondary);
}

.confirm-btn-secondary:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.confirm-btn-danger {
  background: #ef4444;
  color: #fff;
}

.confirm-btn-danger:hover {
  background: #dc2626;
}

.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.18s ease;
}

.confirm-enter-active .confirm-panel,
.confirm-leave-active .confirm-panel {
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}

.confirm-enter-from .confirm-panel,
.confirm-leave-to .confirm-panel {
  transform: scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .confirm-enter-active .confirm-panel,
  .confirm-leave-active .confirm-panel {
    transition: none;
  }
}
</style>
