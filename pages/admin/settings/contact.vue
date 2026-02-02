<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">Contact Info</h1>
      <p class="text-slate-600 mt-1">Manage the contact details shown in your storefront footer.</p>
    </div>

    <ContactInfosForm />
  </div>
</template>

<script setup lang="ts">
import ContactInfosForm from '~/components/admin/ContactInfosForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Contact Info'
})
</script>

