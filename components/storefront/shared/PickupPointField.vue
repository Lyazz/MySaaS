<template>
  <div
    v-if="isPickupSelected || loading"
    class="space-y-2"
  >
    <label
      v-if="label"
      class="block text-sm font-semibold"
      :class="labelClass"
    >
      {{ label }}
    </label>

    <div
      v-if="loading"
      class="flex items-center gap-2 px-4 py-3 text-sm"
      :class="frameClass"
    >
      <Icon
        name="lucide:loader-2"
        class="w-4 h-4 animate-spin shrink-0"
      />
      <span>{{ loadingLabel }}</span>
    </div>

    <template v-else>
      <!-- One place to collect from: nothing to decide, just say where. -->
      <div
        v-if="points.length === 1"
        class="flex items-start gap-3 px-4 py-3 text-sm"
        :class="frameClass"
      >
        <Icon
          name="lucide:map-pin"
          class="w-4 h-4 shrink-0 mt-0.5"
        />
        <span class="min-w-0">
          <span class="block font-semibold">{{ points[0].name }}</span>
          <span
            v-if="points[0].address"
            class="block text-xs opacity-70 mt-0.5"
          >{{ points[0].address }}</span>
        </span>
      </div>

      <!-- Several: the shopper chooses. The address is what makes an agency
           recognisable, so it rides along inside the option. -->
      <select
        v-else-if="points.length > 1"
        :value="modelValue"
        class="w-full px-4 py-3 text-sm"
        :class="controlClass"
        @change="onChange"
      >
        <option
          value=""
          disabled
        >
          {{ placeholder || label }}
        </option>
        <option
          v-for="point in points"
          :key="point.id"
          :value="point.name"
        >
          {{ point.address ? `${point.name} — ${point.address}` : point.name }}
        </option>
      </select>

      <div
        v-else
        class="flex items-center gap-2 px-4 py-3 text-sm"
        :class="frameClass"
      >
        <Icon
          name="lucide:building-2"
          class="w-4 h-4 shrink-0"
        />
        <span>{{ emptyLabel }}</span>
      </div>
    </template>

    <p
      v-if="error"
      class="text-xs"
      :class="errorClass"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { PickupPoint } from '~/composables/usePickupPoints'

withDefaults(
  defineProps<{
    modelValue: string
    points: PickupPoint[]
    loading: boolean
    error: string
    isPickupSelected: boolean
    label?: string
    placeholder?: string
    loadingLabel?: string
    emptyLabel?: string
    /** Each theme passes its own control styling so the field still reads as its own. */
    controlClass?: string
    frameClass?: string
    labelClass?: string
    errorClass?: string
  }>(),
  {
    label: '',
    placeholder: '',
    loadingLabel: '…',
    emptyLabel: '—',
    controlClass: 'rounded-xl border border-slate-200 bg-white text-slate-900',
    frameClass: 'rounded-xl border border-slate-200 bg-slate-50 text-slate-600',
    labelClass: 'text-slate-700',
    errorClass: 'text-amber-700'
  }
)

const emit = defineEmits<{ 'update:modelValue': [string]; change: [] }>()

function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
  emit('change')
}
</script>
