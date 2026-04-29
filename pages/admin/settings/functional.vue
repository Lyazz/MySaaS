<template>
  <FunctionalSettingsForm />
</template>

<script setup lang="ts">
import FunctionalSettingsForm from '~/components/admin/FunctionalSettingsForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.functional.metaTitle'
})
</script>
