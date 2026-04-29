<template>
  <HomepageSettingsForm />
</template>

<script setup lang="ts">
import HomepageSettingsForm from '~/components/admin/HomepageSettingsForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.homepage.metaTitle'
})
</script>
