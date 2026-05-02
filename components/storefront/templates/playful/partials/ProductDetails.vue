<script setup lang="ts">
import {
  getOptionValueState,
  type OptionValueState,
  type SelectedOptions,
} from '../variant-ux';

const props = defineProps<{
  product: any;
  currentPrice: number;
  originalPrice?: number;
  selectedOptions: SelectedOptions;
}>();

const emit = defineEmits(['update:selectedOptions']);

const storeSettings = useState<any>('storeSettings');
const { format: formatPrice } = useCurrency();

const setOption = (optionId: string, valueId: string) => {
  emit('update:selectedOptions', {
    ...props.selectedOptions,
    [optionId]: valueId,
  });
};

const optionValueState = (
  optionId: string,
  valueId: string
): OptionValueState => {
  if (!props.product?.variants || props.product.variants.length === 0)
    return 'available';
  return getOptionValueState({
    product: props.product,
    selectedOptions: props.selectedOptions,
    optionId,
    valueId,
  });
};

const isOptionValueUnavailable = (optionId: string, valueId: string): boolean =>
  optionValueState(optionId, valueId) === 'unavailable';

const optionValueSuffix = (optionId: string, valueId: string): string => {
  const state = optionValueState(optionId, valueId);
  if (state === 'out_of_stock') return '(Out of stock)';
  if (state === 'unavailable') return '(Unavailable)';
  return '';
};

const setOptionIfAllowed = (optionId: string, valueId: string) => {
  if (isOptionValueUnavailable(optionId, valueId)) return;
  setOption(optionId, valueId);
};
</script>

<template>
  <div
    class="flex flex-col animate-fade-in-right space-y-7"
    style="font-family: 'DM Sans', sans-serif"
  >
    <!-- Title + Price -->
    <div>
      <h1
        class="text-3xl md:text-4xl font-black text-stone-900 leading-tight mb-4"
        style="font-family: 'Fredoka', sans-serif"
      >
        {{ product?.title }}
      </h1>

      <!-- Pricing -->
      <div class="flex flex-wrap items-baseline gap-3 mb-5">
        <span
          class="text-4xl font-black text-violet-700"
          style="font-family: 'Fredoka', sans-serif"
        >
          {{ formatPrice(currentPrice) }}
        </span>
        <span
          v-if="originalPrice && originalPrice > currentPrice"
          class="text-lg text-stone-400 font-bold line-through"
          >{{ formatPrice(originalPrice) }}</span
        >
        <span
          v-if="originalPrice && originalPrice > currentPrice"
          class="px-3 py-1 bg-pink-500 text-white text-xs font-black rounded-full border border-pink-400 shrink-0"
          >-{{
            Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
          }}%</span
        >
      </div>

      <!-- Countdown -->
      <StorefrontSharedCountdownTimer
        v-if="product?.showCountdown && product?.promotionEndDate"
        :end-date="product.promotionEndDate"
        theme="danger"
        show-icon
        class="mb-5"
      />

      <!-- Urgency Banner -->
      <div
        class="bg-violet-50 border-3 border-violet-100 rounded-2xl p-3.5 flex items-center gap-3"
      >
        <div class="relative flex h-3 w-3 flex-shrink-0">
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"
          />
          <span
            class="relative inline-flex rounded-full h-3 w-3 bg-violet-600"
          />
        </div>
        <span class="text-sm font-bold text-violet-900">
          <strong class="font-black">{{
            $t('storefront.product.highDemandBadge')
          }}</strong>
          {{ $t('storefront.product.viewingRightNow', { count: 15 }) }}
        </span>
      </div>
    </div>

    <!-- Option Selectors -->
    <div
      v-if="product?.options && product.options.length > 0"
      class="space-y-5"
    >
      <div v-for="option in product.options" :key="option.id">
        <label
          class="block text-sm font-black text-stone-700 mb-2.5"
          style="font-family: 'Fredoka', sans-serif"
        >
          {{ option.name }}
        </label>

        <!-- Dropdown -->
        <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
          <select
            :value="selectedOptions[option.id] || ''"
            class="block w-full h-11 rounded-2xl border-3 border-violet-100 bg-white px-4 text-stone-900 font-black focus:border-violet-400 hover:border-violet-300 transition-colors outline-none appearance-none cursor-pointer"
            @change="
              setOption(option.id, ($event.target as HTMLSelectElement).value)
            "
          >
            <option value="" disabled>{{ option.name }}</option>
            <option
              v-for="value in option.values"
              :key="value.id"
              :value="value.id"
              :disabled="isOptionValueUnavailable(option.id, value.id)"
            >
              {{ value.label }} {{ optionValueSuffix(option.id, value.id) }}
            </option>
          </select>
          <div
            class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400"
          >
            <Icon name="lucide:chevron-down" class="w-4 h-4" />
          </div>
        </div>

        <!-- Color -->
        <div
          v-else-if="option.displayType === 'color'"
          class="flex flex-wrap gap-3"
        >
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            :class="[
              'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 relative border-3',
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-30 cursor-not-allowed border-transparent'
                : selectedOptions[option.id] === value.id
                  ? 'border-violet-700 scale-110 shadow-[0_3px_0_0_#4c1d95]'
                  : 'border-white hover:border-violet-300 hover:scale-105 shadow-sm',
            ]"
            :style="{ backgroundColor: value.meta || '#eee' }"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="
              `${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()
            "
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <Icon
              v-if="selectedOptions[option.id] === value.id"
              name="lucide:check"
              class="w-4 h-4 text-white drop-shadow"
            />
            <div
              v-if="optionValueState(option.id, value.id) !== 'available'"
              class="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden"
            >
              <div
                class="w-full h-0.5 rotate-45"
                :class="
                  optionValueState(option.id, value.id) === 'out_of_stock'
                    ? 'bg-red-500/70'
                    : 'bg-stone-500'
                "
              />
            </div>
          </button>
        </div>

        <!-- Image -->
        <div
          v-else-if="option.displayType === 'image'"
          class="flex flex-wrap gap-2.5"
        >
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            :class="[
              'w-16 h-16 rounded-xl border-3 transition-all duration-200 overflow-hidden relative',
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-40 grayscale cursor-not-allowed border-stone-100'
                : selectedOptions[option.id] === value.id
                  ? 'border-violet-700 shadow-[0_3px_0_0_#4c1d95] -translate-y-0.5'
                  : 'border-violet-100 hover:border-violet-300 hover:-translate-y-0.5',
            ]"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="
              `${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()
            "
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <img
              v-if="value.meta"
              :src="value.meta"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-xs text-stone-400 p-1 text-center">{{
              value.label
            }}</span>
            <div
              v-if="optionValueState(option.id, value.id) === 'out_of_stock'"
              class="absolute inset-x-1 bottom-1 rounded bg-white/90 text-[10px] font-black text-red-700 px-1 py-0.5 text-center"
            >
              Out
            </div>
          </button>
        </div>

        <!-- Radio -->
        <div v-else-if="option.displayType === 'radio'" class="space-y-2">
          <div
            v-for="value in option.values"
            :key="value.id"
            class="flex items-center gap-2"
          >
            <input
              type="radio"
              :id="`${option.id}-${value.id}`"
              :name="option.id"
              :value="value.id"
              :checked="selectedOptions[option.id] === value.id"
              :disabled="isOptionValueUnavailable(option.id, value.id)"
              class="w-4 h-4 text-violet-700 border-stone-300 focus:ring-violet-400 disabled:opacity-50"
              @change="setOptionIfAllowed(option.id, value.id)"
            />
            <label
              :for="`${option.id}-${value.id}`"
              class="text-sm font-medium text-stone-700"
              :class="{
                'text-stone-400 line-through':
                  optionValueState(option.id, value.id) !== 'available',
                'text-red-600':
                  optionValueState(option.id, value.id) === 'out_of_stock',
              }"
              >{{ value.label }}
              <span class="text-xs font-normal ml-1">{{
                optionValueSuffix(option.id, value.id)
              }}</span></label
            >
          </div>
        </div>

        <!-- Default sticker buttons -->
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="value in option.values"
            :key="value.id"
            class="px-5 py-2.5 rounded-full text-sm font-black border-3 transition-all duration-200 relative"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed'
                : selectedOptions[option.id] === value.id
                  ? 'bg-violet-700 text-white border-violet-700 shadow-[0_4px_0_0_#4c1d95] -translate-y-1'
                  : optionValueState(option.id, value.id) === 'out_of_stock'
                    ? 'bg-white text-red-600 border-red-200 hover:border-red-300'
                    : 'bg-white text-stone-700 border-violet-100 hover:border-violet-300 hover:-translate-y-0.5',
            ]"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="
              `${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()
            "
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <span
              :class="{
                'line-through':
                  optionValueState(option.id, value.id) !== 'available',
              }"
            >
              {{ value.label }}
            </span>
            <span
              v-if="optionValueState(option.id, value.id) !== 'available'"
              class="ml-1.5 text-[10px] font-bold"
            >
              {{ optionValueSuffix(option.id, value.id) }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mini Description -->
    <p
      v-if="product?.miniDescription"
      class="text-stone-600 text-base leading-relaxed"
    >
      {{ product.miniDescription }}
    </p>
  </div>
</template>

<style scoped>
.animate-fade-in-right {
  animation: fadeInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
  opacity: 0;
}
@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
