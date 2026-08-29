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
  if (state === 'out_of_stock') return '(Rupture)';
  if (state === 'unavailable') return '(Indisponible)';
  return '';
};

const setOptionIfAllowed = (optionId: string, valueId: string) => {
  if (!isOptionValueUnavailable(optionId, valueId))
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
  <div class="details">
    <!-- Title block -->
    <div class="details__head">
      <span class="at-label">{{
        product?.category?.title || 'Pistachio'
      }}</span>
      <h1 class="details__title">{{ product?.title }}</h1>

      <StorefrontSharedCountdownTimer
        v-if="product?.showCountdown && product?.promotionEndDate"
        :end-date="product.promotionEndDate"
        theme="danger"
        show-icon
        class="details__countdown"
      />

      <div class="details__price-row">
        <span class="details__price">{{ formatPrice(currentPrice) }}</span>
        <span v-if="product?.compareAtPrice" class="details__price-compare">
          {{ formatPrice(product.compareAtPrice) }}
        </span>
      </div>
    </div>

    <!-- Options -->
    <div
      v-if="product?.options && product.options.length > 0"
      class="details__options"
      :class="{ 'vux-invite': hasUnselectedOptions, 'vux-invite-nudge': optionNudge }"
    >
      <p
        v-if="hasUnselectedOptions"
        class="vux-invite-hint inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600"
      >
        <Icon name="lucide:arrow-down" class="w-3.5 h-3.5" />
        {{ $t('storefront.productForm.chooseOptionsPrompt') }}
      </p>
      <div
        v-for="option in product.options"
        :key="option.id"
        class="details__option"
      >
        <label class="details__option-label">{{ option.name }}</label>

        <!-- Dropdown -->
        <div
          v-if="option.displayType === 'dropdown'"
          class="details__select-wrap"
        >
          <select
            :value="selectedOptions[option.id] || ''"
            class="at-select"
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
          <svg
            width="8"
            height="5"
            viewBox="0 0 8 5"
            fill="none"
            class="details__select-arrow"
          >
            <path d="M1 1l3 3 3-3" stroke="currentColor" stroke-width="0.85" />
          </svg>
        </div>

        <!-- Color swatch -->
        <div
          v-else-if="option.displayType === 'color'"
          class="details__swatches"
        >
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            class="details__color-swatch"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'is-unavailable'
                : '',
              selectedOptions[option.id] === value.id ? 'is-selected' : '',
            ]"
            :style="{ backgroundColor: value.meta || '#555' }"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <svg
              v-if="selectedOptions[option.id] === value.id"
              width="10"
              height="8"
              viewBox="0 0 10 8"
              fill="none"
            >
              <path
                d="M1 4l3 3 5-6"
                stroke="white"
                stroke-width="1"
                filter="drop-shadow(0 0 1px rgba(0,0,0,0.6))"
              />
            </svg>
          </button>
        </div>

        <!-- Image swatch -->
        <div
          v-else-if="option.displayType === 'image'"
          class="details__img-swatches"
        >
          <button
            v-for="value in option.values"
            :key="value.id"
            type="button"
            class="details__img-swatch"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'is-unavailable'
                : '',
              selectedOptions[option.id] === value.id ? 'is-selected' : '',
            ]"
            :disabled="isOptionValueUnavailable(option.id, value.id)"
            @click="setOptionIfAllowed(option.id, value.id)"
          >
            <img
              v-if="value.meta"
              :src="value.meta"
              class="details__img-swatch-img"
            />
            <span v-else class="details__img-swatch-label">{{
              value.label
            }}</span>
          </button>
        </div>

        <!-- Default buttons -->
        <div v-else class="details__option-btns">
          <button
            v-for="value in option.values"
            :key="value.id"
            class="details__option-btn"
            :class="[
              optionValueState(option.id, value.id) === 'unavailable'
                ? 'is-unavailable'
                : '',
              selectedOptions[option.id] === value.id ? 'is-selected' : '',
              optionValueState(option.id, value.id) === 'out_of_stock'
                ? 'is-oos'
                : '',
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
    <p v-if="product?.miniDescription" class="details__mini-desc">
      {{ product.miniDescription }}
    </p>
  </div>
</template>

<style scoped>
.details {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.details__head {
  margin-bottom: 24px;
}
.details__title {
  font-family: var(--at-f-display);
  font-size: clamp(1.8rem, 3vw, 2.8rem);
  font-weight: 600;
  letter-spacing: -0.028em;
  line-height: 1.1;
  color: var(--at-cream);
  margin: 8px 0 16px;
}
.details__countdown {
  margin-bottom: 12px;
}
.details__price-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.details__price {
  font-family: var(--at-f-display);
  font-size: 2.15rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  color: var(--at-cream);
}
/* A price that came down is stated in the skin rose, not in the house green. */
.details__price-row:has(.details__price-compare) .details__price { color: var(--at-skin); }
.details__price-compare {
  font-family: var(--at-f-mono);
  font-size: 13px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  color: var(--at-muted);
  text-decoration: line-through;
  text-decoration-color: var(--at-skin-soft);
}

/* Options */
.details__options {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--at-border);
}
.details__option {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.details__option-label {
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--at-sub);
}

.details__select-wrap {
  position: relative;
  max-width: 280px;
}
.details__select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--at-muted);
  pointer-events: none;
}

.details__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.details__color-swatch {
  width: 32px;
  height: 32px;
  border-radius: var(--at-r-pill);
  border: 2px solid var(--at-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.15s,
    opacity 0.15s,
    transform 0.15s;
}
.details__color-swatch.is-selected {
  border-color: var(--at-cream);
  box-shadow: var(--at-ring);
  transform: scale(1.1);
}
.details__color-swatch.is-unavailable {
  opacity: 0.25;
  cursor: not-allowed;
}

.details__img-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.details__img-swatch {
  width: 56px;
  height: 56px;
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-sm);
  overflow: hidden;
  cursor: pointer;
  position: relative;
  background: none;
  padding: 0;
  transition:
    border-color 0.15s,
    opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.details__img-swatch.is-selected {
  border-color: var(--at-gold);
  box-shadow: var(--at-ring);
}
.details__img-swatch.is-unavailable {
  opacity: 0.35;
  filter: grayscale(1);
  cursor: not-allowed;
}
.details__img-swatch-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.details__img-swatch-label {
  font-family: var(--at-f-mono);
  font-size: 9px;
  color: var(--at-sub);
}

.details__option-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.details__option-btn {
  padding: 9px 16px;
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-pill);
  background: var(--at-surface);
  color: var(--at-sub);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s,
    box-shadow 0.15s;
}
.details__option-btn:hover {
  border-color: var(--at-gold);
  color: var(--at-gold-700);
  background: var(--at-surface-2);
}
.details__option-btn.is-selected {
  border-color: transparent;
  background: var(--at-grad-green);
  color: #FFFBF0;
  box-shadow: var(--at-shadow-green);
}
.details__option-btn.is-unavailable {
  opacity: 0.25;
  cursor: not-allowed;
  text-decoration: line-through;
}
.details__option-btn.is-oos {
  color: var(--at-skin);
  border-color: var(--at-skin-soft);
  background: var(--at-skin-dim);
}

/* Mini desc */
.details__mini-desc {
  padding-top: 20px;
  border-top: 1px solid var(--at-border);
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  line-height: 1.9;
  color: var(--at-sub);
  margin-top: 4px;
}
</style>
