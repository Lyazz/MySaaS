<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Store Settings</h1>
      <p class="text-slate-600 mt-1">Manage your store's configuration and appearance.</p>
    </div>

    <div class="max-w-4xl">
      <StoreSettingsForm />
    </div>
  </div>
</template>

<script setup lang="ts">
import StoreSettingsForm from '~/components/admin/StoreSettingsForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Store Settings'
})
</script>
