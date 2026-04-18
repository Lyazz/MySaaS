<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold" style="color: var(--text-primary)">{{ t('admin.pages.settings.functional.title') }}</h1>
      <p class="mt-1" style="color: var(--text-secondary)">{{ t('admin.pages.settings.functional.subtitle') }}</p>
    </div>

    <FunctionalSettingsForm />
  </div>
</template>

<script setup lang="ts">
import FunctionalSettingsForm from '~/components/admin/FunctionalSettingsForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.functional.metaTitle'
})

const { t } = useI18n({ useScope: 'global' })
</script>
