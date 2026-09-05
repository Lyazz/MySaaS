<script setup lang="ts">
import {
  getOptionValueState,
  type OptionValueState,
  type SelectedOptions,
} from '../variant-ux';

const props = defineProps<{
  product: any;
  currentPrice: number;
  selectedOptions: SelectedOptions;
  /*
   * The page sets the name and price as a full-width headline above the
   * columns, so the panel drops its own header and opens straight on the
   * options.
   */
  hideHeader?: boolean;
}>();

const emit = defineEmits(['update:selectedOptions']);

const { format: formatPrice } = useCurrency();
const storefrontContent = useStorefrontContent();

const setOption = (optionId: string, valueId: string) => {
  emit('update:selectedOptions', { ...props.selectedOptions, [optionId]: valueId });
};

const optionValueState = (optionId: string, valueId: string): OptionValueState => {
  if (!props.product?.variants || props.product.variants.length === 0) return 'available';
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
  <div class="space-y-7">
    <!-- Title block -->
    <div v-if="!hideHeader">
      <span class="ed-ui text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7E6E]">
        {{ product?.category?.title || storefrontContent.common.collection }}
      </span>
      <h1 class="ed-display text-3xl md:text-[2.75rem] leading-[1.1] text-[#262019] mt-3 mb-5">
        {{ product?.title }}
      </h1>

      <StorefrontSharedCountdownTimer
        v-if="product?.showCountdown && product?.promotionEndDate"
        :end-date="product.promotionEndDate"
        theme="danger"
        show-icon
        class="mb-5"
      />

      <div class="flex items-baseline gap-3 pb-6 border-b border-[#262019]">
        <span class="ed-display text-[2rem] text-[#B8532E]">{{ formatPrice(currentPrice) }}</span>
        <span v-if="product?.compareAtPrice" class="ed-ui text-lg text-[#8A7E6E] line-through">
          {{ formatPrice(product.compareAtPrice) }}
        </span>
      </div>
    </div>

    <!-- Options -->
    <div
      v-if="product?.options && product.options.length > 0"
      class="space-y-6"
      :class="{ 'vux-invite': hasUnselectedOptions, 'vux-invite-nudge': optionNudge }"
    >
      <p
        v-if="hasUnselectedOptions"
        class="vux-invite-hint inline-flex items-center gap-1.5 ed-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-[#97401F]"
      >
        <Icon name="lucide:arrow-down" class="w-3.5 h-3.5" />
        {{ $t('storefront.productForm.chooseOptionsPrompt') }}
      </p>

      <div v-for="option in product.options" :key="option.id">
        <label class="ed-label">{{ option.name }}</label>

        <!-- Dropdown -->
        <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
          <select
            class="ed-select"
            :value="selectedOptions[option.id] || ''"
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
          <Icon name="lucide:chevron-down" class="w-4 h-4 absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8A7E6E]" />
        </div>

        <!-- Color swatches -->
        <div v-else-if="option.displayType === 'color'" class="flex flex-wrap gap-2.5">
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            class="w-9 h-9 border relative transition-all"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-30 cursor-not-allowed border-[#DAD2C4]'
                : optionValueState(option.id, value.id) === 'out_of_stock'
                  ? 'opacity-60 cursor-pointer border-[#DAD2C4]'
                  : 'cursor-pointer border-[#C4B8A4] hover:border-[#262019]',
              selectedOptions[option.id] === value.id ? 'outline outline-2 outline-offset-2 outline-[#262019]' : '',
            ]"
            :style="{ backgroundColor: value.meta || '#eee' }"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <span
              v-if="optionValueState(option.id, value.id) !== 'available'"
              class="absolute inset-0 flex items-center justify-center"
            >
              <span class="w-full h-px rotate-45" :class="optionValueState(option.id, value.id) === 'out_of_stock' ? 'bg-[#B8532E]' : 'bg-[#8A7E6E]'" />
            </span>
          </button>
        </div>

        <!-- Image swatches -->
        <div v-else-if="option.displayType === 'image'" class="flex flex-wrap gap-2.5">
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            class="w-16 h-16 border overflow-hidden relative transition-all"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-40 grayscale cursor-not-allowed border-[#DAD2C4]'
                : optionValueState(option.id, value.id) === 'out_of_stock'
                  ? 'opacity-70 cursor-pointer border-[#DAD2C4]'
                  : 'cursor-pointer border-[#C4B8A4] hover:border-[#262019]',
              selectedOptions[option.id] === value.id ? 'outline outline-2 outline-offset-2 outline-[#262019]' : '',
            ]"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <img v-if="value.meta" :src="value.meta" class="w-full h-full object-cover">
            <span v-else class="ed-ui text-[10px] text-[#8A7E6E] flex items-center justify-center h-full">{{ value.label }}</span>
            <span
              v-if="optionValueState(option.id, value.id) === 'out_of_stock'"
              class="absolute inset-x-0 bottom-0 bg-[#F4EFE6]/90 ed-ui text-[9px] font-semibold uppercase text-[#B8532E] text-center py-0.5"
            >Out</span>
          </button>
        </div>

        <!-- Radio -->
        <div v-else-if="option.displayType === 'radio'" class="space-y-2">
          <label
            v-for="value in option.values"
            :key="value.id"
            class="flex items-center gap-3 cursor-pointer"
          >
            <input
              type="radio"
              :name="option.id"
              :value="value.id"
              :checked="selectedOptions[option.id] === value.id"
              :disabled="isOptionValueUnavailable(option.id, value.id)"
              class="ed-radio"
              @change="setOptionIfAllowed(option.id, value.id)"
            >
            <span
              class="ed-ui text-sm"
              :class="{
                'text-[#8A7E6E] line-through': optionValueState(option.id, value.id) !== 'available',
                'text-[#B8532E]': optionValueState(option.id, value.id) === 'out_of_stock',
                'text-[#4A4038]': optionValueState(option.id, value.id) === 'available',
              }"
            >
              {{ value.label }}
              <span class="text-xs">{{ optionValueSuffix(option.id, value.id) }}</span>
            </span>
          </label>
        </div>

        <!-- Default: tag buttons -->
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="value in option.values"
            :key="value.id"
            class="px-4 py-2 border ed-ui text-[12px] uppercase tracking-[0.1em] transition-colors"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'border-[#DAD2C4] text-[#C4B8A4] cursor-not-allowed'
                : selectedOptions[option.id] === value.id
                  ? 'bg-[#262019] border-[#262019] text-[#F4EFE6]'
                  : optionValueState(option.id, value.id) === 'out_of_stock'
                    ? 'border-[#DAD2C4] text-[#B8532E]'
                    : 'border-[#C4B8A4] text-[#4A4038] hover:border-[#262019] hover:text-[#262019]',
            ]"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <span :class="{ 'line-through': optionValueState(option.id, value.id) !== 'available' }">{{ value.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mini description -->
    <p v-if="product?.miniDescription" class="text-[15px] text-[#4A4038] leading-relaxed pt-5 border-t border-[#DAD2C4]">
      {{ product.miniDescription }}
    </p>
  </div>
</template>

<style scoped>
.ed-radio {
  appearance: none;
  -webkit-appearance: none;
  width: 15px;
  height: 15px;
  border-radius: 999px;
  border: 1px solid var(--ed-rule-strong, #C4B8A4);
  background: var(--ed-card, #FBF8F2);
  flex-shrink: 0;
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.ed-radio:checked {
  border-width: 4px;
  border-color: var(--ed-ink, #262019);
}
.ed-radio:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
