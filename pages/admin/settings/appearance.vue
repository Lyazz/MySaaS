<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">{{ t('admin.pages.settings.appearance.title') }}</h1>
      <p class="text-slate-600 mt-1">{{ t('admin.pages.settings.appearance.subtitle') }}</p>
    </div>

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
