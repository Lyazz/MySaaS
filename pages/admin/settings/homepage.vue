<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">{{ t('admin.pages.settings.homepage.title') }}</h1>
      <p class="text-slate-600 mt-1">{{ t('admin.pages.settings.homepage.subtitle') }}</p>
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
