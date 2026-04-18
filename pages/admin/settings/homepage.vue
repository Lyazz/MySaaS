<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold" style="color: var(--text-primary)">{{ t('admin.pages.settings.homepage.title') }}</h1>
      <p class="mt-1" style="color: var(--text-secondary)">{{ t('admin.pages.settings.homepage.subtitle') }}</p>
    </div>

    <HomepageSettingsForm />
  </div>
</template>

<script setup lang="ts">
import HomepageSettingsForm from '~/components/admin/HomepageSettingsForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.homepage.metaTitle'
})

const { t } = useI18n({ useScope: 'global' })
</script>
