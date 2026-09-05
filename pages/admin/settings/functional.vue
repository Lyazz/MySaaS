<template>
  <SettingsShell>
    <FunctionalSettingsForm :section="section" />
  </SettingsShell>
</template>

<script setup lang="ts">
import FunctionalSettingsForm from '~/components/admin/FunctionalSettingsForm.vue'
import SettingsShell from '~/components/admin/settings/SettingsShell.vue'

const route = useRoute()
const section = computed(() => (route.query.section as string) || 'checkout')

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.settings.functional.metaTitle'
})
</script>
