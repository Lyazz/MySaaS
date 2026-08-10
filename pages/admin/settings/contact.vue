<template>
  <SettingsShell>
    <ContactInfosForm />
  </SettingsShell>
</template>

<script setup lang="ts">
import ContactInfosForm from '~/components/admin/ContactInfosForm.vue'
import SettingsShell from '~/components/admin/settings/SettingsShell.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.contact.metaTitle'
})
</script>
