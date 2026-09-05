<template>
  <div />
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import {
  SETTINGS_NAV_GROUPS,
  filterSettingsNavForRole,
  type AdminRole
} from '~/shared/admin/settings-navigation'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.index.metaTitle'
})

const authStore = useAuthStore()

const currentRole: AdminRole = (() => {
  const role = authStore.user?.role
  if (role === 'owner' || role === 'admin' || role === 'staff') return role
  return 'staff'
})()

const visibleGroups = filterSettingsNavForRole(SETTINGS_NAV_GROUPS, currentRole, authStore.staffPermissions || [])
const target = visibleGroups[0]?.items[0]?.to || '/admin/settings/appearance'

await navigateTo(target, { replace: true })
</script>
