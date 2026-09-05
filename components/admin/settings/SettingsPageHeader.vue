<template>
  <header class="settings-header">
    <div class="settings-header-titles">
      <p
        v-if="resolvedEyebrow"
        class="settings-header-eyebrow"
      >
        {{ resolvedEyebrow }}
      </p>
      <h1 class="settings-header-title">{{ title }}</h1>
      <p v-if="subtitle" class="settings-header-subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="settings-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import {
  SETTINGS_NAV_GROUPS,
  findActiveSettingsNav
} from '~/shared/admin/settings-navigation'

const props = defineProps<{
  title: string
  subtitle?: string
  eyebrow?: string
}>()

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()

/*
 * Defaults to the nav group this page sits in, so the eyebrow always names the
 * same section the sidebar highlights. Forms can still pass their own.
 */
const resolvedEyebrow = computed(() => {
  if (props.eyebrow) return props.eyebrow
  const active = findActiveSettingsNav(SETTINGS_NAV_GROUPS, {
    path: route.path,
    query: route.query as Record<string, string | undefined>,
    hash: route.hash
  })
  return active ? t(active.group.labelKey) : ''
})
</script>

<style scoped>
.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  padding-block-end: 24px;
  margin-block-end: 24px;
  border-block-end: 1px solid var(--surface-border);
}

/* Below 1024px the sticky section bar already names the group. */
@media (max-width: 1023px) {
  .settings-header-eyebrow {
    display: none;
  }
}

.settings-header-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-block-end: 8px;
}

.settings-header-title {
  /* Scales with the viewport so long store names stay on one or two lines. */
  font-size: clamp(21px, 2.4vw, 26px);
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

@media (max-width: 640px) {
  .settings-header {
    padding-block-end: 18px;
    margin-block-end: 18px;
  }

  .settings-header-actions {
    width: 100%;
  }

  .settings-header-actions > * {
    flex: 1 1 auto;
    justify-content: center;
  }
}
</style>
