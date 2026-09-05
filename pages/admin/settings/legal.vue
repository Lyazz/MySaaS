<template>
  <SettingsShell>
    <LegalPagesSettingsForm />
  </SettingsShell>
</template>

<script setup lang="ts">
import LegalPagesSettingsForm from '~/components/admin/LegalPagesSettingsForm.vue'
import SettingsShell from '~/components/admin/settings/SettingsShell.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Legal Pages'
})
</script>
