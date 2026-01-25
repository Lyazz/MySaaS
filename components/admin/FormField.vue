<template>
  <div class="mb-4">
    <label 
      v-if="label" 
      :for="inputId" 
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <slot :inputId="inputId" />
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    <p v-if="hint && !error" class="mt-1 text-sm text-gray-500">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

defineProps<Props>()

const inputId = `field-${Math.random().toString(36).substr(2, 9)}`
</script>
