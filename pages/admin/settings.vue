<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Store Appearance Settings</h1>
      <p class="text-slate-600 mt-1">Configure how your store looks and which commerce features are enabled.</p>
    </div>

    <div class="space-y-8">
      <AppearanceSettingsForm />
      <FunctionalSettingsForm />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppearanceSettingsForm from '~/components/admin/AppearanceSettingsForm.vue'
import FunctionalSettingsForm from '~/components/admin/FunctionalSettingsForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Store Appearance Settings'
})
</script>
