<template>
  <section
    :id="anchorId"
    class="settings-section"
  >
    <div
      v-if="!bare"
      class="settings-section-head"
    >
      <div class="settings-section-titles">
        <div class="settings-section-title-row">
          <Icon
            v-if="icon"
            :name="icon"
            class="settings-section-icon"
          />
          <h2 class="settings-section-title">
            {{ title }}
          </h2>
        </div>
        <p
          v-if="subtitle"
          class="settings-section-subtitle"
        >
          {{ subtitle }}
        </p>
      </div>
      <div
        v-if="$slots.aside"
        class="settings-section-aside"
      >
        <slot name="aside" />
      </div>
    </div>
    <div class="settings-section-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  icon?: string
  anchorId?: string
  /**
   * Hides the section's own heading. Use when the section is the only thing on
   * the page and the page header already says the same words.
   */
  bare?: boolean
}>()
</script>

<style scoped>
.settings-section {
  background: var(--surface-2);
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  padding: 28px;
  /* Clears the sticky section bar when an anchor link jumps here. */
  scroll-margin-top: 96px;
  transition: border-color 0.2s ease;
}

@media (max-width: 640px) {
  .settings-section {
    padding: 18px 16px;
    border-radius: 14px;
  }
}

.settings-section:hover {
  border-color: color-mix(in srgb, var(--surface-border) 80%, var(--text-muted));
}

.settings-section-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-block-end: 24px;
  padding-block-end: 18px;
  border-block-end: 1px solid var(--surface-border);
}

@media (max-width: 640px) {
  .settings-section-head {
    margin-block-end: 18px;
    padding-block-end: 14px;
  }
}

.settings-section-titles {
  min-width: 0;
  flex: 1 1 260px;
}

.settings-section-aside {
  min-width: 0;
  max-width: 100%;
}

.settings-section-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.settings-section-icon {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
}

.settings-section-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.settings-section-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-tertiary);
  line-height: 1.55;
  max-width: 56ch;
}
</style>
