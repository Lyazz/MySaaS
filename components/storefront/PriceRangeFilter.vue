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

const effectiveMinBound = computed(() => Math.min(props.minBound, props.maxBound))
const effectiveMaxBound = computed(() => Math.max(props.minBound, props.maxBound))

const clamp = (value: number) =>
  Math.min(effectiveMaxBound.value, Math.max(effectiveMinBound.value, value))

const parseNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const isSliding = ref(false)
const draftMin = ref(effectiveMinBound.value)
const draftMax = ref(effectiveMaxBound.value)

const resolveDraftFromModel = () => {
  const nextMin = parseNullableNumber(minPrice.value)
  const nextMax = parseNullableNumber(maxPrice.value)

  const fallbackMin = effectiveMinBound.value
  const fallbackMax = effectiveMaxBound.value

  const boundedMin = nextMin == null ? fallbackMin : clamp(nextMin)
  const boundedMax = nextMax == null ? fallbackMax : clamp(nextMax)

  draftMin.value = Math.min(boundedMin, boundedMax)
  draftMax.value = Math.max(boundedMin, boundedMax)
}

watch(
  [() => minPrice.value, () => maxPrice.value, effectiveMinBound, effectiveMaxBound],
  () => {
    if (isSliding.value) return
    resolveDraftFromModel()
  },
  { immediate: true }
)

const commitDraftToModel = () => {
  minPrice.value = draftMin.value
  maxPrice.value = draftMax.value
}

const setDraftMin = (value: number) => {
  const nextMin = clamp(value)
  draftMin.value = Math.min(nextMin, draftMax.value)
}

const setDraftMax = (value: number) => {
  const nextMax = clamp(value)
  draftMax.value = Math.max(nextMax, draftMin.value)
}

const onMinInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  const parsed = parseNullableNumber(value)

  if (parsed === null) {
    minPrice.value = null
    resolveDraftFromModel()
    return
  }

  setDraftMin(parsed)
  minPrice.value = draftMin.value
}

const onMaxInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  const parsed = parseNullableNumber(value)

  if (parsed === null) {
    maxPrice.value = null
    resolveDraftFromModel()
    return
  }

  setDraftMax(parsed)
  maxPrice.value = draftMax.value
}

const startSliding = () => {
  isSliding.value = true
}

const endSliding = () => {
  isSliding.value = false
  commitDraftToModel()
}

const onMinSliderInput = (event: Event) => {
  startSliding()
  setDraftMin(Number((event.target as HTMLInputElement).value))
}

const onMaxSliderInput = (event: Event) => {
  startSliding()
  setDraftMax(Number((event.target as HTMLInputElement).value))
}

const minInputValue = computed(() => draftMin.value)
const maxInputValue = computed(() => draftMax.value)

const sliderTrackStyle = computed(() => {
  const range = effectiveMaxBound.value - effectiveMinBound.value || 1
  const left = ((draftMin.value - effectiveMinBound.value) / range) * 100
  const right = ((draftMax.value - effectiveMinBound.value) / range) * 100

  return {
    left: `${left}%`,
    width: `${Math.max(right - left, 0)}%`,
  }
})

const minSliderClass = computed(() =>
  draftMin.value >= draftMax.value - props.step ? 'z-30' : 'z-20'
)

const maxSliderClass = computed(() =>
  draftMax.value <= draftMin.value + props.step ? 'z-30' : 'z-20'
)
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 gap-2">
      <label class="relative w-full min-w-0">
        <span class="sr-only">{{ minPlaceholder }}</span>
        <input
          :value="minInputValue"
          type="number"
          inputmode="numeric"
          :placeholder="minPlaceholder"
          class="price-range-input w-full border border-slate-200 bg-white/80 rounded-lg py-2 px-3 pe-10 text-sm text-slate-700 focus:ring-2 focus:ring-brand focus:border-brand outline-none"
          @input="onMinInput"
        >
        <span class="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold leading-none text-slate-500 rtl:right-auto rtl:left-2">
          {{ currency }}
        </span>
      </label>

      <label class="relative w-full min-w-0">
        <span class="sr-only">{{ maxPlaceholder }}</span>
        <input
          :value="maxInputValue"
          type="number"
          inputmode="numeric"
          :placeholder="maxPlaceholder"
          class="price-range-input w-full border border-slate-200 bg-white/80 rounded-lg py-2 px-3 pe-10 text-sm text-slate-700 focus:ring-2 focus:ring-brand focus:border-brand outline-none"
          @input="onMaxInput"
        >
        <span class="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold leading-none text-slate-500 rtl:right-auto rtl:left-2">
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

      <div class="relative h-6">
        <input
          :value="draftMin"
          type="range"
          :min="effectiveMinBound"
          :max="effectiveMaxBound"
          :step="step"
          :class="['price-range-slider absolute inset-0 h-6 w-full bg-transparent', minSliderClass]"
          aria-label="Minimum price slider"
          @input="onMinSliderInput"
          @pointerdown="startSliding"
          @pointerup="endSliding"
          @pointercancel="endSliding"
          @touchstart.passive="startSliding"
          @touchend="endSliding"
          @touchcancel="endSliding"
          @change="endSliding"
        >
        <input
          :value="draftMax"
          type="range"
          :min="effectiveMinBound"
          :max="effectiveMaxBound"
          :step="step"
          :class="['price-range-slider absolute inset-0 h-6 w-full bg-transparent', maxSliderClass]"
          aria-label="Maximum price slider"
          @input="onMaxSliderInput"
          @pointerdown="startSliding"
          @pointerup="endSliding"
          @pointercancel="endSliding"
          @touchstart.passive="startSliding"
          @touchend="endSliding"
          @touchcancel="endSliding"
          @change="endSliding"
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
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
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
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
  border: 2px solid var(--brand);
  background: #ffffff;
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.25);
  cursor: grab;
  margin-top: -0.375rem;
  transition: box-shadow 0.15s ease;
}

.price-range-slider::-webkit-slider-thumb:active {
  cursor: grabbing;
  box-shadow: 0 3px 8px rgb(15 23 42 / 0.35);
}

.price-range-slider::-moz-range-track {
  background: transparent;
  height: 0.375rem;
}

.price-range-slider::-moz-range-thumb {
  pointer-events: auto;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
  border: 2px solid var(--brand);
  background: #ffffff;
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.25);
  cursor: grab;
  transition: box-shadow 0.15s ease;
}

.price-range-slider::-moz-range-thumb:active {
  cursor: grabbing;
  box-shadow: 0 3px 8px rgb(15 23 42 / 0.35);
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
