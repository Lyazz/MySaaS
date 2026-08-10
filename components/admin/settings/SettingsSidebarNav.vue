<template>
  <nav
    class="settings-nav"
    :aria-label="t('admin.settingsNav.ariaLabel') || 'Settings'"
  >
    <div
      v-for="group in visibleGroups"
      :key="group.id"
      class="settings-nav-group"
    >
      <p class="settings-nav-group-label">
        {{ t(group.labelKey) }}
      </p>
      <NuxtLink
        v-for="item in group.items"
        :key="item.key"
        :to="item.to"
        class="settings-nav-item"
        :class="{ 'is-active': isActive(item) }"
      >
        <Icon
          :name="item.icon"
          class="settings-nav-item-icon"
        />
        <span class="settings-nav-item-label">{{ t(item.labelKey) }}</span>
        <Icon
          v-if="item.external"
          name="lucide:arrow-up-right"
          class="settings-nav-item-ext"
        />
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import {
  SETTINGS_NAV_GROUPS,
  filterSettingsNavForRole,
  type AdminRole,
  type SettingsNavItem
} from '~/shared/admin/settings-navigation'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const route = useRoute()

const DEFAULT_SECTION: Record<string, string> = {
  '/admin/settings/functional': 'checkout'
}

const currentRole = computed<AdminRole>(() => {
  const role = authStore.user?.role
  if (role === 'owner' || role === 'admin' || role === 'staff') return role
  return 'staff'
})

const visibleGroups = computed(() =>
  filterSettingsNavForRole(SETTINGS_NAV_GROUPS, currentRole.value, authStore.staffPermissions || [])
)

function isActive(item: SettingsNavItem) {
  const url = new URL(item.to, 'https://settings.internal')
  if (route.path !== url.pathname) return false

  const section = url.searchParams.get('section')
  if (section) {
    const currentSection = (route.query.section as string) || DEFAULT_SECTION[url.pathname]
    return currentSection === section
  }
  if (url.pathname in DEFAULT_SECTION && !url.hash) {
    return !route.query.section || route.query.section === DEFAULT_SECTION[url.pathname]
  }
  if (url.hash) return route.hash === url.hash
  return !route.hash
}
</script>

<style scoped>
.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 216px;
  flex-shrink: 0;
}

.settings-nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-nav-group-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 0 10px 6px;
}

.settings-nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: background 0.12s ease, color 0.12s ease;
}

.settings-nav-item:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.settings-nav-item.is-active {
  background: rgba(var(--brand-rgb) / 0.12);
  color: var(--text-primary);
  font-weight: 650;
}

.settings-nav-item-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--text-muted);
}

.settings-nav-item.is-active .settings-nav-item-icon {
  color: var(--brand);
}

.settings-nav-item-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-nav-item-ext {
  width: 12px;
  height: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}

@media (max-width: 860px) {
  .settings-nav {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .settings-nav-group {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .settings-nav-group-label {
    display: none;
  }

  .settings-nav-item {
    white-space: nowrap;
  }

  .settings-nav-item-label {
    white-space: nowrap;
  }
}
</style>
