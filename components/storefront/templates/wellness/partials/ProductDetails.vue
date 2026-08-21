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
</script>

<template>
  <div class="flex flex-col">
    <!-- Header -->
    <div>
      <span class="wl-eyebrow wl-label mb-4">
        Premium Collection
      </span>

      <h1
        class="wl-display text-4xl md:text-5xl text-wl-ink leading-[1.02] mb-6"
      >
        {{ product?.title }}
      </h1>

      <StorefrontSharedCountdownTimer
        v-if="product?.showCountdown && product?.promotionEndDate"
        :end-date="product.promotionEndDate"
        theme="danger"
        show-icon
        class="mb-5"
      />

      <!-- Price sits on its own ruled line, the way a label states a dose -->
      <div class="border-t border-t-wl-rule border-b-2 border-b-wl-olive py-4">
        <span class="wl-num wl-display text-3xl text-wl-ink">
          {{ formatPrice(currentPrice) }}
        </span>
      </div>
    </div>

    <!-- Option Selectors -->
    <div
      v-if="product?.options && product.options.length > 0"
      class="space-y-7 mt-8"
    >
      <div v-for="option in product.options" :key="option.id">
        <label
          class="block wl-label text-wl-muted mb-3"
          >{{ option.name }}</label
        >

        <!-- Dropdown Type -->
        <div v-if="option.displayType === 'dropdown'" class="relative max-w-xs">
          <select
            :value="selectedOptions[option.id] || ''"
            @change="
              setOption(option.id, ($event.target as HTMLSelectElement).value)
            "
            class="wl-field block w-full h-12 px-4 pe-10 appearance-none cursor-pointer"
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
            class="absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none text-wl-muted"
          >
            <Icon name="lucide:chevron-down" class="w-4 h-4" />
          </div>
        </div>

        <!-- Color Swatch Type -->
        <div
          v-else-if="option.displayType === 'color'"
          class="flex flex-wrap gap-2"
        >
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            :class="[
              'w-11 h-11 flex items-center justify-center transition-all duration-200 relative border',
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-30 cursor-not-allowed'
                : optionValueState(option.id, value.id) === 'out_of_stock'
                  ? 'opacity-60 cursor-pointer'
                  : 'cursor-pointer',
              selectedOptions[option.id] === value.id
                ? 'border-wl-olive ring-1 ring-wl-olive ring-offset-2 ring-offset-wl-card'
                : 'border-wl-rule hover:border-wl-oliveSoft',
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
              class="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            />
            <div
              v-if="optionValueState(option.id, value.id) !== 'available'"
              class="absolute inset-0 flex items-center justify-center"
            >
              <div
                class="w-full h-px rotate-45 transform"
                :class="
                  optionValueState(option.id, value.id) === 'out_of_stock'
                    ? 'bg-wl-saffron'
                    : 'bg-wl-muted'
                "
              />
            </div>
          </button>
        </div>

        <!-- Image Type -->
        <div
          v-else-if="option.displayType === 'image'"
          class="flex flex-wrap gap-2"
        >
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            :class="[
              'w-20 h-20 border transition-colors duration-200 overflow-hidden relative',
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-40 grayscale cursor-not-allowed border-wl-rule'
                : optionValueState(option.id, value.id) === 'out_of_stock'
                  ? 'opacity-70 cursor-pointer border-wl-rule'
                  : 'cursor-pointer hover:border-wl-oliveSoft',
              selectedOptions[option.id] === value.id
                ? 'border-wl-olive ring-1 ring-wl-olive'
                : 'border-wl-rule',
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
              alt=""
              class="w-full h-full object-cover"
            />
            <span v-else class="wl-label text-wl-muted">{{ value.label }}</span>
            <div
              v-if="optionValueState(option.id, value.id) === 'out_of_stock'"
              class="absolute inset-x-0 bottom-0 bg-wl-card/95 wl-label text-wl-saffron px-1 py-0.5 text-center"
            >
              Out
            </div>
          </button>
        </div>

        <!-- Radio Buttons: ruled rows, like a form on a label -->
        <div v-else-if="option.displayType === 'radio'" class="border-t border-wl-rule">
          <div
            v-for="value in option.values"
            :key="value.id"
            class="flex items-center group cursor-pointer py-3 border-b border-wl-rule"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <div class="relative flex items-center justify-center w-4 h-4 me-3 flex-shrink-0">
              <div
                class="w-4 h-4 border transition-colors"
                :class="
                  selectedOptions[option.id] === value.id
                    ? 'border-wl-olive'
                    : 'border-wl-ruleStrong group-hover:border-wl-oliveSoft'
                "
              ></div>
              <div
                class="w-2 h-2 bg-wl-olive absolute transition-transform duration-150"
                :class="
                  selectedOptions[option.id] === value.id
                    ? 'scale-100'
                    : 'scale-0'
                "
              ></div>
            </div>

            <span
              class="text-sm text-wl-ink group-hover:text-wl-ink transition-colors"
              :class="{
                'text-wl-muted line-through':
                  optionValueState(option.id, value.id) !== 'available',
                '!text-wl-saffron':
                  optionValueState(option.id, value.id) === 'out_of_stock',
              }"
            >
              {{ value.label }}
              <span class="wl-label ms-1.5 text-wl-muted">{{
                optionValueSuffix(option.id, value.id)
              }}</span>
            </span>
          </div>
        </div>

        <!-- Default Tags -->
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="value in option.values"
            :key="value.id"
            class="px-5 py-2.5 wl-label border transition-colors duration-200 relative"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'bg-wl-paper text-wl-muted/50 border-wl-rule cursor-not-allowed'
                : selectedOptions[option.id] === value.id
                  ? 'bg-wl-ink text-wl-paper border-wl-ink shadow-[inset_0_-3px_0_0_theme(colors.wl.olive)]'
                  : optionValueState(option.id, value.id) === 'out_of_stock'
                    ? 'bg-wl-saffronWash text-wl-saffron border-wl-saffron/40 hover:border-wl-saffron'
                    : 'bg-wl-card text-wl-muted border-wl-rule hover:border-wl-olive hover:text-wl-oliveDeep',
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
              class="ms-2"
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
      class="text-wl-muted mt-8 leading-relaxed border-s-2 border-wl-olive ps-4"
    >
      {{ product.miniDescription }}
    </p>
  </div>
</template>
