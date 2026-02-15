<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

useSeoMeta({
  title: computed(() => t('marketing.contact.seo.title')),
  description: computed(() => t('marketing.contact.seo.description'))
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-12">
    <h1 class="text-4xl font-sans font-bold text-slate-900 mb-4">
      {{ t('marketing.contact.title') }}
    </h1>
    <p class="text-slate-600 leading-relaxed">
      {{ t('marketing.contact.email.prefix') }}
      <a
        class="text-teal-600 hover:underline"
        href="mailto:support@swekly.com"
      >support@swekly.com</a>{{ t('marketing.contact.email.suffix') }}
    </p>
  </div>
</template>
