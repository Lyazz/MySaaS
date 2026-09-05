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

const { format: formatPrice } = useCurrency();
const { t } = useI18n({ useScope: 'global' });

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
  if (state === 'out_of_stock') return `(${t('storefront.productForm.stock.outOfStock')})`;
  if (state === 'unavailable') return `(${t('storefront.productForm.stock.unavailable')})`;
  return '';
};

const setOptionIfAllowed = (optionId: string, valueId: string) => {
  if (isOptionValueUnavailable(optionId, valueId)) return;
  setOption(optionId, valueId);
};

const discountPercent = computed(() => {
  if (!props.originalPrice || props.originalPrice <= props.currentPrice) return 0;
  return Math.round(((props.originalPrice - props.currentPrice) / props.originalPrice) * 100);
});

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
  <div class="flex flex-col gap-8">
    <!-- Header -->
    <div>
      <h1 class="emb-display text-[32px] md:text-[42px] leading-[1.08] text-[#16211E] mb-5">
        {{ product?.title }}
      </h1>

      <div class="flex items-center gap-3 mb-6">
        <div class="flex text-[#DFA254]">
          <Icon name="lucide:star" class="w-4 h-4 fill-current" />
          <Icon name="lucide:star" class="w-4 h-4 fill-current" />
          <Icon name="lucide:star" class="w-4 h-4 fill-current" />
          <Icon name="lucide:star" class="w-4 h-4 fill-current" />
          <Icon name="lucide:star-half" class="w-4 h-4 fill-current" />
        </div>
        <span class="text-sm font-semibold text-[#16211E] tabular-nums">4.9</span>
        <span class="text-sm text-[#8E9793]">{{ t('storefront.product.reviewsCount', { count: 1000 }) }}</span>
      </div>

      <div class="h-px w-full bg-[#CBBDAB] mb-6" />

      <div class="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <span class="emb-display text-[38px] leading-none text-brand-700 tabular-nums">
          {{ formatPrice(currentPrice) }}
        </span>
        <span
          v-if="discountPercent > 0"
          class="text-base text-[#8E9793] line-through tabular-nums"
        >
          {{ formatPrice(originalPrice!) }}
        </span>
        <span
          v-if="discountPercent > 0"
          class="px-2 py-1 bg-[#B4593F] text-[#FDFAF4] text-[11px] font-bold tabular-nums"
        >-{{ discountPercent }}%</span>
      </div>

      <StorefrontSharedCountdownTimer
        v-if="product?.showCountdown && product?.promotionEndDate"
        :end-date="product.promotionEndDate"
        theme="danger"
        show-icon
        class="mt-5"
      />

      <!-- Demand note -->
      <div class="mt-6 flex items-center gap-3 border-s-2 border-[#DFA254] bg-[#FDFAF4] px-4 py-3">
        <span class="relative flex h-2 w-2 shrink-0">
          <span class="animate-ping absolute inline-flex h-full w-full bg-[#DFA254] opacity-75" />
          <span class="relative inline-flex h-2 w-2 bg-brand-600" />
        </span>
        <span class="text-sm text-[#5A6763]">
          <strong class="font-semibold text-[#16211E]">{{ t('storefront.product.highDemandBadge') }}</strong>
          {{ t('storefront.product.viewingRightNow', { count: 15 }) }}
        </span>
      </div>
    </div>

    <!-- Option Selectors -->
    <div
      v-if="!hideOptionSelectors && product?.options && product.options.length > 0"
      class="space-y-6"
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
        <p class="emb-label text-[#8E9793] mb-3">{{ option.name }}</p>

        <!-- Dropdown -->
        <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
          <select
            :value="selectedOptions[option.id] || ''"
            class="block w-full h-12 border border-[#CBBDAB] bg-[#FDFAF4] px-4 pe-10 text-[#16211E] focus:border-brand-600 focus:ring-0 transition-colors outline-none appearance-none cursor-pointer"
            @change="setOption(option.id, ($event.target as HTMLSelectElement).value)"
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
          <Icon name="lucide:chevron-down" class="w-4 h-4 text-[#5A6763] absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <!-- Colour swatches, set as tiles -->
        <div v-else-if="option.displayType === 'color'" class="flex flex-wrap gap-2.5">
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            class="w-10 h-10 relative flex items-center justify-center transition-all"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-30 cursor-not-allowed'
                : optionValueState(option.id, value.id) === 'out_of_stock'
                  ? 'opacity-60 cursor-pointer'
                  : 'cursor-pointer',
              selectedOptions[option.id] === value.id
                ? 'ring-2 ring-offset-2 ring-brand-600 ring-offset-[#F2ECE1]'
                : 'ring-1 ring-[#CBBDAB] hover:ring-[#DFA254]',
            ]"
            :style="{ backgroundColor: value.meta || '#eee' }"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <Icon
              v-if="selectedOptions[option.id] === value.id"
              name="lucide:check"
              class="w-5 h-5 text-white drop-shadow"
            />
            <span
              v-if="optionValueState(option.id, value.id) !== 'available'"
              class="absolute inset-0 flex items-center justify-center"
            >
              <span
                class="w-full h-0.5 rotate-45"
                :class="optionValueState(option.id, value.id) === 'out_of_stock' ? 'bg-[#B4593F]' : 'bg-[#16211E]/50'"
              />
            </span>
          </button>
        </div>

        <!-- Image swatches -->
        <div v-else-if="option.displayType === 'image'" class="flex flex-wrap gap-2.5">
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            class="w-16 h-16 border-2 overflow-hidden relative transition-all"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-40 grayscale cursor-not-allowed border-[#CBBDAB]'
                : optionValueState(option.id, value.id) === 'out_of_stock'
                  ? 'opacity-70 cursor-pointer border-[#CBBDAB]'
                  : 'cursor-pointer hover:border-[#DFA254]',
              selectedOptions[option.id] === value.id ? 'border-brand-600' : 'border-[#CBBDAB]',
            ]"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <img v-if="value.meta" :src="value.meta" class="w-full h-full object-cover" :alt="value.label">
            <span v-else class="text-xs text-[#8E9793]">{{ value.label }}</span>
          </button>
        </div>

        <!-- Radio -->
        <div v-else-if="option.displayType === 'radio'" class="space-y-2.5">
          <div v-for="value in option.values" :key="value.id" class="flex items-center">
            <input
              :id="`${option.id}-${value.id}`"
              type="radio"
              :name="option.id"
              :value="value.id"
              :checked="selectedOptions[option.id] === value.id"
              :disabled="isOptionValueUnavailable(option.id, value.id)"
              class="w-4 h-4 text-brand-600 border-[#CBBDAB] focus:ring-brand-600 disabled:opacity-50"
              @change="setOptionIfAllowed(option.id, value.id)"
            >
            <label
              :for="`${option.id}-${value.id}`"
              class="ms-2.5 block text-sm text-[#5A6763]"
              :class="{
                'text-[#8E9793] line-through': optionValueState(option.id, value.id) !== 'available',
                '!text-[#B4593F]': optionValueState(option.id, value.id) === 'out_of_stock',
              }"
            >
              {{ value.label }}
              <span class="text-xs ms-1">{{ optionValueSuffix(option.id, value.id) }}</span>
            </label>
          </div>
        </div>

        <!-- Default tags -->
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            class="px-4 h-10 text-sm font-medium border transition-colors"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'bg-[#F2ECE1] text-[#B3AA9E] border-[#CBBDAB] cursor-not-allowed'
                : selectedOptions[option.id] === value.id
                  ? 'bg-brand-600 text-[#FDFAF4] border-brand-600'
                  : optionValueState(option.id, value.id) === 'out_of_stock'
                    ? 'bg-[#FDFAF4] text-[#B4593F] border-[#B4593F]/40 hover:border-[#B4593F]'
                    : 'bg-[#FDFAF4] text-[#16211E] border-[#CBBDAB] hover:border-brand-600 hover:text-brand-700',
            ]"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <span :class="{ 'line-through': optionValueState(option.id, value.id) !== 'available' }">
              {{ value.label }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mini description -->
    <p v-if="product?.miniDescription" class="text-[#5A6763] text-base leading-relaxed">
      {{ product.miniDescription }}
    </p>
  </div>
</template>
