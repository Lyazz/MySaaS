<template>
  <div
    class="settings-nav"
    :class="`settings-nav-${variant}`"
  >
    <div class="settings-nav-search">
      <Icon
        name="lucide:search"
        class="settings-nav-search-icon"
      />
      <input
        ref="searchInput"
        v-model="query"
        type="search"
        class="settings-nav-search-input"
        :placeholder="t('admin.settingsNav.searchPlaceholder')"
        :aria-label="t('admin.settingsNav.searchPlaceholder')"
        role="combobox"
        :aria-controls="resultsId"
        :aria-expanded="isSearching"
        @keydown.down.prevent="moveHighlight(1)"
        @keydown.up.prevent="moveHighlight(-1)"
        @keydown.enter.prevent="openHighlighted"
        @keydown.esc.prevent="clearSearch"
      >
      <button
        v-if="query"
        type="button"
        class="settings-nav-search-clear"
        :aria-label="t('admin.common.clear')"
        @click="clearSearch"
      >
        <Icon name="lucide:x" />
      </button>
    </div>

    <!-- Results replace the tree while searching: one flat ranked list. -->
    <div
      v-if="isSearching"
      :id="resultsId"
      class="settings-nav-results"
      role="listbox"
    >
      <NuxtLink
        v-for="(entry, index) in results"
        :id="resultId(index)"
        :key="entry.key"
        :to="entry.to"
        class="settings-nav-item settings-nav-result"
        :class="{ 'is-highlighted': index === highlightedIndex }"
        role="option"
        :aria-selected="index === highlightedIndex"
        @click="onNavigate"
        @mousemove="highlightedIndex = index"
      >
        <Icon
          :name="entry.icon"
          class="settings-nav-item-icon"
        />
        <span class="settings-nav-item-label">
          {{ entry.label }}
          <small class="settings-nav-result-group">{{ entry.groupLabel }}</small>
        </span>
      </NuxtLink>

      <p
        v-if="results.length === 0"
        class="settings-nav-empty"
      >
        {{ t('admin.settingsNav.noResults', { query }) }}
      </p>
    </div>

    <nav
      v-else
      class="settings-nav-tree"
      :aria-label="t('admin.settingsNav.ariaLabel')"
    >
      <div
        v-for="group in visibleGroups"
        :key="group.id"
        class="settings-nav-group"
        :class="{ 'is-expanded': expandedGroupId === group.id }"
      >
        <button
          :id="groupToggleId(group.id)"
          type="button"
          class="settings-nav-group-toggle"
          :aria-expanded="expandedGroupId === group.id"
          :aria-controls="groupPanelId(group.id)"
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

        <div
          :id="groupPanelId(group.id)"
          class="settings-nav-group-collapse"
          role="region"
          :aria-labelledby="groupToggleId(group.id)"
        >
          <div class="settings-nav-group-items">
            <NuxtLink
              v-for="item in group.items"
              :key="item.key"
              :to="item.to"
              class="settings-nav-item"
              :class="{ 'is-active': isActive(item) }"
              :aria-current="isActive(item) ? 'page' : undefined"
              :tabindex="expandedGroupId === group.id ? undefined : -1"
              @click="onNavigate"
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
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import {
  SETTINGS_NAV_GROUPS,
  filterSettingsNavForRole,
  findActiveSettingsNav,
  isSettingsNavItemActive,
  matchSettingsEntries,
  parseSettingsNavTarget,
  type AdminRole,
  type SettingsNavItem,
  type SettingsSearchEntry
} from '~/shared/admin/settings-navigation'

withDefaults(defineProps<{ variant?: 'sidebar' | 'drawer' }>(), {
  variant: 'sidebar'
})

const emit = defineEmits<{ navigate: [] }>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// Scopes every id to this instance: the sidebar rail and the mobile drawer
// each render a SettingsNav, and duplicate ids break the aria wiring.
const uid = useId()
const resultsId = `settings-nav-results-${uid}`
const resultId = (index: number) => `settings-nav-result-${uid}-${index}`
const groupToggleId = (groupId: string) => `settings-nav-group-${uid}-${groupId}`
const groupPanelId = (groupId: string) => `settings-nav-panel-${uid}-${groupId}`

const searchInput = ref<HTMLInputElement | null>(null)
const query = ref('')
const highlightedIndex = ref(0)

const currentRole = computed<AdminRole>(() => {
  const role = authStore.user?.role
  if (role === 'owner' || role === 'admin' || role === 'staff') return role
  return 'staff'
})

const visibleGroups = computed(() =>
  filterSettingsNavForRole(SETTINGS_NAV_GROUPS, currentRole.value, authStore.staffPermissions || [])
)

const location = computed(() => ({
  path: route.path,
  query: route.query as Record<string, string | undefined>,
  hash: route.hash
}))

function isActive(item: SettingsNavItem) {
  return isSettingsNavItemActive(item, location.value)
}

const searchEntries = computed<SettingsSearchEntry[]>(() =>
  visibleGroups.value.flatMap((group) =>
    group.items.map((item) => ({
      key: item.key,
      to: item.to,
      icon: item.icon,
      groupId: group.id,
      label: t(item.labelKey),
      groupLabel: t(group.labelKey),
      // The English key and URL segment stay searchable in every locale, so
      // "domains" finds النطاقات for someone who knows the product in English.
      keywords: [item.key, parseSettingsNavTarget(item.to).path.split('/').pop() || '']
    }))
  )
)

const isSearching = computed(() => query.value.trim().length > 0)
const results = computed(() => matchSettingsEntries(searchEntries.value, query.value))

watch(results, () => { highlightedIndex.value = 0 })

function moveHighlight(delta: number) {
  if (!results.value.length) return
  const next = highlightedIndex.value + delta
  highlightedIndex.value = (next + results.value.length) % results.value.length
  nextTick(() => {
    document.getElementById(resultId(highlightedIndex.value))?.scrollIntoView({ block: 'nearest' })
  })
}

function openHighlighted() {
  const entry = results.value[highlightedIndex.value]
  if (!entry) return
  clearSearch()
  // router.push, not navigateTo: this fires from a DOM listener inside a
  // teleported drawer, where the Nuxt app context is not guaranteed.
  router.push(entry.to)
  emit('navigate')
}

function clearSearch() {
  query.value = ''
  highlightedIndex.value = 0
}

function onNavigate() {
  clearSearch()
  emit('navigate')
}

// undefined = "follow the current route"; a group id = the user pinned it open
// by hand (e.g. to browse without navigating). Any navigation clears the pin
// so the sidebar always snaps back to reflecting where you actually are.
const manualGroupId = ref<string | null | undefined>(undefined)

const expandedGroupId = computed(() => {
  if (manualGroupId.value !== undefined) return manualGroupId.value
  return findActiveSettingsNav(visibleGroups.value, location.value)?.group.id
    ?? visibleGroups.value[0]?.id
    ?? null
})

function toggleGroup(id: string) {
  manualGroupId.value = expandedGroupId.value === id ? null : id
}

watch(() => route.fullPath, () => { manualGroupId.value = undefined })

function focusSearch() {
  searchInput.value?.focus()
}

defineExpose({ focusSearch })
</script>

<style scoped>
.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

/* ── Search ─────────────────────────────────────────────────────────── */

.settings-nav-search {
  position: relative;
  display: flex;
  align-items: center;
  margin-block-end: 10px;
}

.settings-nav-search-icon {
  position: absolute;
  inset-inline-start: 11px;
  width: 14px;
  height: 14px;
  color: var(--text-muted);
  pointer-events: none;
}

.settings-nav-search-input {
  width: 100%;
  padding: 9px 12px;
  padding-inline-start: 33px;
  font-family: inherit;
  font-size: 13px;
  border-radius: 10px;
  border: 1px solid var(--surface-border);
  background: var(--surface-2);
  color: var(--text-primary);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  appearance: none;
}

.settings-nav-search-input::-webkit-search-cancel-button {
  display: none;
}

.settings-nav-search-input::placeholder {
  color: var(--text-muted);
}

.settings-nav-search-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(var(--brand-rgb) / 0.16);
}

.settings-nav-search-clear {
  position: absolute;
  inset-inline-end: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
}

.settings-nav-search-clear:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.settings-nav-search-clear :deep(svg) {
  width: 13px;
  height: 13px;
}

/* ── Results ────────────────────────────────────────────────────────── */

.settings-nav-results {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: min(52vh, 420px);
  overflow-y: auto;
}

.settings-nav-result .settings-nav-item-label {
  display: flex;
  flex-direction: column;
  gap: 1px;
  white-space: normal;
}

.settings-nav-result-group {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--text-tertiary);
}

.settings-nav-result.is-highlighted {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.settings-nav-empty {
  padding: 16px 12px;
  font-size: 12.5px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

/* ── Tree ───────────────────────────────────────────────────────────── */

.settings-nav-group {
  border-block-start: 1px solid var(--surface-border);
}

.settings-nav-group:first-child {
  border-block-start: none;
}

.settings-nav-group-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 13px 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: start;
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
  color: var(--text-tertiary);
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
  color: var(--text-tertiary);
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
  /* `visibility` keeps collapsed links out of the a11y tree and stops the
     1px sliver that `overflow: hidden` alone leaves behind mid-animation. */
  overflow: hidden;
  visibility: hidden;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-block-end: 13px;
}

.settings-nav-group.is-expanded .settings-nav-group-items {
  visibility: visible;
}

/* ── Items ──────────────────────────────────────────────────────────── */

.settings-nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  padding-inline-start: 18px;
  min-height: 40px;
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
  inset-inline-start: 0;
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
  color: var(--text-tertiary);
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
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* ── Drawer variant ─────────────────────────────────────────────────── */

.settings-nav-drawer .settings-nav-item {
  min-height: 44px;
  font-size: 14.5px;
}

.settings-nav-drawer .settings-nav-group-toggle {
  padding-block: 15px;
}

.settings-nav-drawer .settings-nav-results {
  max-height: none;
}
</style>
