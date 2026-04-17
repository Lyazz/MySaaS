<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    minBound?: number
    maxBound?: number
    step?: number
    currency?: string
    minPlaceholder?: string
    maxPlaceholder?: string
  }>(),
  {
    minBound: 0,
    maxBound: 200000,
    step: 100,
    currency: 'DZD',
    minPlaceholder: 'Min price',
    maxPlaceholder: 'Max price',
  }
)

const minPrice = defineModel<number | null>('minPrice', { default: null })
const maxPrice = defineModel<number | null>('maxPrice', { default: null })

const clamp = (value: number) =>
  Math.min(props.maxBound, Math.max(props.minBound, value))

const parseNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizedMin = computed(() => {
  const parsed = parseNullableNumber(minPrice.value)
  if (parsed === null) return null
  const clamped = clamp(parsed)
  const upper = parseNullableNumber(maxPrice.value)
  return upper === null ? clamped : Math.min(clamped, clamp(upper))
})

const normalizedMax = computed(() => {
  const parsed = parseNullableNumber(maxPrice.value)
  if (parsed === null) return null
  const clamped = clamp(parsed)
  const lower = parseNullableNumber(minPrice.value)
  return lower === null ? clamped : Math.max(clamped, clamp(lower))
})

const minInputValue = computed<string | number>({
  get: () => normalizedMin.value ?? '',
  set: (value) => {
    const parsed = parseNullableNumber(value)
    if (parsed === null) {
      minPrice.value = null
      return
    }

    const upper = normalizedMax.value ?? props.maxBound
    minPrice.value = Math.min(clamp(parsed), upper)
  },
})

const maxInputValue = computed<string | number>({
  get: () => normalizedMax.value ?? '',
  set: (value) => {
    const parsed = parseNullableNumber(value)
    if (parsed === null) {
      maxPrice.value = null
      return
    }

    const lower = normalizedMin.value ?? props.minBound
    maxPrice.value = Math.max(clamp(parsed), lower)
  },
})

const sliderMinValue = computed<number>({
  get: () => normalizedMin.value ?? props.minBound,
  set: (value) => {
    const upper = normalizedMax.value ?? props.maxBound
    minPrice.value = Math.min(clamp(Number(value)), upper)
  },
})

const sliderMaxValue = computed<number>({
  get: () => normalizedMax.value ?? props.maxBound,
  set: (value) => {
    const lower = normalizedMin.value ?? props.minBound
    maxPrice.value = Math.max(clamp(Number(value)), lower)
  },
})

const sliderTrackStyle = computed(() => {
  const range = props.maxBound - props.minBound || 1
  const left = ((sliderMinValue.value - props.minBound) / range) * 100
  const right = ((sliderMaxValue.value - props.minBound) / range) * 100

  return {
    left: `${left}%`,
    width: `${Math.max(right - left, 0)}%`,
  }
})

const minSliderClass = computed(() =>
  sliderMinValue.value >= sliderMaxValue.value - props.step ? 'z-30' : 'z-20'
)

const maxSliderClass = computed(() =>
  sliderMaxValue.value <= sliderMinValue.value + props.step ? 'z-30' : 'z-20'
)
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 gap-2">
      <label class="relative w-full min-w-0">
        <span class="sr-only">{{ minPlaceholder }}</span>
        <input
          v-model="minInputValue"
          type="number"
          inputmode="numeric"
          :placeholder="minPlaceholder"
          class="price-range-input w-full border border-slate-200 bg-white/80 rounded-lg py-2 px-3 pr-10 text-sm text-slate-700 focus:ring-2 focus:ring-brand focus:border-brand outline-none"
        >
        <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold leading-none text-slate-500 rtl:right-auto rtl:left-2">
          {{ currency }}
        </span>
      </label>

      <label class="relative w-full min-w-0">
        <span class="sr-only">{{ maxPlaceholder }}</span>
        <input
          v-model="maxInputValue"
          type="number"
          inputmode="numeric"
          :placeholder="maxPlaceholder"
          class="price-range-input w-full border border-slate-200 bg-white/80 rounded-lg py-2 px-3 pr-10 text-sm text-slate-700 focus:ring-2 focus:ring-brand focus:border-brand outline-none"
        >
        <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold leading-none text-slate-500 rtl:right-auto rtl:left-2">
          {{ currency }}
        </span>
      </label>
    </div>

    <div class="space-y-3">
      <div class="relative h-1.5 rounded-full bg-slate-200/80">
        <div
          class="absolute top-0 h-full rounded-full bg-brand"
          :style="sliderTrackStyle"
        />
      </div>

      <div class="relative h-5">
        <input
          v-model.number="sliderMinValue"
          type="range"
          :min="minBound"
          :max="maxBound"
          :step="step"
          :class="['price-range-slider absolute inset-0 h-5 w-full bg-transparent', minSliderClass]"
          aria-label="Minimum price slider"
        >
        <input
          v-model.number="sliderMaxValue"
          type="range"
          :min="minBound"
          :max="maxBound"
          :step="step"
          :class="['price-range-slider absolute inset-0 h-5 w-full bg-transparent', maxSliderClass]"
          aria-label="Maximum price slider"
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.price-range-slider {
  -webkit-appearance: none;
  appearance: none;
  pointer-events: none;
}

.price-range-slider::-webkit-slider-runnable-track {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  height: 0.375rem;
}

.price-range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  pointer-events: auto;
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  border: 2px solid var(--brand);
  background: #ffffff;
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.25);
  cursor: grab;
  margin-top: -0.31rem;
}

.price-range-slider::-webkit-slider-thumb:active {
  cursor: grabbing;
}

.price-range-slider::-moz-range-track {
  background: transparent;
  height: 0.375rem;
}

.price-range-slider::-moz-range-thumb {
  pointer-events: auto;
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  border: 2px solid var(--brand);
  background: #ffffff;
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.25);
  cursor: grab;
}

.price-range-slider::-moz-range-thumb:active {
  cursor: grabbing;
}

.price-range-input {
  appearance: textfield;
}

.price-range-input::-webkit-outer-spin-button,
.price-range-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
