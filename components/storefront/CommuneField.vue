<script setup lang="ts">
import { computed, watch } from 'vue'
import { useMaystroCommunes } from '~/composables/useMaystroCommunes'

const props = defineProps<{
  modelValue: string
  wilayaCode: string
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

const { communes, loading, error } = useMaystroCommunes(() => props.wilayaCode)

watch(
  () => props.wilayaCode,
  () => {
    emit('update:modelValue', '')
  }
)

const communeOptions = computed(() => {
  if (!communes.value) return []
  return communes.value.map(c => ({
    value: String(c.id),
    label: `${c.id} - ${c.name}`
  }))
})
</script>

<template>
  <div class="space-y-1">
    <SearchableSelect
      v-model="value"
      :options="communeOptions"
      :input-class="selectClass || inputClass"
      :disabled="!wilayaCode || loading || communes.length === 0"
      :placeholder="!wilayaCode
        ? (placeholder || 'Select commune')
        : loading
          ? 'Loading communes…'
          : error
            ? 'Communes unavailable'
            : (placeholder || 'Select commune')"
    />

    <p
      v-if="error"
      class="text-xs text-amber-700"
    >
      {{ error }}
    </p>
    <p
      v-else-if="loading"
      class="text-xs text-slate-500"
    >
      Loading communes…
    </p>
  </div>
</template>
