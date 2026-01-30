<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Appearance Settings</h1>
      <p class="text-slate-600 mt-1">Customize the look and feel of your storefront.</p>
    </div>

    <AppearanceSettingsForm />
  </div>
</template>

<script setup lang="ts">
import AppearanceSettingsForm from '~/components/admin/AppearanceSettingsForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Appearance Settings'
})
</script>
