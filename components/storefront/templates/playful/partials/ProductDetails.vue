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

const { format: formatPrice } = useCurrency();
const storefrontContent = useStorefrontContent();

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
  if (state === 'out_of_stock') return `(${storefrontContent.value.productForm.stock.outOfStock})`;
  if (state === 'unavailable') return `(${storefrontContent.value.productForm.stock.unavailable})`;
  return '';
};

const setOptionIfAllowed = (optionId: string, valueId: string) => {
  if (isOptionValueUnavailable(optionId, valueId)) return;
  setOption(optionId, valueId);
};

const discountPercent = computed(() => {
  const full = Number(props.originalPrice ?? 0);
  if (!full || full <= props.currentPrice) return 0;
  return Math.round(((full - props.currentPrice) / full) * 100);
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
  <div class="flex flex-col gap-7">
    <!-- ══ Title + price ═══════════════════════════════════════════════ -->
    <div>
      <h1 class="kw-display text-3xl md:text-[2.5rem] mb-5">
        {{ product?.title }}
      </h1>

      <div class="flex flex-wrap items-baseline gap-3 mb-6">
        <span class="kw-num text-[2.4rem] leading-none text-[var(--kw-pink-deep)]">{{ formatPrice(currentPrice) }}</span>
        <span
          v-if="discountPercent > 0"
          class="text-lg font-bold text-[var(--kw-ink-faint)] line-through"
        >{{ formatPrice(originalPrice!) }}</span>
        <span
          v-if="discountPercent > 0"
          class="kw-badge kw-badge-sale"
        >-{{ discountPercent }}%</span>
      </div>

      <StorefrontSharedCountdownTimer
        v-if="product?.showCountdown && product?.promotionEndDate"
        :end-date="product.promotionEndDate"
        theme="danger"
        show-icon
        class="mb-6"
      />

      <div
        class="flex items-center gap-3 rounded-[var(--kw-r)] px-4 py-3.5"
        style="background: var(--kw-lemon-soft)"
      >
        <span class="relative flex h-3 w-3 flex-shrink-0">
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70"
            style="background: var(--kw-lemon-deep)"
          />
          <span
            class="relative inline-flex rounded-full h-3 w-3"
            style="background: var(--kw-lemon-deep)"
          />
        </span>
        <span class="text-sm font-bold text-[var(--kw-ink)]">
          <strong class="font-extrabold">{{ $t('storefront.product.highDemandBadge') }}</strong>
          {{ $t('storefront.product.viewingRightNow', { count: 15 }) }}
        </span>
      </div>
    </div>

    <!-- ══ Options ═════════════════════════════════════════════════════ -->
    <div
      v-if="product?.options && product.options.length > 0"
      class="space-y-6"
      :class="{ 'vux-invite': hasUnselectedOptions, 'vux-invite-nudge': optionNudge }"
    >
      <p
        v-if="hasUnselectedOptions"
        class="vux-invite-hint inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--kw-pink-deep)]"
      >
        <Icon
          name="lucide:arrow-down"
          class="w-3.5 h-3.5"
        />
        {{ storefrontContent.productForm.chooseOptionsPrompt }}
      </p>

      <div
        v-for="option in product.options"
        :key="option.id"
      >
        <label class="kw-label !ms-0">{{ option.name }}</label>

        <!-- Dropdown -->
        <div
          v-if="option.displayType === 'dropdown'"
          class="relative max-w-xs"
        >
          <select
            :value="selectedOptions[option.id] || ''"
            class="kw-field appearance-none cursor-pointer pe-11"
            @change="setOption(option.id, ($event.target as HTMLSelectElement).value)"
          >
            <option
              value=""
              disabled
            >
              {{ option.name }}
            </option>
            <option
              v-for="value in option.values"
              :key="value.id"
              :value="value.id"
              :disabled="isOptionValueUnavailable(option.id, value.id)"
            >
              {{ value.label }} {{ optionValueSuffix(option.id, value.id) }}
            </option>
          </select>
          <Icon
            name="lucide:chevron-down"
            class="w-4 h-4 absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--kw-ink-faint)]"
          />
        </div>

        <!-- Colour -->
        <div
          v-else-if="option.displayType === 'color'"
          class="flex flex-wrap gap-3"
        >
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            class="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 relative"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-30 cursor-not-allowed'
                : selectedOptions[option.id] === value.id
                  ? 'scale-110'
                  : 'hover:scale-105',
            ]"
            :style="{
              backgroundColor: value.meta || '#eee',
              boxShadow: selectedOptions[option.id] === value.id
                ? '0 0 0 3px var(--kw-surface), 0 0 0 5px var(--kw-pink-deep)'
                : '0 0 0 2px var(--kw-line)'
            }"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <Icon
              v-if="selectedOptions[option.id] === value.id"
              name="lucide:check"
              class="w-4 h-4 text-white drop-shadow"
            />
            <span
              v-if="optionValueState(option.id, value.id) !== 'available'"
              class="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden"
            >
              <span
                class="w-full h-0.5 rotate-45"
                :class="optionValueState(option.id, value.id) === 'out_of_stock' ? 'bg-red-500/70' : 'bg-[var(--kw-ink-faint)]'"
              />
            </span>
          </button>
        </div>

        <!-- Image swatches -->
        <div
          v-else-if="option.displayType === 'image'"
          class="flex flex-wrap gap-3"
        >
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            class="w-16 h-16 kw-blob overflow-hidden transition-all duration-300 relative"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-40 grayscale cursor-not-allowed'
                : selectedOptions[option.id] === value.id
                  ? '-translate-y-1'
                  : 'hover:-translate-y-0.5',
            ]"
            :style="{
              background: 'var(--kw-pink-soft)',
              boxShadow: selectedOptions[option.id] === value.id ? '0 0 0 3px var(--kw-pink-deep)' : '0 0 0 2px var(--kw-line)'
            }"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <img
              v-if="value.meta"
              :src="value.meta"
              class="w-full h-full object-cover"
              :alt="value.label"
            >
            <span
              v-else
              class="text-[10px] font-extrabold p-1 text-center block"
            >{{ value.label }}</span>
            <span
              v-if="optionValueState(option.id, value.id) === 'out_of_stock'"
              class="absolute inset-x-1 bottom-1 rounded-full bg-white/95 text-[9px] font-extrabold text-red-600 px-1 py-0.5 text-center"
            >{{ storefrontContent.productForm.stock.outOfStock }}</span>
          </button>
        </div>

        <!-- Radio -->
        <div
          v-else-if="option.displayType === 'radio'"
          class="space-y-2.5"
        >
          <label
            v-for="value in option.values"
            :key="value.id"
            :for="`${option.id}-${value.id}`"
            class="flex items-center gap-2.5 cursor-pointer"
          >
            <input
              :id="`${option.id}-${value.id}`"
              type="radio"
              :name="option.id"
              :value="value.id"
              :checked="selectedOptions[option.id] === value.id"
              :disabled="isOptionValueUnavailable(option.id, value.id)"
              class="w-4 h-4 accent-[var(--kw-pink-deep)] disabled:opacity-50"
              @change="setOptionIfAllowed(option.id, value.id)"
            >
            <span
              class="text-sm font-bold"
              :class="{
                'text-[var(--kw-ink-faint)] line-through': optionValueState(option.id, value.id) !== 'available',
                'text-red-600': optionValueState(option.id, value.id) === 'out_of_stock',
              }"
            >
              {{ value.label }}
              <span class="text-xs font-semibold ms-1">{{ optionValueSuffix(option.id, value.id) }}</span>
            </span>
          </label>
        </div>

        <!-- Default: candy pills -->
        <div
          v-else
          class="flex flex-wrap gap-2.5"
        >
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            class="kw-chip"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'opacity-45 cursor-not-allowed'
                : selectedOptions[option.id] === value.id
                  ? 'kw-chip-on'
                  : '',
            ]"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            :title="`${value.label} ${optionValueSuffix(option.id, value.id)}`.trim()"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <span :class="{ 'line-through': optionValueState(option.id, value.id) !== 'available' }">{{ value.label }}</span>
            <span
              v-if="optionValueState(option.id, value.id) !== 'available'"
              class="text-[10px] font-bold"
            >{{ optionValueSuffix(option.id, value.id) }}</span>
          </button>
        </div>
      </div>
    </div>

    <p
      v-if="product?.miniDescription"
      class="kw-lede"
    >
      {{ product.miniDescription }}
    </p>
  </div>
</template>
