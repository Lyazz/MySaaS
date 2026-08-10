<template>
  <div class="settings-shell">
    <SettingsSidebarNav />
    <div class="settings-shell-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import SettingsSidebarNav from './SettingsSidebarNav.vue'
</script>

<style scoped>
.settings-shell {
  display: flex;
  align-items: flex-start;
  gap: 32px;
}

.settings-shell-content {
  flex: 1;
  min-width: 0;
}

@media (max-width: 860px) {
  .settings-shell {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
