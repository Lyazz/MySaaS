<template>
  <DomainSettingsForm />
</template>

<script setup lang="ts">
import DomainSettingsForm from '~/components/admin/DomainSettingsForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.domains.metaTitle'
})
</script>
