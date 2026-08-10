<template>
  <SettingsShell>
    <HomepageSettingsForm />
  </SettingsShell>
</template>

<script setup lang="ts">
import HomepageSettingsForm from '~/components/admin/HomepageSettingsForm.vue'
import SettingsShell from '~/components/admin/settings/SettingsShell.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.homepage.metaTitle'
})
</script>
