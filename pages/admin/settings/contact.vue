<template>
  <ContactInfosForm />
</template>

<script setup lang="ts">
import ContactInfosForm from '~/components/admin/ContactInfosForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.contact.metaTitle'
})
</script>
