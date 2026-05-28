<template>
  <div class="settings-hub">
    <SettingsPageHeader
      data-tour="settings-appearance-tab"
      :eyebrow="t('admin.nav.storefront')"
      :title="t('admin.pages.settings.index.title')"
      :subtitle="t('admin.pages.settings.index.subtitle')"
    />

    <div v-if="visibleThemes.length === 0" class="settings-empty">
      <Icon name="lucide:lock" class="settings-empty-icon" />
      <p class="settings-empty-title">{{ t('admin.settingsHub.empty.title') }}</p>
      <p class="settings-empty-copy">{{ t('admin.settingsHub.empty.description') }}</p>
    </div>

    <div v-else class="settings-grid">
      <article
        v-for="theme in visibleThemes"
        :key="theme.id"
        class="settings-card"
      >
        <div class="settings-card-head">
          <div class="settings-card-icon">
            <Icon :name="theme.icon" class="w-5 h-5" />
          </div>
          <div class="settings-card-copy">
            <h2 class="settings-card-title">{{ t(theme.labelKey) }}</h2>
            <p class="settings-card-description">{{ t(theme.descriptionKey) }}</p>
          </div>
        </div>

        <div class="settings-card-links">
          <NuxtLink
            v-for="link in theme.links"
            :key="link.to"
            :to="link.to"
            class="settings-link"
          >
            <span>{{ t(link.labelKey) }}</span>
            <Icon name="lucide:arrow-right" class="settings-link-icon" />
          </NuxtLink>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SettingsPageHeader from '~/components/admin/settings/SettingsPageHeader.vue'
import {
  SETTINGS_THEMES,
  filterSettingsThemesForRole,
  type AdminRole
} from '~/shared/admin/settings-navigation'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.index.metaTitle'
})

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

const currentRole = computed<AdminRole>(() => {
  const role = authStore.user?.role
  if (role === 'owner' || role === 'admin' || role === 'staff') return role
  return 'staff'
})

const visibleThemes = computed(() =>
  filterSettingsThemesForRole(SETTINGS_THEMES, currentRole.value, authStore.staffPermissions || [])
)
</script>

<style scoped>
.settings-hub {
  padding-bottom: 48px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.settings-card {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
  padding: 20px;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-2);
  transition: border-color 0.16s ease, background 0.16s ease;
}

.settings-card:hover {
  border-color: color-mix(in srgb, var(--surface-border) 68%, var(--text-muted));
  background: color-mix(in srgb, var(--surface-2) 92%, var(--surface-3));
}

.settings-card-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.settings-card-icon {
  display: flex;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(var(--brand-rgb) / 0.22);
  border-radius: 8px;
  background: rgba(var(--brand-rgb) / 0.08);
  color: var(--brand);
}

.settings-card-copy {
  min-width: 0;
}

.settings-card-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.25;
}

.settings-card-description {
  margin-top: 6px;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.5;
}

.settings-card-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings-link {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 7px 10px;
  background: var(--surface-1);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.2;
  text-decoration: none;
  transition: border-color 0.16s ease, color 0.16s ease, background 0.16s ease;
}

.settings-link:hover {
  border-color: rgba(var(--brand-rgb) / 0.36);
  background: rgba(var(--brand-rgb) / 0.08);
  color: var(--text-primary);
}

.settings-link-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.settings-empty {
  display: flex;
  min-height: 280px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-2);
  padding: 32px;
  text-align: center;
}

.settings-empty-icon {
  width: 28px;
  height: 28px;
  color: var(--text-muted);
}

.settings-empty-title {
  margin-top: 12px;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 650;
}

.settings-empty-copy {
  margin-top: 6px;
  max-width: 38ch;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 860px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
