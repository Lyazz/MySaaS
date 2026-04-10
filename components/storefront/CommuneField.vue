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

watch(
  communes,
  (next) => {
    if (props.modelValue) return
    const first = next?.[0]
    if (first?.id != null) emit('update:modelValue', String(first.id))
  },
  { immediate: true }
)
</script>

<template>
  <div class="space-y-1">
    <select
      v-model="value"
      :class="selectClass || inputClass"
      :disabled="!wilayaCode || loading || communes.length === 0"
    >
      <option
        value=""
        disabled
      >
        {{
          !wilayaCode
            ? (placeholder || 'Select commune')
            : loading
              ? 'Loading communes…'
              : error
                ? 'Communes unavailable'
                : (placeholder || 'Select commune')
        }}
      </option>
      <option
        v-for="c in communes"
        :key="c.id"
        :value="String(c.id)"
      >
        {{ c.id }} - {{ c.name }}
      </option>
    </select>

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
