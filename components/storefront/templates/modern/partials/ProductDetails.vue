<script setup lang="ts">
const props = defineProps<{
    product: any
    currentPrice: number
    selectedOptions: Record<string, string>
}>()

const emit = defineEmits(['update:selectedOptions'])

const storeSettings = useState<any>('storeSettings')
const currencyCode = computed(() => storeSettings.value?.currencyCode || 'DZD')

const formatPrice = (val: number | string) => {
    return (
        Number(val)
            .toLocaleString('en-US', { style: 'currency', currency: currencyCode.value })
            .replace(currencyCode.value, '')
            .trim() +
        ` ${currencyCode.value}`
    )
}

const setOption = (optionId: string, valueId: string) => {
    const newOptions = {
        ...props.selectedOptions,
        [optionId]: valueId
    }
    emit('update:selectedOptions', newOptions)
}

// Logic to check if an option value is valid given *other* selected options
const isOptionValueAvailable = (optionId: string, valueId: string) => {
    if (!props.product?.variants) return true

    // Create a candidate selection by taking current selection and overriding the target option
    const candidateSelection = { ...props.selectedOptions, [optionId]: valueId }

    // We only need to check if there is AT LEAST ONE existent variant that matches this combination.
    // However, "Linked Options" usually means we check if a variant exists for (This Value + Selected Values of specific other options).
    // A simpler robust approach:
    // Does any variant exist that HAS this option value AND matches all OTHER currently selected options?
    
    return props.product.variants.some((variant: any) => {
        // Check if variant has the target value
        const hasTargetValue = variant.optionValues.some((ov: any) => ov.optionValueId === valueId)
        if (!hasTargetValue) return false

        // Check if variant is compatible with OTHER currently selected options
        // We iterate over all options. If it's the option we are testing, we assume match (checked above).
        // If it's another option, we check if the variant matches the CURRENTLY SELECTED value for that option.
        const matchesOtherSelections = props.product.options.every((opt: any) => {
            if (opt.id === optionId) return true // matches target
            const selectedVal = props.selectedOptions[opt.id]
            if (!selectedVal) return true // if nothing selected for other option, it's a potential match

            return variant.optionValues.some((ov: any) => ov.optionValueId === selectedVal)
        })

        // Also check if variant is active and has stock (optional, depending on requirements "out of stock managing" vs "non-existent combination")
        // User asked "if size is available but not that color", implying existence check.
        // Let's assume we also hide if stock is 0?
        // But usually we want to show "Out of Stock" vs "Unavailable".
        // Let's stick to existence + active for now to disable invalid combinations.
        return matchesOtherSelections && variant.isActive
    })
}
</script>

<template>
    <div class="flex flex-col animate-fade-in-right space-y-8">
        <!-- Header -->
        <div>
        <h1 class="text-3xl md:text-4xl lg:text-5xl font-sans font-bold text-slate-900 tracking-tight leading-tight mb-4">
            {{ product?.title }}
        </h1>

        <div class="flex items-baseline gap-4">
            <div class="text-4xl font-sans font-bold text-brand-600 tracking-tight">
            {{ formatPrice(currentPrice) }}
            </div>
            <div
            v-if="(Number(props.product?.price) * 1.2) > 0"
            class="text-lg text-slate-400 line-through decoration-2 decoration-slate-200"
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
            <label class="block text-sm font-medium text-slate-700 mb-2">{{ option.name }}</label>
            
            <!-- Dropdown Type -->
             <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
                <select
                    :value="selectedOptions[option.id]"
                    @change="setOption(option.id, ($event.target as HTMLSelectElement).value)"
                    class="block w-full h-11 rounded-lg border border-slate-200 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm"
                >
                    <option 
                        v-for="value in option.values" 
                        :key="value.id" 
                        :value="value.id"
                        :disabled="!isOptionValueAvailable(option.id, value.id)"
                    >
                        {{ value.label }} {{ !isOptionValueAvailable(option.id, value.id) ? '(Unavailable)' : '' }}
                    </option>
                </select>
                <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
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
                         !isOptionValueAvailable(option.id, value.id) 
                            ? 'opacity-30 cursor-not-allowed' 
                            : 'hover:scale-110 cursor-pointer',
                         selectedOptions[option.id] === value.id 
                            ? 'ring-2 ring-offset-2 ring-brand-600 scale-110 shadow-md' 
                            : 'ring-1 ring-black/5 hover:shadow-sm'
                    ]"
                   
                    :style="{ backgroundColor: value.meta || '#eee' }"
                    :disabled="!isOptionValueAvailable(option.id, value.id)"
                    :title="value.label + (!isOptionValueAvailable(option.id, value.id) ? ' (Unavailable)' : '')"
                    @click="setOption(option.id, value.id)"
                >
                   <!-- Checkmark for selected state -->
                    <Icon v-if="selectedOptions[option.id] === value.id" name="lucide:check" class="w-5 h-5 text-white drop-shadow-sm" />
                     <!-- Slash for unavailable -->
                    <div v-if="!isOptionValueAvailable(option.id, value.id)" class="absolute inset-0 flex items-center justify-center">
                        <div class="w-full h-0.5 bg-slate-500 rotate-45 transform"></div>
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
                         !isOptionValueAvailable(option.id, value.id) 
                            ? 'opacity-40 grayscale cursor-not-allowed border-slate-100' 
                            : 'hover:border-brand-300 cursor-pointer',
                         selectedOptions[option.id] === value.id 
                            ? 'border-brand-600 shadow-md scale-105' 
                            : 'border-slate-100'
                    ]"
                    :disabled="!isOptionValueAvailable(option.id, value.id)"
                    :title="value.label"
                    @click="setOption(option.id, value.id)"
                 >
                     <img v-if="value.meta" :src="value.meta" class="w-full h-full object-cover" />
                     <span v-else class="text-xs text-slate-400">{{ value.label }}</span>
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
                        :disabled="!isOptionValueAvailable(option.id, value.id)"
                        class="w-4 h-4 text-brand-600 border-gray-300 focus:ring-brand-500 disabled:opacity-50"
                        @change="setOption(option.id, value.id)"
                    >
                    <label 
                        :for="`${option.id}-${value.id}`" 
                        class="ml-2 block text-sm font-medium text-slate-700"
                        :class="{'text-slate-400 line-through': !isOptionValueAvailable(option.id, value.id)}"
                    >
                        {{ value.label }}
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
                     !isOptionValueAvailable(option.id, value.id) 
                        ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed decoration-slate-300' 
                        : selectedOptions[option.id] === value.id
                            ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                ]"
                :disabled="!isOptionValueAvailable(option.id, value.id)"
                @click="setOption(option.id, value.id)"
            >
                <span :class="{'line-through': !isOptionValueAvailable(option.id, value.id)}">{{ value.label }}</span>
            </button>
            </div>
        </div>
        </div>

        <!-- Mini Description -->
        <p
        v-if="product?.miniDescription"
        class="text-slate-600 mb-6 text-lg leading-relaxed"
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
