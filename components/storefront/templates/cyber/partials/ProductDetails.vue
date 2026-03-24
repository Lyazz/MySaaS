<script setup lang="ts">
import { getOptionValueState, type OptionValueState, type SelectedOptions } from '../variant-ux'

const props = defineProps<{
    product: any
    currentPrice: number
    selectedOptions: SelectedOptions
}>()

const emit = defineEmits(['update:selectedOptions'])

const storeSettings = useState<any>('storeSettings')
const { format: formatPrice } = useCurrency()

const setOption = (optionId: string, valueId: string) => {
    const newOptions = {
        ...props.selectedOptions,
        [optionId]: valueId
    }
    emit('update:selectedOptions', newOptions)
}

const optionValueState = (optionId: string, valueId: string): OptionValueState => {
    // If variants aren't loaded, don't block selection in the UI.
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
    <div class="flex flex-col animate-fade-in-right space-y-8">
        <!-- Header -->
        <div>
        <h1 class="text-3xl md:text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight leading-tight mb-4">
            {{ product?.title }}
        </h1>

        <div class="flex items-baseline gap-4">
            
        <StorefrontSharedCountdownTimer
            v-if="product?.showCountdown && product?.promotionEndDate "
            :end-date="product.promotionEndDate"
            theme="danger"
            show-icon
            class="mb-4"
        />
<div class="text-4xl font-sans font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 tracking-tight">
            {{ formatPrice(currentPrice) }}
            </div>
            <div
            v-if="(Number(props.product?.price) * 1.2) > 0"
            class="text-lg text-purple-400 line-through decoration-2 decoration-purple-500/40"
            >
            {{ formatPrice(currentPrice * 1.2) }}
            </div>
        </div>
        </div>

        <!-- Option Selectors -->
        <div
            v-if="product?.options && product.options.length > 0"
            class="space-y-4"
        >
        <div
            v-for="option in product.options"
            :key="option.id"
        >
            <label class="block text-sm font-bold text-pink-400 mb-2 uppercase tracking-wider">{{ option.name }}</label>
            
            <!-- Dropdown Type -->
             <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
                <select
                    :value="selectedOptions[option.id]"
                    @change="setOption(option.id, ($event.target as HTMLSelectElement).value)"
                    class="block w-full h-11 rounded-lg border border-purple-500/30 bg-purple-900/30 px-4 text-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer"
                >
	                    <option 
	                        v-for="value in option.values" 
	                        :key="value.id" 
	                        :value="value.id"
	                        :disabled="isOptionValueUnavailable(option.id, value.id)"
                            class="bg-[#1a0a2e]"
	                    >
	                        {{ value.label }} {{ optionValueSuffix(option.id, value.id) }}
	                    </option>
	                </select>
                <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-purple-400">
                     <Icon name="lucide:chevron-down" class="w-4 h-4" />
                </div>
            </div>

	            <!-- Color Swatch Type -->
	            <div v-else-if="option.displayType === 'color'" class="flex flex-wrap gap-3">
	                <button 
	                    v-for="value in option.values"
	                    :key="value.id"
	                    type="button"
	                    :class="[
	                        'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 relative',
	                         optionValueState(option.id, value.id) === 'unavailable'
	                            ? 'opacity-30 cursor-not-allowed'
	                            : optionValueState(option.id, value.id) === 'out_of_stock'
	                                ? 'opacity-60 cursor-pointer'
	                                : 'hover:scale-110 cursor-pointer',
	                         selectedOptions[option.id] === value.id 
	                            ? 'ring-2 ring-offset-2 ring-offset-[#1a0a2e] ring-pink-500 scale-110 shadow-md shadow-pink-500/30' 
	                            : 'ring-1 ring-purple-500/30 hover:shadow-sm'
	                    ]"
	                   
	                    :style="{ backgroundColor: value.meta || '#6b21a8' }"
	                    :disabled="isOptionValueUnavailable(option.id, value.id)"
	                    :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
	                    @click="setOptionIfAllowed(option.id, value.id)"
	                >
	                   <!-- Checkmark for selected state -->
	                    <Icon v-if="selectedOptions[option.id] === value.id" name="lucide:check" class="w-5 h-5 text-white drop-shadow-sm" />
	                     <!-- Slash for unavailable / out-of-stock -->
	                    <div v-if="optionValueState(option.id, value.id) !== 'available'" class="absolute inset-0 flex items-center justify-center">
	                        <div
	                            class="w-full h-0.5 rotate-45 transform"
	                            :class="optionValueState(option.id, value.id) === 'out_of_stock' ? 'bg-red-500/70' : 'bg-purple-500'"
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
                        'w-16 h-16 rounded-lg border-2 transition-all duration-200 overflow-hidden relative',
                         optionValueState(option.id, value.id) === 'unavailable'
                            ? 'opacity-40 grayscale cursor-not-allowed border-purple-500/20'
                            : optionValueState(option.id, value.id) === 'out_of_stock'
                                ? 'opacity-70 cursor-pointer border-purple-500/20'
                                : 'hover:border-pink-500/50 cursor-pointer',
                         selectedOptions[option.id] === value.id 
                            ? 'border-pink-500 shadow-md shadow-pink-500/20 scale-105' 
                            : 'border-purple-500/30'
                    ]"
                    :disabled="isOptionValueUnavailable(option.id, value.id)"
                    :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
                    @click="setOptionIfAllowed(option.id, value.id)"
                 >
                     <img v-if="value.meta" :src="value.meta" class="w-full h-full object-cover" />
                     <span v-else class="text-xs text-purple-300 flex items-center justify-center w-full h-full bg-purple-900/50">{{ value.label }}</span>
                     <div
                        v-if="optionValueState(option.id, value.id) === 'out_of_stock'"
                        class="absolute inset-x-1 bottom-1 rounded bg-[#1a0a2e]/90 text-[10px] font-semibold text-red-400 px-1 py-0.5"
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
	                        class="w-4 h-4 text-pink-500 border-purple-500/50 bg-purple-900/30 focus:ring-pink-500 disabled:opacity-50"
	                        @change="setOptionIfAllowed(option.id, value.id)"
	                    >
	                    <label 
	                        :for="`${option.id}-${value.id}`" 
	                        class="ml-2 block text-sm font-medium text-purple-100"
	                        :class="{
	                            'text-purple-400 line-through': optionValueState(option.id, value.id) !== 'available',
	                            'text-red-400': optionValueState(option.id, value.id) === 'out_of_stock'
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
                class="px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 relative overflow-hidden"
                :class="[
                    optionValueState(option.id, value.id) === 'unavailable'
                        ? 'bg-purple-900/20 text-purple-500 border-purple-500/20 cursor-not-allowed decoration-purple-500'
                        : selectedOptions[option.id] === value.id
                            ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white border-pink-500 shadow-md shadow-pink-500/30'
                            : optionValueState(option.id, value.id) === 'out_of_stock'
                                ? 'bg-transparent text-red-400 border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10'
                                : 'bg-transparent text-purple-200 border-purple-500/30 hover:border-pink-500/50 hover:bg-purple-900/30'
                ]"
                :disabled="isOptionValueUnavailable(option.id, value.id)"
                :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
                @click="setOptionIfAllowed(option.id, value.id)"
            >
                <span :class="{ 'line-through': optionValueState(option.id, value.id) !== 'available' }">
                    {{ value.label }}
                </span>
                <span v-if="optionValueState(option.id, value.id) !== 'available'" class="ml-2 text-[10px] font-semibold">
                    {{ optionValueSuffix(option.id, value.id) }}
                </span>
            </button>
            </div>
        </div>
        </div>

        <!-- Mini Description -->
        <p
        v-if="product?.miniDescription"
        class="text-purple-200/70 mb-6 text-lg leading-relaxed"
        >
        {{ product.miniDescription }}
        </p>
    </div>
</template>

<style scoped>
.animate-fade-in-right {
    animation: fadeInRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
    opacity: 0;
}
@keyframes fadeInRight {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
}
</style>
