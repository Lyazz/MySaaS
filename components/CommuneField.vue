<script setup lang="ts">
import StorefrontCommuneField from '~/components/storefront/CommuneField.vue'

defineProps<{
  modelValue: string
  wilayaCode: string
  placeholder?: string
  selectClass?: string
  inputClass?: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <StorefrontCommuneField
    v-bind="$props"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
