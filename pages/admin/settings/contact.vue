<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">{{ t('admin.pages.settings.contact.title') }}</h1>
      <p class="text-slate-600 mt-1">{{ t('admin.pages.settings.contact.subtitle') }}</p>
    </div>

    <ContactInfosForm />
  </div>
</template>

<script setup lang="ts">
import ContactInfosForm from '~/components/admin/ContactInfosForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.contact.metaTitle'
})

const { t } = useI18n({ useScope: 'global' })
</script>
