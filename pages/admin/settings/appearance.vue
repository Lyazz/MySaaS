<template>
  <AppearanceSettingsForm />
</template>

<script setup lang="ts">
import AppearanceSettingsForm from '~/components/admin/AppearanceSettingsForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.appearance.metaTitle'
})
</script>
