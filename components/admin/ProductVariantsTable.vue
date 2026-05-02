<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium" style="color: var(--text-primary)">
        {{ t('admin.variantsTable.title') }}
      </h3>
      <p class="text-sm" style="color: var(--text-tertiary)">
        {{ t('admin.variantsTable.subtitle') }}
      </p>
    </div>

    <div class="overflow-x-auto ui-card">
      <table class="ui-table">
        <thead class="ui-thead">
          <tr>
            <th
              scope="col"
              class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6" style="color: var(--text-primary)"
            >
              {{ t('admin.variantsTable.columns.variant') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold" style="color: var(--text-primary)"
            >
              {{ t('admin.variantsTable.columns.price') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold" style="color: var(--text-primary)"
            >
              {{ t('admin.variantsTable.columns.cost') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold" style="color: var(--text-primary)"
            >
              {{ t('admin.variantsTable.columns.promotion', 'Promotion') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold" style="color: var(--text-primary)"
            >
              {{ t('admin.variantsTable.columns.track') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold" style="color: var(--text-primary)"
            >
              {{ t('admin.variantsTable.columns.onHand') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold" style="color: var(--text-primary)"
            >
              {{ t('admin.variantsTable.columns.reserved') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold" style="color: var(--text-primary)"
            >
              {{ t('admin.variantsTable.columns.safety') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold" style="color: var(--text-primary)"
            >
              {{ t('admin.variantsTable.columns.available') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold" style="color: var(--text-primary)"
            >
              {{ t('admin.variantsTable.columns.sku') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold" style="color: var(--text-primary)"
            >
              {{ t('admin.variantsTable.columns.barcode') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold" style="color: var(--text-primary)"
            >
              {{ t('admin.variantsTable.columns.active') }}
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold" style="color: var(--text-primary)"
            >
              {{ t('admin.variantsTable.columns.images') }}
            </th>
            <th
              scope="col"
              class="relative py-3.5 pl-3 pr-4 sm:pr-6"
            >
              <span class="sr-only">{{ t('admin.common.actions') }}</span>
            </th>
          </tr>
        </thead>
        <tbody class="ui-tbody">
          <tr
            v-for="variant in variants"
            :key="variant.id"
            class="ui-tr"
          >
            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6" style="color: var(--text-primary)">
              {{ getVariantTitle(variant) }}
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm " style="color: var(--text-secondary)">
              <input 
                v-model.number="variant.price" 
                type="number"
                class="ui-input w-24 py-1"
                @change="updateVariantInfo(variant)"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm " style="color: var(--text-secondary)">
              <input
                v-model.number="variant.cost"
                type="number"
                min="0"
                class="ui-input w-24 py-1"
                @change="updateVariantInfo(variant)"
              >
            </td>
            <td class="px-3 py-4 text-sm align-top" style="color: var(--text-secondary)">
              <div
                v-if="supportsVariantPromotion(variant)"
                :class="variant.isPromotionActive ? 'space-y-2 min-w-[16rem]' : 'min-w-[12rem]'"
              >
                <div class="flex items-center gap-2">
                  <input
                    :id="`variant-promo-active-${variant.id}`"
                    v-model="variant.isPromotionActive"
                    type="checkbox"
                    class="admin-checkbox"
                    @change="updateVariantInfo(variant)"
                  >
                  <label
                    :for="`variant-promo-active-${variant.id}`"
                    class="text-xs"
                    style="color: var(--text-primary)"
                  >
                    {{ t('admin.forms.product.isPromotionActive.label', 'Activer la promotion') }}
                  </label>
                </div>
                <div
                  v-if="variant.isPromotionActive"
                  class="space-y-2"
                >
                  <input
                    v-model.number="variant.promotionalPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    class="ui-input w-full py-1"
                    :placeholder="t('admin.forms.product.promotionalPrice.label', 'Prix promotionnel')"
                    @change="updateVariantInfo(variant)"
                  >
                  <input
                    v-model="variant.promotionStartDateInput"
                    type="datetime-local"
                    class="ui-input w-full py-1"
                    @change="updateVariantInfo(variant)"
                  >
                  <input
                    v-model="variant.promotionEndDateInput"
                    type="datetime-local"
                    class="ui-input w-full py-1"
                    @change="updateVariantInfo(variant)"
                  >
                  <label class="flex items-center gap-2 text-xs" style="color: var(--text-secondary)">
                    <input
                      v-model="variant.showCountdown"
                      type="checkbox"
                      class="admin-checkbox"
                      @change="updateVariantInfo(variant)"
                    >
                    {{ t('admin.forms.product.showCountdown.label', 'Afficher le compte à rebours') }}
                  </label>
                </div>
              </div>
              <p
                v-else
                class="max-w-[14rem] text-xs"
                style="color: var(--text-tertiary)"
              >
                {{ t('admin.variantsTable.promotionSimpleProduct', 'Use the product promotion tab for the default variant of a simple product.') }}
              </p>
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm" style="color: var(--text-secondary)">
              <input
                v-model="variant.trackInventory"
                type="checkbox"
                class="admin-checkbox"
                :disabled="savingInventoryIds.has(variant.id)"
                @change="updateVariantInventory(variant, { trackInventory: Boolean(variant.trackInventory) })"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm " style="color: var(--text-secondary)">
              <input
                v-model.number="variant.stock"
                type="number"
                min="0"
                class="ui-input w-24 py-1 font-mono"
                :disabled="savingStockIds.has(variant.id) || variant.trackInventory === false"
                @focus="rememberVariantServerState(variant)"
                @change="setVariantStock(variant)"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm" style="color: var(--text-secondary)">
              {{ Number(variant.reserved || 0) }}
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm " style="color: var(--text-secondary)">
              <input
                v-model.number="variant.safetyStock"
                type="number"
                min="0"
                class="ui-input w-24 py-1"
                :disabled="savingInventoryIds.has(variant.id)"
                @change="updateVariantInventory(variant, { safetyStock: Number(variant.safetyStock) })"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm" style="color: var(--text-secondary)">
              <span v-if="variant.trackInventory !== false">
                {{ getAvailable(variant) }}
              </span>
              <span v-else style="color: var(--text-muted)">∞</span>
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm " style="color: var(--text-secondary)">
              <div class="flex items-center gap-2">
                <input 
                  v-model="variant.sku" 
                  type="text"
                  class="ui-input w-32 py-1"
                  :disabled="variant.skuLocked === true"
                  @change="updateVariantInfo(variant)"
                >
                <button
                  v-if="variant.skuLocked !== true"
                  type="button"
                  class="text-xs px-2 py-1 rounded ui-btn ui-btn--secondary"
                  :disabled="suggestingSkuIds.has(variant.id)"
                  @click="suggestSku(variant)"
                >
                  {{ t('admin.variantsTable.actions.suggestSku') }}
                </button>
                <button
                  v-if="variant.skuLocked !== true"
                  type="button"
                  class="text-xs px-2 py-1 rounded ui-btn ui-btn--secondary"
                  :disabled="lockingSkuIds.has(variant.id)"
                  @click="lockSku(variant)"
                >
                  {{ t('admin.variantsTable.actions.lockSku') }}
                </button>
                <span
                  v-else
                  class="text-xs" style="color: var(--text-muted)"
                >
                  {{ t('admin.variantsTable.actions.skuLocked') }}
                </span>
              </div>
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm " style="color: var(--text-secondary)">
              <input
                v-model="variant.barcode"
                type="text"
                class="ui-input w-32 py-1"
                @change="updateVariantInfo(variant)"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm " style="color: var(--text-secondary)">
              <input 
                v-model="variant.isActive" 
                type="checkbox"
                class="admin-checkbox"
                @change="updateVariantInfo(variant)"
              >
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm " style="color: var(--text-secondary)">
              <button
                type="button"
                class="[color:var(--brand)] hover:[color:var(--brand)] font-medium"
                @click="openImageEditor(variant)"
              >
                {{ t('admin.variantsTable.actions.manageImages', { count: variant.images?.length || 0 }) }}
              </button>
            </td>
            <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
              <button
                type="button"
                class="hover:[color:rgba(var(--brand-rgb)/0.85)]" style="color: var(--text-secondary)"
                @click="openMovements(variant)"
              >
                {{ t('admin.variantsTable.actions.movements') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Movements modal -->
    <div
      v-if="movementsVariant"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div class="rounded-xl w-full max-w-3xl p-6 space-y-4" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 60px rgba(0,0,0,0.5)">
        <div class="flex items-start justify-between">
          <div class="min-w-0">
            <h4 class="text-lg font-semibold truncate" style="color: var(--text-primary)">
              {{ t('admin.variantsTable.movements.title') }} — {{ getVariantTitle(movementsVariant) }}
            </h4>
            <p class="text-sm " style="color: var(--text-secondary)">
              {{ t('admin.variantsTable.movements.subtitle') }}
            </p>
          </div>
          <button
            type="button"
            class="hover:text-white" style="color: var(--text-muted)"
            @click="closeMovements"
          >
            ✕
          </button>
        </div>

        <div
          v-if="movementsLoading"
          class="text-sm p-3 rounded border border-dashed" style="color: var(--text-secondary); background: var(--surface-2); border-color: var(--surface-border)"
        >
          {{ t('admin.variantsTable.movements.loading') }}
        </div>

        <div
          v-else-if="movements.length === 0"
          class="text-sm p-3 rounded border border-dashed" style="color: var(--text-secondary); background: var(--surface-2); border-color: var(--surface-border)"
        >
          {{ t('admin.variantsTable.movements.empty') }}
        </div>

        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="ui-table">
            <thead class="ui-thead">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium uppercase" style="color: var(--text-tertiary)">{{ t('admin.variantsTable.movements.columns.date') }}</th>
                <th class="px-3 py-2 text-left text-xs font-medium uppercase" style="color: var(--text-tertiary)">{{ t('admin.variantsTable.movements.columns.type') }}</th>
                <th class="px-3 py-2 text-left text-xs font-medium uppercase" style="color: var(--text-tertiary)">{{ t('admin.variantsTable.movements.columns.deltaStock') }}</th>
                <th class="px-3 py-2 text-left text-xs font-medium uppercase" style="color: var(--text-tertiary)">{{ t('admin.variantsTable.movements.columns.deltaReserved') }}</th>
                <th class="px-3 py-2 text-left text-xs font-medium uppercase" style="color: var(--text-tertiary)">{{ t('admin.variantsTable.movements.columns.deltaSafety') }}</th>
                <th class="px-3 py-2 text-left text-xs font-medium uppercase" style="color: var(--text-tertiary)">{{ t('admin.variantsTable.movements.columns.after') }}</th>
                <th class="px-3 py-2 text-left text-xs font-medium uppercase" style="color: var(--text-tertiary)">{{ t('admin.variantsTable.movements.columns.by') }}</th>
              </tr>
            </thead>
            <tbody class="ui-tbody">
              <tr v-for="m in movements" :key="m.id" class="ui-tr">
                <td class="px-3 py-2 text-sm" style="color: var(--text-secondary)">{{ formatDate(m.createdAt) }}</td>
                <td class="px-3 py-2 text-sm" style="color: var(--text-secondary)">
                  <div class="min-w-0">
                    <p class="truncate font-medium">{{ m.type }}</p>
                    <p v-if="m.orderId" class="truncate text-xs " style="color: var(--text-secondary)">{{ t('admin.variantsTable.movements.order', { id: m.orderId }) }}</p>
                  </div>
                </td>
                <td class="px-3 py-2 text-sm" style="color: var(--text-secondary)">{{ m.delta }}</td>
                <td class="px-3 py-2 text-sm" style="color: var(--text-secondary)">{{ m.reservedDelta }}</td>
                <td class="px-3 py-2 text-sm" style="color: var(--text-secondary)">{{ m.safetyStockDelta }}</td>
                <td class="px-3 py-2 text-sm" style="color: var(--text-secondary)">
                  <span v-if="m.stockAfter !== null">S={{ m.stockAfter }}</span><span v-else>—</span>
                  <span style="color: var(--text-muted)"> · </span>
                  <span v-if="m.reservedAfter !== null">R={{ m.reservedAfter }}</span><span v-else>—</span>
                  <span style="color: var(--text-muted)"> · </span>
                  <span v-if="m.safetyStockAfter !== null">SS={{ m.safetyStockAfter }}</span><span v-else>—</span>
                </td>
                <td class="px-3 py-2 text-sm" style="color: var(--text-secondary)">{{ m.createdBy?.email || t('admin.variantsTable.movements.system') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            class="ui-btn ui-btn--secondary ui-btn--md"
            @click="closeMovements"
          >
            {{ t('admin.common.close') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Image picker modal -->
    <div
      v-if="editingVariantId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div class="rounded-xl w-full max-w-xl p-6 space-y-4" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 60px rgba(0,0,0,0.5)">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="text-lg font-semibold" style="color: var(--text-primary)">
              {{ t('admin.variantsTable.imagePicker.title') }}
            </h4>
            <p class="text-sm " style="color: var(--text-secondary)">
              {{ t('admin.variantsTable.imagePicker.subtitle') }}
            </p>
          </div>
          <button
            type="button"
            class="hover:text-white" style="color: var(--text-muted)"
            @click="closeImageEditor"
          >
            ✕
          </button>
        </div>

        <div
          v-if="availableImages.length === 0"
          class="text-sm p-3 rounded border border-dashed" style="color: var(--text-secondary); background: var(--surface-2); border-color: var(--surface-border)"
        >
          {{ t('admin.variantsTable.imagePicker.empty') }}
        </div>

        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          <label
            v-for="img in availableImages"
            :key="img.url"
            class="rounded-lg p-2 flex flex-col gap-2 cursor-pointer hover:[border-color:rgba(var(--brand-rgb)/0.6)] transition-colors" style="border: 1px solid var(--surface-border)"
          >
            <div class="aspect-square overflow-hidden rounded-md" style="background: var(--surface-3); border: 1px solid var(--surface-border)">
              <img
                :src="img.url"
                class="w-full h-full object-cover"
                :alt="img.label || t('admin.variantsTable.imagePicker.imageFallback')"
              >
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="truncate" style="color: var(--text-secondary)">{{ img.label || t('admin.variantsTable.imagePicker.imageFallback') }}</span>
              <input
                type="checkbox"
                class="admin-checkbox"
                :checked="selectedImageUrls.has(img.url)"
                @change="toggleImage(img.url)"
              >
            </div>
          </label>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            class="ui-btn ui-btn--secondary text-sm"
            @click="closeImageEditor"
          >
            {{ t('admin.common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="savingImages"
            class="px-6 py-2 rounded-lg text-sm font-bold text-white shadow-lg [box-shadow:0_4px_14px_rgba(var(--brand-rgb)/0.2)] transition-all hover:[box-shadow:0_4px_14px_rgba(var(--brand-rgb)/0.3)] active:scale-95 flex items-center gap-2"
            :class="savingImages ? '[background:var(--brand)] cursor-not-allowed' : '[background:var(--brand)] hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)]'"
            @click="saveVariantImages"
          >
            <Icon v-if="savingImages" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
            {{ savingImages ? t('admin.common.saving') : t('admin.variantsTable.imagePicker.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { getVariantAvailableStock, PRODUCT_INFINITE_STOCK } from '~/shared/inventory/variant-availability'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
    productId: string
    variants: any[]
    options?: any[] // Added options to help sort title
    productImages?: any[]
    legacyImages?: string[]
}>()

const emit = defineEmits(['refresh'])
const authStore = useAuthStore()

function getVariantTitle(variant: any) {
    if (!variant.optionValues || variant.optionValues.length === 0) return t('admin.variantsTable.defaultVariant')
    
    // If we have options metadata, sort values by option position
    let values = [...variant.optionValues]
    if (props.options && props.options.length > 0) {
        // Map optionId -> Position
        const optionPos = new Map(props.options.map((o: any) => [o.id, o.position]))
        
        values.sort((a: any, b: any) => {
            const posA = optionPos.get(a.optionValue?.optionId) ?? 999
            const posB = optionPos.get(b.optionValue?.optionId) ?? 999
            return posA - posB
        })
    }

    return values.map((ov: any) => ov.optionValue?.label || '?').join(' / ')
}

function getAvailable(variant: any) {
    if (typeof variant?.availableStock === 'number') return Number(variant.availableStock)
    const stock = Number(variant.stock || 0)
    const reserved = Number(variant.reserved || 0)
    const safetyStock = Number(variant.safetyStock || 0)
    return Math.max(stock - reserved - safetyStock, 0)
}

function supportsVariantPromotion(variant: any) {
    return Array.isArray(variant?.optionValues) && variant.optionValues.length > 0
}

function toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function toIsoStringOrNull(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null
    const parsed = new Date(String(value))
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toISOString()
}

function rememberVariantServerState(variant: any) {
    if (!variant || typeof variant !== 'object') return
    if (!variant.__serverState || typeof variant.__serverState !== 'object') {
        variant.__serverState = {}
    }
}

function restoreVariantFromServer(variant: any) {
    const state = variant?.__serverState
    if (!state) return
    variant.price = state.price
    variant.cost = state.cost
    variant.sku = state.sku
    variant.barcode = state.barcode
    variant.isActive = state.isActive
    variant.compareAtPrice = state.compareAtPrice
    variant.promotionalPrice = state.promotionalPrice
    variant.isPromotionActive = state.isPromotionActive
    variant.promotionStartDateInput = state.promotionStartDateInput
    variant.promotionEndDateInput = state.promotionEndDateInput
    variant.showCountdown = state.showCountdown
    variant.stock = state.stock
    variant.reserved = state.reserved
    variant.safetyStock = state.safetyStock
    variant.trackInventory = state.trackInventory
    variant.availableStock = state.availableStock
}

function syncVariantServerState(variant: any) {
    variant.__serverState = {
        price: Number(variant?.price ?? 0),
        cost: variant?.cost != null ? Number(variant.cost) : null,
        sku: variant?.sku || '',
        barcode: variant?.barcode || '',
        isActive: variant?.isActive !== false,
        compareAtPrice: variant?.compareAtPrice != null ? Number(variant.compareAtPrice) : null,
        promotionalPrice: variant?.promotionalPrice != null ? Number(variant.promotionalPrice) : null,
        isPromotionActive: variant?.isPromotionActive === true,
        promotionStartDateInput: variant?.promotionStartDateInput || '',
        promotionEndDateInput: variant?.promotionEndDateInput || '',
        showCountdown: variant?.showCountdown === true,
        stock: Number(variant?.stock ?? 0),
        reserved: Number(variant?.reserved ?? 0),
        safetyStock: Number(variant?.safetyStock ?? 0),
        trackInventory: variant?.trackInventory !== false,
        availableStock: Number(
            variant?.availableStock ??
            getVariantAvailableStock(variant, { infiniteValue: PRODUCT_INFINITE_STOCK })
        )
    }
}

async function updateVariantInfo(variant: any) {
    rememberVariantServerState(variant)
    try {
        const updated = await $fetch(`/api/admin/variants/${variant.id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: {
                price: variant.price,
                cost: toNullableNumber(variant.cost),
                sku: variant.sku,
                barcode: variant.barcode,
                isActive: variant.isActive,
                compareAtPrice: toNullableNumber(variant.compareAtPrice),
                promotionalPrice: supportsVariantPromotion(variant) ? toNullableNumber(variant.promotionalPrice) : null,
                isPromotionActive: supportsVariantPromotion(variant) ? Boolean(variant.isPromotionActive) : false,
                promotionStartDate: supportsVariantPromotion(variant) ? toIsoStringOrNull(variant.promotionStartDateInput) : null,
                promotionEndDate: supportsVariantPromotion(variant) ? toIsoStringOrNull(variant.promotionEndDateInput) : null,
                showCountdown: supportsVariantPromotion(variant) ? Boolean(variant.showCountdown) : false
            }
        })

        if (updated && typeof updated === 'object') {
            variant.price = Number((updated as any).price ?? variant.price ?? 0)
            variant.cost = (updated as any).cost != null ? Number((updated as any).cost) : null
            variant.sku = (updated as any).sku || ''
            variant.barcode = (updated as any).barcode || ''
            variant.isActive = (updated as any).isActive !== false
            variant.compareAtPrice = (updated as any).compareAtPrice != null ? Number((updated as any).compareAtPrice) : null
            variant.promotionalPrice = (updated as any).promotionalPrice != null ? Number((updated as any).promotionalPrice) : null
            variant.isPromotionActive = (updated as any).isPromotionActive === true
            variant.promotionStartDateInput = (updated as any).promotionStartDate ? new Date((updated as any).promotionStartDate).toISOString().slice(0, 16) : ''
            variant.promotionEndDateInput = (updated as any).promotionEndDate ? new Date((updated as any).promotionEndDate).toISOString().slice(0, 16) : ''
            variant.showCountdown = (updated as any).showCountdown === true
            variant.availableStock = Number(
                (updated as any).availableStock ??
                getVariantAvailableStock({ ...variant, ...(updated as any) }, { infiniteValue: PRODUCT_INFINITE_STOCK })
            )
            syncVariantServerState(variant)
        }
    } catch (e) {
        console.error(e)
        restoreVariantFromServer(variant)
        alert((e as any)?.data?.statusMessage || t('admin.variantsTable.errors.updateVariantFailed'))
    }
}

const savingInventoryIds = ref<Set<string>>(new Set())
const savingStockIds = ref<Set<string>>(new Set())
const lockingSkuIds = ref<Set<string>>(new Set())
const suggestingSkuIds = ref<Set<string>>(new Set())

async function updateVariantInventory(variant: any, patch: any) {
    rememberVariantServerState(variant)
    savingInventoryIds.value.add(variant.id)
    try {
        const updated = await $fetch(`/api/admin/inventory/variants/${variant.id}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: {
                ...patch,
                reason: 'admin_product_variants'
            }
        })

        if (updated && typeof updated === 'object') {
            if (typeof (updated as any).stock === 'number') variant.stock = (updated as any).stock
            if (typeof (updated as any).reserved === 'number') variant.reserved = (updated as any).reserved
            if (typeof (updated as any).safetyStock === 'number') variant.safetyStock = (updated as any).safetyStock
            if (typeof (updated as any).trackInventory === 'boolean') variant.trackInventory = (updated as any).trackInventory
            variant.availableStock = Number(
                (updated as any).availableStock ??
                getVariantAvailableStock({ ...variant, ...(updated as any) }, { infiniteValue: PRODUCT_INFINITE_STOCK })
            )
            syncVariantServerState(variant)
        }
    } catch (e) {
        console.error(e)
        restoreVariantFromServer(variant)
        alert((e as any)?.data?.statusMessage || t('admin.variantsTable.errors.updateInventoryFailed'))
        emit('refresh')
    } finally {
        savingInventoryIds.value.delete(variant.id)
    }
}

async function setVariantStock(variant: any) {
    rememberVariantServerState(variant)
    const prev = Number(variant.__serverState?.stock ?? 0)
    const next = Number(variant.stock || 0)

    if (!Number.isFinite(next) || next < 0) {
        variant.stock = prev
        return alert(t('admin.variantsTable.errors.updateStockFailed'))
    }

    savingStockIds.value.add(variant.id)
    try {
        const updated = await $fetch(`/api/admin/inventory/variants/${variant.id}/stock/set`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: {
                stock: next,
                reason: 'admin_product_variants_table'
            }
        })

        if (updated && typeof updated === 'object') {
            if (typeof (updated as any).stock === 'number') variant.stock = (updated as any).stock
            if (typeof (updated as any).reserved === 'number') variant.reserved = (updated as any).reserved
            if (typeof (updated as any).safetyStock === 'number') variant.safetyStock = (updated as any).safetyStock
            if (typeof (updated as any).trackInventory === 'boolean') variant.trackInventory = (updated as any).trackInventory
            variant.availableStock = Number(
                (updated as any).availableStock ??
                getVariantAvailableStock({ ...variant, ...(updated as any) }, { infiniteValue: PRODUCT_INFINITE_STOCK })
            )
            syncVariantServerState(variant)
        }
    } catch (e) {
        console.error(e)
        restoreVariantFromServer(variant)
        alert((e as any)?.data?.statusMessage || t('admin.variantsTable.errors.updateStockFailed'))
        emit('refresh')
    } finally {
        savingStockIds.value.delete(variant.id)
    }
}

async function lockSku(variant: any) {
    lockingSkuIds.value.add(variant.id)
    try {
        const updated = await $fetch(`/api/admin/variants/${variant.id}/sku/lock`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authStore.token}` }
        })
        if (updated && typeof updated === 'object' && typeof (updated as any).skuLocked === 'boolean') {
            variant.skuLocked = (updated as any).skuLocked
        } else {
            variant.skuLocked = true
        }
    } catch (e) {
        console.error(e)
        alert(t('admin.variantsTable.errors.lockSkuFailed'))
        emit('refresh')
    } finally {
        lockingSkuIds.value.delete(variant.id)
    }
}

async function suggestSku(variant: any) {
    suggestingSkuIds.value.add(variant.id)
    try {
        const result = await $fetch(`/api/admin/variants/${variant.id}/sku/suggest`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
        }) as { sku: string; available: boolean }

        if (!result?.sku) {
            alert(t('admin.variantsTable.errors.suggestSkuFailed'))
            return
        }

        if (result.available !== true) {
            alert(t('admin.variantsTable.errors.suggestSkuUnavailable'))
            return
        }

        variant.sku = result.sku
        await updateVariantInfo(variant)
    } catch (e) {
        console.error(e)
        alert(t('admin.variantsTable.errors.suggestSkuFailed'))
    } finally {
        suggestingSkuIds.value.delete(variant.id)
    }
}

type Movement = {
    id: string
    type: string
    delta: number
    reservedDelta: number
    safetyStockDelta: number
    orderId: string | null
    stockAfter: number | null
    reservedAfter: number | null
    safetyStockAfter: number | null
    createdAt: string
    createdBy: { id: string; email: string } | null
}

const movementsVariant = ref<any | null>(null)
const movements = ref<Movement[]>([])
const movementsLoading = ref(false)

async function openMovements(variant: any) {
    movementsVariant.value = variant
    movements.value = []
    movementsLoading.value = true
    try {
        const data = await $fetch(`/api/admin/inventory/variants/${variant.id}/movements`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
        }) as Movement[]
        movements.value = data
    } catch (e) {
        console.error(e)
        movements.value = []
    } finally {
        movementsLoading.value = false
    }
}

function closeMovements() {
    movementsVariant.value = null
    movements.value = []
}

function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleString()
}

const editingVariantId = ref<string | null>(null)
const selectedImageUrls = ref<Set<string>>(new Set())
const savingImages = ref(false)

const availableImages = computed(() => {
    const list: { id: string | null; url: string; label: string }[] = []

    if (props.productImages && props.productImages.length > 0) {
        props.productImages.forEach((img: any, idx: number) => {
            if (!img?.url) return
            list.push({
                id: img.id ?? null,
                url: img.url,
                label: img.alt || img.label || t('admin.variantsTable.imagePicker.imageWithIndex', { index: idx + 1 })
            })
        })
    }

    if (props.legacyImages && props.legacyImages.length > 0) {
        props.legacyImages.forEach((url: string, idx: number) => {
            if (!url) return
            list.push({
                id: null,
                url,
                label: t('admin.variantsTable.imagePicker.imageWithIndex', { index: idx + 1 })
            })
        })
    }

    // Dedupe by URL while preserving order
    const seen = new Set<string>()
    return list.filter((img) => {
        if (seen.has(img.url)) return false
        seen.add(img.url)
        return true
    })
})

function openImageEditor(variant: any) {
    editingVariantId.value = variant.id
    const current = (variant.images || []).map((vi: any) => vi.image?.url || vi.url).filter(Boolean)
    selectedImageUrls.value = new Set(current)
}

function closeImageEditor() {
    editingVariantId.value = null
    selectedImageUrls.value = new Set()
}

function toggleImage(url: string) {
    const next = new Set(selectedImageUrls.value)
    if (next.has(url)) {
        next.delete(url)
    } else {
        next.add(url)
    }
    selectedImageUrls.value = next
}

async function saveVariantImages() {
    if (!editingVariantId.value) return
    savingImages.value = true
    try {
        const imageUrls = Array.from(selectedImageUrls.value)
        await $fetch(`/api/admin/variants/${editingVariantId.value}/images`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authStore.token}` },
            body: { imageUrls }
        })
        closeImageEditor()
        emit('refresh')
    } catch (e) {
        console.error('Failed to save variant images', e)
        const message = (e as any)?.data?.statusMessage || (e as any)?.message || t('admin.variantsTable.errors.saveImagesFailed')
        alert(message)
    } finally {
        savingImages.value = false
    }
}
</script>
