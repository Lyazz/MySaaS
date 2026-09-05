<template>
  <SettingsShell>
    <AppearanceSettingsForm />
  </SettingsShell>
</template>

<script setup lang="ts">
import AppearanceSettingsForm from '~/components/admin/AppearanceSettingsForm.vue'
import SettingsShell from '~/components/admin/settings/SettingsShell.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.appearance.metaTitle'
})

const { autoStartIfNeeded } = useTour()
onMounted(() => autoStartIfNeeded('settings'))
</script>
