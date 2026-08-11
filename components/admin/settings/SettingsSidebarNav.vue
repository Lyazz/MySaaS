<template>
  <nav
    class="settings-nav"
    :aria-label="t('admin.settingsNav.ariaLabel') || 'Settings'"
  >
    <div
      v-for="group in visibleGroups"
      :key="group.id"
      class="settings-nav-group"
      :class="{ 'is-expanded': expandedGroupId === group.id }"
    >
      <button
        type="button"
        class="settings-nav-group-toggle"
        :aria-expanded="expandedGroupId === group.id"
        @click="toggleGroup(group.id)"
      >
        <span class="settings-nav-group-label">{{ t(group.labelKey) }}</span>
        <span
          v-if="expandedGroupId !== group.id"
          class="settings-nav-group-count"
        >{{ group.items.length }}</span>
        <Icon
          name="lucide:chevron-down"
          class="settings-nav-group-chevron"
        />
      </button>

      <div class="settings-nav-group-collapse">
        <div class="settings-nav-group-items">
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
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import {
  SETTINGS_NAV_GROUPS,
  filterSettingsNavForRole,
  type AdminRole,
  type SettingsNavGroup,
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

function findActiveGroupId(groups: SettingsNavGroup[]) {
  return groups.find((group) => group.items.some(isActive))?.id ?? groups[0]?.id ?? null
}

// undefined = "follow the current route"; a group id = the user pinned it open
// by hand (e.g. to browse without navigating). Any navigation clears the pin
// so the sidebar always snaps back to reflecting where you actually are.
const manualGroupId = ref<string | null | undefined>(undefined)

const expandedGroupId = computed(() =>
  manualGroupId.value !== undefined ? manualGroupId.value : findActiveGroupId(visibleGroups.value)
)

function toggleGroup(id: string) {
  manualGroupId.value = expandedGroupId.value === id ? null : id
}

watch(() => route.fullPath, () => { manualGroupId.value = undefined })
</script>

<style scoped>
.settings-nav {
  display: flex;
  flex-direction: column;
  width: 252px;
  flex-shrink: 0;
}

.settings-nav-group {
  border-top: 1px solid var(--surface-border);
}

.settings-nav-group:first-child {
  border-top: none;
}

.settings-nav-group-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 14px 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.settings-nav-group-label {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-secondary);
  flex: 1;
  min-width: 0;
}

.settings-nav-group.is-expanded .settings-nav-group-label {
  color: var(--text-primary);
}

.settings-nav-group-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-3);
  border-radius: 999px;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-nav-group-chevron {
  width: 15px;
  height: 15px;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.settings-nav-group.is-expanded .settings-nav-group-chevron {
  transform: rotate(180deg);
  color: var(--text-secondary);
}

.settings-nav-group-collapse {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.settings-nav-group.is-expanded .settings-nav-group-collapse {
  grid-template-rows: 1fr;
}

.settings-nav-group-items {
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 14px;
}

.settings-nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px 10px 18px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  position: relative;
  transition: background 0.12s ease, color 0.12s ease;
}

.settings-nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 999px;
  background: transparent;
  transition: background 0.12s ease;
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

.settings-nav-item.is-active::before {
  background: var(--brand);
}

.settings-nav-item-icon {
  width: 16px;
  height: 16px;
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

@media (max-width: 900px) {
  .settings-nav {
    width: 100%;
  }
}
</style>
