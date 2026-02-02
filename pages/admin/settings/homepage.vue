<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Homepage Settings</h1>
      <p class="text-slate-600 mt-1">Manage your storefront homepage sections and carousel.</p>
    </div>

    <HomepageSettingsForm />
  </div>
</template>

<script setup lang="ts">
import HomepageSettingsForm from '~/components/admin/HomepageSettingsForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Homepage Settings'
})
</script>

