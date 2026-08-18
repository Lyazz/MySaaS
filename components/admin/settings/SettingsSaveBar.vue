<template>
  <div>
    <Transition name="save-bar">
      <div
        v-if="isDirty"
        class="save-bar"
        role="status"
        aria-live="polite"
      >
        <div class="save-bar-indicator">
          <span class="save-bar-dot" />
          <div class="save-bar-text">
            <p class="save-bar-title">
              {{ title || t('admin.common.unsavedChanges') }}
            </p>
            <p class="save-bar-subtitle">
              {{ subtitle || t('admin.common.unsavedChangesHint') }}
            </p>
          </div>
        </div>
        <div class="save-bar-actions">
          <button
            type="button"
            class="save-bar-btn save-bar-btn-secondary"
            :disabled="saving"
            @click="requestDiscard"
          >
            {{ t('admin.common.discard') }}
          </button>
          <button
            type="button"
            class="save-bar-btn save-bar-btn-primary"
            :disabled="saving"
            @click="$emit('save')"
          >
            <Icon
              v-if="saving"
              name="lucide:loader-2"
              class="save-bar-spin"
            />
            <Icon
              v-else
              name="lucide:check"
              class="save-bar-icon"
            />
            {{ saving ? t('admin.common.saving') : t('admin.common.saveChanges') }}
            <kbd class="save-bar-kbd">{{ saveShortcutLabel }}</kbd>
          </button>
        </div>
      </div>
    </Transition>

    <SettingsConfirmDialog
      :open="confirmMode !== null"
      :title="confirmCopy.title"
      :message="confirmCopy.message"
      :confirm-label="confirmCopy.confirmLabel"
      :cancel-label="t('admin.common.keepEditing')"
      @confirm="acceptConfirm"
      @cancel="rejectConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeRouteLeave } from 'vue-router'
import SettingsConfirmDialog from './SettingsConfirmDialog.vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  isDirty: boolean
  saving?: boolean
  title?: string
  subtitle?: string
}>()

const emit = defineEmits<{
  save: []
  discard: []
}>()

/**
 * Two things can ask for confirmation: the Discard button, and an attempt to
 * navigate away with unsaved work. They share one dialog; `confirmMode` says
 * which is asking and `resolveConfirm` carries the answer back.
 */
const confirmMode = ref<'discard' | 'leave' | null>(null)
let resolveConfirm: ((confirmed: boolean) => void) | null = null

const confirmCopy = computed(() =>
  confirmMode.value === 'leave'
    ? {
        title: t('admin.common.leaveTitle'),
        message: t('admin.common.leaveMessage'),
        confirmLabel: t('admin.common.leaveConfirm')
      }
    : {
        title: t('admin.common.discardChangesTitle'),
        message: t('admin.common.discardChangesMessage'),
        confirmLabel: t('admin.common.discard')
      }
)

function ask(mode: 'discard' | 'leave') {
  confirmMode.value = mode
  return new Promise<boolean>((resolve) => { resolveConfirm = resolve })
}

function settle(confirmed: boolean) {
  confirmMode.value = null
  resolveConfirm?.(confirmed)
  resolveConfirm = null
}

const acceptConfirm = () => settle(true)
const rejectConfirm = () => settle(false)

async function requestDiscard() {
  if (await ask('discard')) emit('discard')
}

// ── Leaving with unsaved work ───────────────────────────────────────────

onBeforeRouteLeave(async () => {
  if (!props.isDirty) return true
  return await ask('leave')
})

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!props.isDirty) return
  // The browser shows its own wording; assigning returnValue is what arms it.
  event.preventDefault()
  event.returnValue = ''
}

// ── Ctrl/Cmd+S ──────────────────────────────────────────────────────────

const isMac = ref(false)
const saveShortcutLabel = computed(() => (isMac.value ? '⌘S' : 'Ctrl S'))

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 's' && event.key !== 'S') return
  if (!(event.metaKey || event.ctrlKey)) return
  if (!props.isDirty || props.saving) return
  event.preventDefault()
  emit('save')
}

onMounted(() => {
  isMac.value = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('keydown', handleKeydown)
  // A pending prompt must not outlive the component, or the router guard hangs.
  if (resolveConfirm) settle(false)
})
</script>

<style scoped>
.save-bar {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom));
  inset-inline-start: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 14px;
  padding-inline-start: 18px;
  background: color-mix(in srgb, var(--surface-1) 92%, transparent);
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.32), 0 2px 6px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(20px);
  z-index: 80;
  min-width: 380px;
  max-width: calc(100vw - 32px);
}

/* `translateX(-50%)` centres by moving left; under RTL that is the wrong way. */
:global([dir='rtl']) .save-bar {
  transform: translateX(50%);
}

.save-bar-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.save-bar-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.18);
  flex-shrink: 0;
  animation: save-bar-pulse 2s ease-in-out infinite;
}

@keyframes save-bar-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

.save-bar-text {
  min-width: 0;
}

.save-bar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.save-bar-subtitle {
  font-size: 11.5px;
  color: var(--text-tertiary);
  margin-top: 2px;
  line-height: 1.2;
}

.save-bar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.save-bar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 14px;
  min-height: 40px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}

.save-bar-btn:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.save-bar-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-bar-btn-secondary {
  background: transparent;
  border-color: var(--surface-border);
  color: var(--text-secondary);
}

.save-bar-btn-secondary:hover:not(:disabled) {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.save-bar-btn-primary {
  background: var(--brand);
  color: var(--brand-contrast);
}

.save-bar-btn-primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand) 88%, #fff);
}

.save-bar-kbd {
  font-family: ui-monospace, monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 2px 5px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--brand-contrast) 12%, transparent);
  color: currentColor;
  opacity: 0.72;
}

.save-bar-icon,
.save-bar-spin {
  width: 14px;
  height: 14px;
}

.save-bar-spin {
  animation: save-bar-spin 0.9s linear infinite;
}

@keyframes save-bar-spin {
  to { transform: rotate(360deg); }
}

.save-bar-enter-from,
.save-bar-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

:global([dir='rtl']) .save-bar-enter-from,
:global([dir='rtl']) .save-bar-leave-to {
  transform: translate(50%, 12px);
}

.save-bar-enter-active,
.save-bar-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (max-width: 680px) {
  .save-bar {
    min-width: 0;
    inset-inline: 12px;
    transform: none;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    max-width: none;
  }

  :global([dir='rtl']) .save-bar {
    transform: none;
  }

  .save-bar-actions {
    justify-content: stretch;
  }

  .save-bar-btn {
    flex: 1;
    justify-content: center;
    min-height: 44px;
  }

  .save-bar-kbd {
    display: none;
  }

  .save-bar-enter-from,
  .save-bar-leave-to,
  :global([dir='rtl']) .save-bar-enter-from,
  :global([dir='rtl']) .save-bar-leave-to {
    transform: translateY(12px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .save-bar-dot,
  .save-bar-spin {
    animation: none;
  }
}
</style>
