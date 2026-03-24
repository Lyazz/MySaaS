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
    const newOptions = {
        ...props.selectedOptions,
        [optionId]: valueId
    }
    emit('update:selectedOptions', newOptions)
}

const optionValueState = (optionId: string, valueId: string): OptionValueState => {
    if (!props.product?.variants || props.product.variants.length === 0) return 'available'
    return getOptionValueState({
        product: props.product,
        selectedOptions: props.selectedOptions,
        optionId,
        valueId
    })
}

const isOptionValueUnavailable = (optionId: string, valueId: string): boolean =>
    optionValueState(optionId, valueId) === 'unavailable'

const optionValueSuffix = (optionId: string, valueId: string): string => {
    const state = optionValueState(optionId, valueId)
    if (state === 'out_of_stock') return '(Out of stock)'
    if (state === 'unavailable') return '(Unavailable)'
    return ''
}

const setOptionIfAllowed = (optionId: string, valueId: string) => {
    if (isOptionValueUnavailable(optionId, valueId)) return
    setOption(optionId, valueId)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    
    <!-- Title Section -->
    <div class="border-b-4 border-black pb-6">
       <span class="inline-block bg-black text-white px-3 py-1 font-mono text-sm uppercase mb-2 tracking-widest">
        {{ product?.category?.title || 'Collection' }}
       </span>
       <h1 class="font-street text-5xl md:text-7xl leading-none uppercase mb-4 text-black drop-shadow-[4px_4px_0_var(--brand)]">
         {{ product?.title }}
       </h1>
       
        <StorefrontSharedCountdownTimer
            v-if="product?.showCountdown && product?.promotionEndDate "
            :end-date="product.promotionEndDate"
            theme="danger"
            show-icon
            class="mb-4"
        />
<div class="flex items-center gap-4">
         <span class="text-3xl font-mono font-bold bg-brand px-2 border-2 border-black shadow-[4px_4px_0_0_#000]">
           {{ formatPrice(currentPrice) }}
         </span>
         <span v-if="product?.compareAtPrice" class="text-xl text-gray-500 line-through decoration-2 decoration-red-500 font-mono">
           {{ formatPrice(product.compareAtPrice) }}
         </span>
       </div>
    </div>

    <!-- Option Selectors -->
    <div
        v-if="product?.options && product.options.length > 0"
        class="space-y-6"
    >
        <div
            v-for="option in product.options"
            :key="option.id"
        >
            <label class="block font-street text-2xl uppercase mb-3">{{ option.name }}</label>
            
            <!-- Dropdown Type -->
            <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
                <select
                    :value="selectedOptions[option.id]"
                    @change="setOption(option.id, ($event.target as HTMLSelectElement).value)"
                    class="block w-full bg-gray-100 border-2 border-black p-3 font-mono uppercase focus:shadow-[4px_4px_0_0_var(--brand)] outline-none appearance-none cursor-pointer"
                >
                    <option 
                        v-for="value in option.values" 
                        :key="value.id" 
                        :value="value.id"
                        :disabled="isOptionValueUnavailable(option.id, value.id)"
                    >
                        {{ value.label }} {{ optionValueSuffix(option.id, value.id) }}
                    </option>
                </select>
                <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                     <Icon name="lucide:chevron-down" class="w-5 h-5" />
                </div>
            </div>

            <!-- Color Swatch Type -->
            <div v-else-if="option.displayType === 'color'" class="flex flex-wrap gap-3">
                <button 
                    v-for="value in option.values"
                    :key="value.id"
                    type="button"
                    :class="[
                        'w-10 h-10 border-2 border-black flex items-center justify-center transition-all duration-200 relative',
                         optionValueState(option.id, value.id) === 'unavailable'
                            ? 'opacity-30 cursor-not-allowed'
                            : optionValueState(option.id, value.id) === 'out_of_stock'
                                ? 'opacity-60 cursor-pointer'
                                : 'hover:scale-110 cursor-pointer',
                         selectedOptions[option.id] === value.id 
                            ? 'ring-2 ring-offset-2 ring-brand scale-110 shadow-[4px_4px_0_0_#000]' 
                            : ''
                    ]"
                   
                    :style="{ backgroundColor: value.meta || '#eee' }"
                    :disabled="isOptionValueUnavailable(option.id, value.id)"
                    :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
                    @click="setOptionIfAllowed(option.id, value.id)"
                >
                    <Icon v-if="selectedOptions[option.id] === value.id" name="lucide:check" class="w-5 h-5 text-white drop-shadow-sm" />
                    <div v-if="optionValueState(option.id, value.id) !== 'available'" class="absolute inset-0 flex items-center justify-center">
                        <div
                            class="w-full h-0.5 rotate-45 transform"
                            :class="optionValueState(option.id, value.id) === 'out_of_stock' ? 'bg-red-500' : 'bg-black'"
                        />
                    </div>
                </button>
            </div>

            <!-- Image Type -->
            <div v-else-if="option.displayType === 'image'" class="flex flex-wrap gap-3">
                <button 
                    v-for="value in option.values"
                    :key="value.id"
                    type="button"
                    :class="[
                        'w-16 h-16 border-2 transition-all duration-200 overflow-hidden relative',
                         optionValueState(option.id, value.id) === 'unavailable'
                            ? 'opacity-40 grayscale cursor-not-allowed border-gray-300'
                            : optionValueState(option.id, value.id) === 'out_of_stock'
                                ? 'opacity-70 cursor-pointer border-black'
                                : 'hover:shadow-[4px_4px_0_0_var(--brand)] cursor-pointer border-black',
                         selectedOptions[option.id] === value.id 
                            ? 'border-brand shadow-[4px_4px_0_0_#000] scale-105' 
                            : ''
                    ]"
                    :disabled="isOptionValueUnavailable(option.id, value.id)"
                    :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
                    @click="setOptionIfAllowed(option.id, value.id)"
                 >
                    <img v-if="value.meta" :src="value.meta" class="w-full h-full object-cover" />
                    <span v-else class="text-xs font-mono uppercase text-gray-400">{{ value.label }}</span>
                    <div
                        v-if="optionValueState(option.id, value.id) === 'out_of_stock'"
                        class="absolute inset-x-1 bottom-1 bg-white/90 text-[10px] font-mono font-bold text-red-700 px-1 py-0.5 uppercase"
                    >
                        Out
                    </div>
                 </button>
            </div>

            <!-- Radio Buttons -->
            <div v-else-if="option.displayType === 'radio'" class="space-y-2">
                <div 
                    v-for="value in option.values" 
                    :key="value.id"
                    class="flex items-center"
                 >
                    <input 
                        type="radio" 
                        :id="`${option.id}-${value.id}`" 
                        :name="option.id"
                        :value="value.id"
                        :checked="selectedOptions[option.id] === value.id"
                        :disabled="isOptionValueUnavailable(option.id, value.id)"
                        class="w-4 h-4 text-brand border-2 border-black focus:ring-brand disabled:opacity-50"
                        @change="setOptionIfAllowed(option.id, value.id)"
                    >
                    <label 
                        :for="`${option.id}-${value.id}`" 
                        class="ml-2 block font-mono text-sm uppercase"
                        :class="{
                            'text-gray-400 line-through': optionValueState(option.id, value.id) !== 'available',
                            'text-red-700': optionValueState(option.id, value.id) === 'out_of_stock'
                        }"
                    >
                        {{ value.label }} <span class="text-xs font-normal ml-1">{{ optionValueSuffix(option.id, value.id) }}</span>
                    </label>
                 </div>
            </div>

            <!-- Default Buttons/Tags -->
            <div v-else class="flex flex-wrap gap-2">
                <button 
                    v-for="value in option.values" 
                    :key="value.id"
                    class="px-4 py-2 border-2 border-black font-mono uppercase text-sm transition-all relative overflow-hidden"
                    :class="[
                        optionValueState(option.id, value.id) === 'unavailable'
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : selectedOptions[option.id] === value.id
                                ? 'bg-black text-white shadow-[4px_4px_0_0_var(--brand)]'
                                : optionValueState(option.id, value.id) === 'out_of_stock'
                                    ? 'bg-white text-red-700 hover:bg-red-50'
                                    : 'bg-white text-black hover:bg-gray-100'
                    ]"
                    :disabled="isOptionValueUnavailable(option.id, value.id)"
                    :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
                    @click="setOptionIfAllowed(option.id, value.id)"
                >
                    <span :class="{ 'line-through': optionValueState(option.id, value.id) !== 'available' }">
                        {{ value.label }}
                    </span>
                    <span v-if="optionValueState(option.id, value.id) !== 'available'" class="ml-2 text-[10px] font-bold">
                        {{ optionValueSuffix(option.id, value.id) }}
                    </span>
                </button>
            </div>
        </div>
    </div>

    <!-- Mini Description -->
    <p
      v-if="product?.miniDescription"
      class="font-mono text-sm text-gray-600 leading-relaxed border-l-4 border-brand pl-4"
    >
      {{ product.miniDescription }}
    </p>
  </div>
</template>
