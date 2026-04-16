<script setup lang="ts">
import { getOptionValueState, type OptionValueState, type SelectedOptions } from '../variant-ux'

const props = defineProps<{
  product: any
  currentPrice: number
  selectedOptions: SelectedOptions
}>()

const emit = defineEmits(['update:selectedOptions'])
const { format: formatPrice } = useCurrency()

const setOption = (optionId: string, valueId: string) => {
  emit('update:selectedOptions', { ...props.selectedOptions, [optionId]: valueId })
}

const optionValueState = (optionId: string, valueId: string): OptionValueState => {
  if (!props.product?.variants || props.product.variants.length === 0) return 'available'
  return getOptionValueState({ product: props.product, selectedOptions: props.selectedOptions, optionId, valueId })
}

const isOptionValueUnavailable = (optionId: string, valueId: string): boolean =>
  optionValueState(optionId, valueId) === 'unavailable'

const optionValueSuffix = (optionId: string, valueId: string): string => {
  const state = optionValueState(optionId, valueId)
  if (state === 'out_of_stock') return '(Rupture)'
  if (state === 'unavailable') return '(Indisponible)'
  return ''
}

const setOptionIfAllowed = (optionId: string, valueId: string) => {
  if (!isOptionValueUnavailable(optionId, valueId)) setOption(optionId, valueId)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Title block -->
    <div>
      <p class="text-[10px] tracking-[0.25em] uppercase text-[#B0A090] mb-3">
        {{ product?.category?.title || 'Maison & Déco' }}
      </p>
      <h1 class="font-maison-serif text-3xl md:text-4xl font-semibold text-[#2C2420] leading-tight mb-4">
        {{ product?.title }}
      </h1>

      <StorefrontSharedCountdownTimer
        v-if="product?.showCountdown && product?.promotionEndDate"
        :end-date="product.promotionEndDate"
        theme="danger"
        show-icon
        class="mb-4"
      />

      <div class="flex items-center gap-3">
        <span class="text-2xl font-bold text-[#C17B4E]">
          {{ formatPrice(currentPrice) }}
        </span>
        <span v-if="product?.compareAtPrice" class="text-lg text-[#B0A090] line-through">
          {{ formatPrice(product.compareAtPrice) }}
        </span>
      </div>
    </div>

    <!-- Options -->
    <div
      v-if="product?.options && product.options.length > 0"
      class="space-y-5 pt-5 border-t border-[#E8E0D4]"
    >
      <div v-for="option in product.options" :key="option.id">
        <label class="block text-xs tracking-[0.15em] uppercase text-[#7A6558] mb-3">{{ option.name }}</label>

        <!-- Dropdown -->
        <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
          <select
            :value="selectedOptions[option.id]"
            class="block w-full border border-[#E8E0D4] bg-[#FAF8F5] px-4 py-3 text-sm text-[#2C2420] focus:border-[#C17B4E] outline-none appearance-none cursor-pointer"
            @change="setOption(option.id, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="value in option.values" :key="value.id" :value="value.id" :disabled="isOptionValueUnavailable(option.id, value.id)">
              {{ value.label }} {{ optionValueSuffix(option.id, value.id) }}
            </option>
          </select>
          <Icon name="lucide:chevron-down" class="w-4 h-4 text-[#B0A090] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <!-- Color swatch -->
        <div v-else-if="option.displayType === 'color'" class="flex flex-wrap gap-2.5">
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            class="w-9 h-9 border-2 flex items-center justify-center relative transition-all"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable' ? 'opacity-30 cursor-not-allowed border-transparent' : 'cursor-pointer',
              selectedOptions[option.id] === value.id ? 'border-[#C17B4E] scale-110' : 'border-transparent hover:border-[#D4C4B4]'
            ]"
            :style="{ backgroundColor: value.meta || '#eee' }"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <Icon v-if="selectedOptions[option.id] === value.id" name="lucide:check" class="w-4 h-4 text-white drop-shadow" />
          </button>
        </div>

        <!-- Image swatch -->
        <div v-else-if="option.displayType === 'image'" class="flex flex-wrap gap-2">
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            class="w-14 h-14 border overflow-hidden relative transition-all"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable' ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer',
              selectedOptions[option.id] === value.id ? 'border-[#C17B4E]' : 'border-transparent hover:border-[#D4C4B4]'
            ]"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <img v-if="value.meta" :src="value.meta" class="w-full h-full object-cover">
            <span v-else class="text-xs text-[#B0A090] flex items-center justify-center h-full">{{ value.label }}</span>
          </button>
        </div>

        <!-- Default buttons -->
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="value in option.values"
            :key="value.id"
            class="px-4 py-2 text-xs tracking-[0.1em] uppercase border transition-all"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'border-[#E8E0D4] text-[#D4C4B4] cursor-not-allowed line-through'
                : selectedOptions[option.id] === value.id
                  ? 'border-[#2C2420] bg-[#2C2420] text-white'
                  : optionValueState(option.id, value.id) === 'out_of_stock'
                    ? 'border-[#E8E0D4] text-red-400'
                    : 'border-[#E8E0D4] text-[#7A6558] hover:border-[#C17B4E] hover:text-[#C17B4E]'
            ]"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            {{ value.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Mini description -->
    <p
      v-if="product?.miniDescription"
      class="text-sm text-[#7A6558] leading-relaxed pt-5 border-t border-[#E8E0D4]"
    >
      {{ product.miniDescription }}
    </p>
  </div>
</template>
