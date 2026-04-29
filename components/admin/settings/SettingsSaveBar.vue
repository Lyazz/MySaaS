<template>
  <Transition name="save-bar">
    <div v-if="isDirty" class="save-bar">
      <div class="save-bar-indicator">
        <span class="save-bar-dot" />
        <div class="save-bar-text">
          <p class="save-bar-title">{{ title || t('admin.common.unsavedChanges') || 'Unsaved changes' }}</p>
          <p class="save-bar-subtitle">{{ subtitle || t('admin.common.unsavedChangesHint') || "Don't forget to save your changes." }}</p>
        </div>
      </div>
      <div class="save-bar-actions">
        <button
          type="button"
          class="save-bar-btn save-bar-btn-secondary"
          :disabled="saving"
          @click="$emit('discard')"
        >
          {{ t('admin.common.discard') || t('admin.common.cancel') }}
        </button>
        <button
          type="button"
          class="save-bar-btn save-bar-btn-primary"
          :disabled="saving"
          @click="$emit('save')"
        >
          <Icon v-if="saving" name="lucide:loader-2" class="save-bar-spin" />
          <Icon v-else name="lucide:check" class="save-bar-icon" />
          {{ saving ? (t('admin.common.saving') || 'Saving…') : (t('admin.common.saveChanges') || 'Save changes') }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

defineProps<{
  isDirty: boolean
  saving?: boolean
  title?: string
  subtitle?: string
}>()

defineEmits<{
  save: []
  discard: []
}>()
</script>

<style scoped>
.save-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 14px 12px 18px;
  background: color-mix(in srgb, var(--surface-1) 92%, transparent);
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.32), 0 2px 6px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(20px);
  z-index: 80;
  min-width: 380px;
  max-width: calc(100vw - 32px);
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
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
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
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
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
  color: #0a0a0a;
}

.save-bar-btn-primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand) 88%, #fff);
}

.save-bar-icon,
.save-bar-spin {
  width: 14px;
  height: 14px;
}

.save-bar-spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.save-bar-enter-from,
.save-bar-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

.save-bar-enter-active,
.save-bar-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (max-width: 640px) {
  .save-bar {
    min-width: 0;
    width: calc(100vw - 24px);
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .save-bar-actions {
    justify-content: flex-end;
  }
}
</style>
