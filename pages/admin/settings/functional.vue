<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Functional Settings</h1>
      <p class="text-slate-600 mt-1">Manage core functionality and features of your store.</p>
    </div>

    <FunctionalSettingsForm />
  </div>
</template>

<script setup lang="ts">
import FunctionalSettingsForm from '~/components/admin/FunctionalSettingsForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Functional Settings'
})
</script>
