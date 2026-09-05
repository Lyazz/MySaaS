<script setup lang="ts">
import { computed } from 'vue'
import { DZ_WILAYAS } from '~/shared/geo/dz'
import SearchableSelect from './SearchableSelect.vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  selectClass?: string
  inputClass?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const value = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v)
})

const wilayaOptions = computed(() => {
  return DZ_WILAYAS.map(w => ({
    value: w.code,
    label: `${w.code} - ${w.name}`
  }))
})
</script>

<template>
  <SearchableSelect
    v-model="value"
    :options="wilayaOptions"
    :input-class="selectClass || inputClass"
    :placeholder="placeholder || 'Select wilaya'"
  />
</template>
