<template>
  <header class="settings-header">
    <div class="settings-header-titles">
      <p v-if="eyebrow" class="settings-header-eyebrow">{{ eyebrow }}</p>
      <h1 class="settings-header-title">{{ title }}</h1>
      <p v-if="subtitle" class="settings-header-subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="settings-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  eyebrow?: string
}>()
</script>

<style scoped>
.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  padding-bottom: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--surface-border);
}

.settings-header-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.settings-header-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.settings-header-subtitle {
  margin-top: 6px;
  font-size: 14px;
  color: var(--text-secondary);
  max-width: 60ch;
  line-height: 1.55;
}

.settings-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
