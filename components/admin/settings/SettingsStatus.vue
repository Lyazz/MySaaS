<template>
  <Teleport to="body">
    <Transition name="settings-status">
      <!--
        Floats below the admin topbar rather than sitting inline at the top of
        the form. Saving happens from the fixed bar at the bottom of a long
        page, and an inline confirmation there is offscreen when it appears.
      -->
      <div
        v-if="message"
        class="settings-status"
        :class="type"
        role="status"
        aria-live="polite"
      >
        <Icon
          :name="type === 'error' ? 'lucide:alert-triangle' : 'lucide:check-circle-2'"
          class="settings-status-icon"
        />
        <span class="settings-status-text">{{ message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message?: string
    type?: 'success' | 'error'
  }>(),
  { message: '', type: 'success' }
)
</script>

<style scoped>
.settings-status {
  position: fixed;
  top: 66px;
  inset-inline-start: 50%;
  transform: translateX(-50%);
  z-index: 95;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  max-width: calc(100vw - 32px);
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 12.5px;
  font-weight: 550;
  line-height: 1.4;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(16px);
}

:global([dir='rtl']) .settings-status {
  transform: translateX(50%);
}

.settings-status.success {
  background: color-mix(in srgb, #16a34a 20%, var(--surface-1));
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.32);
}

.settings-status.error {
  background: color-mix(in srgb, #dc2626 20%, var(--surface-1));
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.32);
}

.settings-status-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.settings-status-text {
  min-width: 0;
}

.settings-status-enter-active,
.settings-status-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.settings-status-enter-from,
.settings-status-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}

:global([dir='rtl']) .settings-status-enter-from,
:global([dir='rtl']) .settings-status-leave-to {
  transform: translate(50%, -10px);
}
</style>
