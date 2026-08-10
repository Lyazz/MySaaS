<template>
  <SettingsShell>
    <DomainSettingsForm />
  </SettingsShell>
</template>

<script setup lang="ts">
import DomainSettingsForm from '~/components/admin/DomainSettingsForm.vue'
import SettingsShell from '~/components/admin/settings/SettingsShell.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.domains.metaTitle'
})
</script>
