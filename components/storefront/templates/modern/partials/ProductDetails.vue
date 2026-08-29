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
  hideOptionSelectors?: boolean;
}>();

const emit = defineEmits(['update:selectedOptions']);

const storeSettings = useState<any>('storeSettings');
const { format: formatPrice } = useCurrency();

const setOption = (optionId: string, valueId: string) => {
  const newOptions = {
    ...props.selectedOptions,
    [optionId]: valueId,
  };
  emit('update:selectedOptions', newOptions);
};

const optionValueState = (
  optionId: string,
  valueId: string
): OptionValueState => {
  // If variants aren't loaded, don't block selection in the UI.
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

const { inviteTick } = useVariantSelectionInvite()
const optionNudge = ref(false)
const hasUnselectedOptions = computed(() =>
  Array.isArray(props.product?.options) &&
  props.product.options.some((o: any) => !props.selectedOptions?.[o.id])
)
watch(inviteTick, () => {
  optionNudge.value = false
  setTimeout(() => {
    optionNudge.value = true
    setTimeout(() => { optionNudge.value = false }, 700)
  }, 20)
})
</script>

<template>
  <div class="flex flex-col animate-fade-in-right space-y-8">
    <!-- Header -->
    <div>
      <h1
        class="text-3xl md:text-4xl lg:text-5xl font-sans font-bold text-slate-900 tracking-tight leading-tight mb-2"
      >
        {{ product?.title }}
      </h1>

      <div
        class="flex items-center gap-2 mb-4 text-sm font-medium text-slate-600"
      >
        <div class="flex text-amber-400">
          <Icon name="lucide:star" class="w-4 h-4 fill-current" />
          <Icon name="lucide:star" class="w-4 h-4 fill-current" />
          <Icon name="lucide:star" class="w-4 h-4 fill-current" />
          <Icon name="lucide:star" class="w-4 h-4 fill-current" />
          <Icon name="lucide:star-half" class="w-4 h-4 fill-current" />
        </div>
        <span class="font-bold text-slate-800">4.9 / 5</span>
        <span class="text-slate-500">{{
          $t('storefront.product.reviewsCount', { count: 1000 })
        }}</span>
      </div>

      <div class="flex flex-wrap items-baseline gap-3 md:gap-4 mb-4">
        <div class="text-4xl font-sans font-bold text-brand-600 tracking-tight">
          {{ formatPrice(currentPrice) }}
        </div>
        <div
          v-if="originalPrice && originalPrice > currentPrice"
          class="text-lg text-slate-400 line-through decoration-2 decoration-slate-200 whitespace-nowrap"
        >
          {{ formatPrice(originalPrice) }}
        </div>
        <div
          v-if="originalPrice && originalPrice > currentPrice"
          class="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-md shadow-sm tracking-wide whitespace-nowrap shrink-0"
        >
          -{{
            Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
          }}%
        </div>
      </div>

      <StorefrontSharedCountdownTimer
        v-if="product?.showCountdown && product?.promotionEndDate"
        :end-date="product.promotionEndDate"
        theme="danger"
        show-icon
        class="mb-4"
      />

      <!-- Urgency Banner -->
      <div
        class="bg-brand-50 border border-brand-100 rounded-xl p-3 flex items-center gap-3 shadow-sm"
      >
        <div class="relative flex h-3 w-3">
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"
          ></span>
          <span
            class="relative inline-flex rounded-full h-3 w-3 bg-brand-600"
          ></span>
        </div>
        <span class="text-sm font-medium text-brand-900">
          <strong class="font-bold">{{
            $t('storefront.product.highDemandBadge')
          }}</strong>
          {{ $t('storefront.product.viewingRightNow', { count: 15 }) }}
        </span>
      </div>
    </div>

    <!-- Option Selectors -->
    <div
      v-if="
        !hideOptionSelectors && product?.options && product.options.length > 0
      "
      class="space-y-4"
      :class="{ 'vux-invite': hasUnselectedOptions, 'vux-invite-nudge': optionNudge }"
    >
      <p
        v-if="hasUnselectedOptions"
        class="vux-invite-hint inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600"
      >
        <Icon name="lucide:arrow-down" class="w-3.5 h-3.5" />
        {{ $t('storefront.productForm.chooseOptionsPrompt') }}
      </p>
      <div v-for="option in product.options" :key="option.id">
        <label class="block text-sm font-medium text-slate-700 mb-2">{{
          option.name
        }}</label>

        <!-- Dropdown Type -->
        <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
          <select
            :value="selectedOptions[option.id] || ''"
            @change="
              setOption(option.id, ($event.target as HTMLSelectElement).value)
            "
            class="block w-full h-11 rounded-lg border border-slate-200 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm"
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
            class="absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500"
          >
            <Icon name="lucide:chevron-down" class="w-4 h-4" />
          </div>
        </div>

        <!-- Color Swatch Type -->
        <div
          v-else-if="option.displayType === 'color'"
          class="flex flex-wrap gap-3"
        >
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
                ? 'ring-2 ring-offset-2 ring-brand-600 scale-110 shadow-md'
                : 'ring-1 ring-black/5 hover:shadow-sm',
            ]"
            :style="{ backgroundColor: value.meta || '#eee' }"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="
              `${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()
            "
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <!-- Checkmark for selected state -->
            <Icon
              v-if="selectedOptions[option.id] === value.id"
              name="lucide:check"
              class="w-5 h-5 text-white drop-shadow-sm"
            />
            <!-- Slash for unavailable / out-of-stock -->
            <div
              v-if="optionValueState(option.id, value.id) !== 'available'"
              class="absolute inset-0 flex items-center justify-center"
            >
              <div
                class="w-full h-0.5 rotate-45 transform"
                :class="
                  optionValueState(option.id, value.id) === 'out_of_stock'
                    ? 'bg-red-500/70'
                    : 'bg-slate-500'
                "
              />
            </div>
          </button>
        </div>

        <!-- Image Type -->
        <div
          v-else-if="option.displayType === 'image'"
          class="flex flex-wrap gap-3"
        >
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            :class="[
              'w-16 h-16 rounded-lg border-2 transition-all duration-200 overflow-hidden relative',
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-40 grayscale cursor-not-allowed border-slate-100'
                : optionValueState(option.id, value.id) === 'out_of_stock'
                  ? 'opacity-70 cursor-pointer border-slate-100'
                  : 'hover:border-brand-300 cursor-pointer',
              selectedOptions[option.id] === value.id
                ? 'border-brand-600 shadow-md scale-105'
                : 'border-slate-100',
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
            <span v-else class="text-xs text-slate-400">{{ value.label }}</span>
            <div
              v-if="optionValueState(option.id, value.id) === 'out_of_stock'"
              class="absolute inset-x-1 bottom-1 rounded bg-white/90 text-[10px] font-semibold text-red-700 px-1 py-0.5"
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
              class="w-4 h-4 text-brand-600 border-gray-300 focus:ring-brand-500 disabled:opacity-50"
              @change="setOptionIfAllowed(option.id, value.id)"
            />
            <label
              :for="`${option.id}-${value.id}`"
              class="ms-2 block text-sm font-medium text-slate-700"
              :class="{
                'text-slate-400 line-through':
                  optionValueState(option.id, value.id) !== 'available',
                'text-red-700':
                  optionValueState(option.id, value.id) === 'out_of_stock',
              }"
            >
              {{ value.label }}
              <span class="text-xs font-normal ms-1">{{
                optionValueSuffix(option.id, value.id)
              }}</span>
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
                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed decoration-slate-300'
                : selectedOptions[option.id] === value.id
                  ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20'
                  : optionValueState(option.id, value.id) === 'out_of_stock'
                    ? 'bg-white text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-slate-50',
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
              class="ms-2 text-[10px] font-semibold"
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
