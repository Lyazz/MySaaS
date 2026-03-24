<template>
  <div>
    <!-- Title handled by form component -->

    <AppearanceSettingsForm />
  </div>
</template>

<script setup lang="ts">
import AppearanceSettingsForm from '~/components/admin/AppearanceSettingsForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.appearance.metaTitle'
})

const { t } = useI18n({ useScope: 'global' })
</script>
