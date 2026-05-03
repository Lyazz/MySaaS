<template>
  <LegalPagesSettingsForm />
</template>

<script setup lang="ts">
import LegalPagesSettingsForm from '~/components/admin/LegalPagesSettingsForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Legal Pages'
})
</script>
