<template>
  <div class="settings-shell">
    <!--
      Wide viewports get the nav as a sticky rail beside the content. Narrow
      ones get a one-line "you are here" bar instead — the rail stacked above
      the content used to push the actual settings a full screen down.
    -->
    <aside class="settings-shell-rail">
      <SettingsNav />
    </aside>

    <div class="settings-shell-bar">
      <button
        type="button"
        class="settings-shell-bar-trigger"
        :aria-expanded="drawerOpen"
        aria-controls="settings-nav-drawer"
        @click="openDrawer"
      >
        <Icon
          name="lucide:list"
          class="settings-shell-bar-icon"
        />
        <span class="settings-shell-bar-copy">
          <small>{{ activeGroupLabel || t('admin.settingsNav.ariaLabel') }}</small>
          <strong>{{ activeItemLabel || t('admin.settingsNav.browse') }}</strong>
        </span>
        <Icon
          name="lucide:chevrons-up-down"
          class="settings-shell-bar-chevron"
        />
      </button>
    </div>

    <div class="settings-shell-content settings-page">
      <slot />
    </div>

    <Teleport to="body">
      <Transition name="settings-drawer">
        <div
          v-if="drawerOpen"
          class="settings-drawer-backdrop"
          @click.self="closeDrawer"
        >
          <div
            id="settings-nav-drawer"
            ref="drawerRef"
            class="settings-drawer"
            role="dialog"
            aria-modal="true"
            :aria-label="t('admin.settingsNav.ariaLabel')"
            @keydown.esc="closeDrawer"
          >
            <header class="settings-drawer-head">
              <span class="settings-drawer-grip" />
              <h2 class="settings-drawer-title">
                {{ t('admin.settingsNav.ariaLabel') }}
              </h2>
              <button
                type="button"
                class="settings-drawer-close"
                :aria-label="t('admin.common.close')"
                @click="closeDrawer"
              >
                <Icon name="lucide:x" />
              </button>
            </header>
            <div class="settings-drawer-body">
              <SettingsNav
                ref="drawerNavRef"
                variant="drawer"
                @navigate="closeDrawer"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SettingsNav from './SettingsNav.vue'
import {
  SETTINGS_NAV_GROUPS,
  filterSettingsNavForRole,
  findActiveSettingsNav,
  type AdminRole
} from '~/shared/admin/settings-navigation'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const route = useRoute()

const drawerOpen = ref(false)
const drawerRef = ref<HTMLElement | null>(null)
const drawerNavRef = ref<InstanceType<typeof SettingsNav> | null>(null)
let lastFocused: HTMLElement | null = null

const currentRole = computed<AdminRole>(() => {
  const role = authStore.user?.role
  if (role === 'owner' || role === 'admin' || role === 'staff') return role
  return 'staff'
})

const activeNav = computed(() =>
  findActiveSettingsNav(
    filterSettingsNavForRole(SETTINGS_NAV_GROUPS, currentRole.value, authStore.staffPermissions || []),
    { path: route.path, query: route.query as Record<string, string | undefined>, hash: route.hash }
  )
)

const activeGroupLabel = computed(() => (activeNav.value ? t(activeNav.value.group.labelKey) : ''))
const activeItemLabel = computed(() => (activeNav.value ? t(activeNav.value.item.labelKey) : ''))

function openDrawer() {
  lastFocused = document.activeElement as HTMLElement | null
  drawerOpen.value = true
  nextTick(() => drawerNavRef.value?.focusSearch())
}

function closeDrawer() {
  if (!drawerOpen.value) return
  drawerOpen.value = false
  nextTick(() => lastFocused?.focus())
}

// A resize past the breakpoint would otherwise leave an orphaned sheet open
// over the desktop layout.
function handleResize() {
  if (window.innerWidth >= 1024) closeDrawer()
}

onMounted(() => window.addEventListener('resize', handleResize))
onBeforeUnmount(() => window.removeEventListener('resize', handleResize))
watch(() => route.fullPath, closeDrawer)
</script>

<style scoped>
.settings-shell {
  /* Matches the admin <main> padding so the sticky bar can bleed to its edges. */
  --settings-gutter: 20px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 0;
}

@media (min-width: 768px) {
  .settings-shell {
    --settings-gutter: 24px;
  }
}

.settings-shell-content {
  min-width: 0;
}

/* ── Rail (≥1024px) ─────────────────────────────────────────────────── */

.settings-shell-rail {
  display: none;
}

@media (min-width: 1024px) {
  .settings-shell {
    grid-template-columns: 236px minmax(0, 1fr);
    column-gap: 32px;
  }

  .settings-shell-rail {
    display: block;
    position: sticky;
    top: 0;
    max-height: 100vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-block: 2px;
    /* Hairline separating the rail from the content column. */
    padding-inline-end: 4px;
  }

  .settings-shell-bar {
    display: none;
  }
}

@media (min-width: 1360px) {
  .settings-shell {
    grid-template-columns: 264px minmax(0, 1fr);
    column-gap: 40px;
  }
}

/* ── Bar (<1024px) ──────────────────────────────────────────────────── */

.settings-shell-bar {
  position: sticky;
  top: calc(var(--settings-gutter) * -1);
  z-index: 30;
  margin: calc(var(--settings-gutter) * -1);
  margin-block-end: 16px;
  padding: var(--settings-gutter);
  padding-block-end: 12px;
  background: color-mix(in srgb, var(--admin-content-bg) 92%, transparent);
  backdrop-filter: blur(14px);
}

.settings-shell-bar-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 8px 14px;
  font-family: inherit;
  text-align: start;
  background: var(--surface-2);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.settings-shell-bar-trigger:hover {
  border-color: var(--surface-border-hover);
  background: var(--surface-3);
}

.settings-shell-bar-trigger:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.settings-shell-bar-icon {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  color: var(--brand);
}

.settings-shell-bar-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.settings-shell-bar-copy small {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.settings-shell-bar-copy strong {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-shell-bar-chevron {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--text-tertiary);
}

/* ── Drawer ─────────────────────────────────────────────────────────── */

.settings-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  overscroll-behavior: contain;
}

.settings-drawer {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 88dvh;
  background: var(--surface-1);
  border-start-start-radius: 20px;
  border-start-end-radius: 20px;
  border-block-start: 1px solid var(--surface-border);
  box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.42);
}

.settings-drawer-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 16px 12px;
  border-block-end: 1px solid var(--surface-border);
}

.settings-drawer-grip {
  position: absolute;
  top: 8px;
  inset-inline: 0;
  width: 36px;
  height: 4px;
  margin-inline: auto;
  border-radius: 999px;
  background: var(--surface-3);
}

.settings-drawer-title {
  flex: 1;
  font-size: 15px;
  font-weight: 650;
  color: var(--text-primary);
}

.settings-drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--surface-border);
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.settings-drawer-close:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.settings-drawer-close:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.settings-drawer-close :deep(svg) {
  width: 16px;
  height: 16px;
}

.settings-drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 16px calc(20px + env(safe-area-inset-bottom));
}

.settings-drawer-enter-active,
.settings-drawer-leave-active {
  transition: opacity 0.2s ease;
}

.settings-drawer-enter-active .settings-drawer,
.settings-drawer-leave-active .settings-drawer {
  transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1);
}

.settings-drawer-enter-from,
.settings-drawer-leave-to {
  opacity: 0;
}

.settings-drawer-enter-from .settings-drawer,
.settings-drawer-leave-to .settings-drawer {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .settings-drawer-enter-active .settings-drawer,
  .settings-drawer-leave-active .settings-drawer {
    transition: none;
  }
}
</style>
