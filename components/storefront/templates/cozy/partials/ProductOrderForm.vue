<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'

const props = defineProps<{
    product: any
    currentVariant: any
    currentPrice: number
    currentStock: number
    activeImage: string
}>()

const router = useRouter()
const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')
const { currencyCode, format: formatCurrency } = useCurrency()
const codEnabled = computed(() => storeSettings.value?.codEnabled !== false && storeSettings.value?.cartEnabled !== false)
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false)

const orderSubmitting = ref(false)
const addToCartSubmitting = ref(false)
const showSuccess = ref(false)
const successTitle = ref('')
const successMessage = ref('')
const orderError = ref('')
const quantity = ref(1)
const LOW_STOCK_THRESHOLD = 5

const totalPrice = computed(() => {
    return (props.currentPrice || 0) * quantity.value
})

const hasVariants = computed(() => Array.isArray(props.product?.variants) && props.product.variants.length > 0)

const maxQuantity = computed(() => {
    if (props.currentVariant?.trackInventory === false) return 99
    const stock = Number(props.currentStock ?? 0)
    return Math.max(0, stock)
})

const isInStock = computed(() => {
    if (props.product?.isActive === false) return false
    if (hasVariants.value && !props.currentVariant) return false
    if (props.currentVariant?.trackInventory === false) return true
    return maxQuantity.value > 0
})

const isOutOfStock = computed(() => !isInStock.value)

const isLowStock = computed(() => {
    if (!isInStock.value) return false
    if (props.currentVariant?.trackInventory === false) return false
    return maxQuantity.value > 0 && maxQuantity.value <= LOW_STOCK_THRESHOLD
})

const canPurchase = computed(() => isInStock.value)

const cartStockCap = computed(() => (props.currentVariant?.trackInventory === false ? 9999 : maxQuantity.value))

const incrementQuantity = () => {
    if (!canPurchase.value) return
    if (maxQuantity.value > 0 && quantity.value >= maxQuantity.value) return
    quantity.value++
}

const decrementQuantity = () => {
    if (!canPurchase.value) return
    if (quantity.value > 1) {
        quantity.value--
    }
}

const quickForm = reactive({
    fullName: '',
    phone: '',
    wilaya: '',
    commune: '',
    address: ''
})

onMounted(() => {
    cartStore.loadFromLocalStorage()
})

watch(() => props.currentVariant, () => {
    quantity.value = 1
})

watch([() => props.currentStock, () => props.currentVariant], () => {
    if (!canPurchase.value) {
        quantity.value = 1
        return
    }
    if (maxQuantity.value > 0 && quantity.value > maxQuantity.value) {
        quantity.value = Math.max(1, maxQuantity.value)
    }
})

function getVariantTitle(variant: any) {
    if (!variant.optionValues || variant.optionValues.length === 0) return ''
    
    let values = [...variant.optionValues]
    if (props.product.options && props.product.options.length > 0) {
       const optionPos = new Map(props.product.options.map((o: any) => [o.id, o.position]))
        values.sort((a: any, b: any) => {
            const posA = optionPos.get(a.optionValue?.optionId) ?? 999
            const posB = optionPos.get(b.optionValue?.optionId) ?? 999
            return (posA as number) - (posB as number)
        })
    }
    
    return values.map((ov: any) => ov.optionValue?.label).join(' / ')
}

const triggerSuccessToast = (title: string, message: string) => {
    successTitle.value = title
    successMessage.value = message
    showSuccess.value = true
    setTimeout(() => { showSuccess.value = false }, 3000)
}

const handleOrderSubmit = async () => {
    if (!props.product) return
    orderError.value = ''

    if (!canPurchase.value) {
        orderError.value = 'This variant is out of stock.'
        return
    }

    if (codEnabled.value && !quickForm.fullName.trim()) {
        orderError.value = 'Please fill in your full name.'
        return
    }

    if (codEnabled.value && !quickForm.phone.trim()) {
        orderError.value = 'Phone number is required.'
        return
    }

    orderSubmitting.value = true

    try {
        const payload = {
            customerName: quickForm.fullName.trim(),
            customerPhone: quickForm.phone.trim(),
            customerAddress: quickForm.address?.trim() || undefined,
            shippingAddressLine1: quickForm.address?.trim() || undefined,
            shippingWilayaCode: quickForm.wilaya || undefined,
            shippingCommuneCode: quickForm.commune || undefined,
            deliveryMode: 'home',
            items: [
                {
                    productId: props.product.id,
                    variantId: props.currentVariant?.id,
                    quantity: quantity.value
                }
            ]
        }

        const response = await $fetch<{ orderId: string }>(useTenantApiUrl('/api/orders'), {
            method: 'POST',
            body: payload,
            headers: {
                ...(useTenantApiHeaders() || {})
            }
        })

        triggerSuccessToast('Order received!', 'We will contact you shortly.')
        cartStore.clearCart()
        quickForm.fullName = ''
        quickForm.phone = ''
        quickForm.wilaya = ''
        quickForm.commune = ''
        quickForm.address = ''

        router.push({
            path: '/order-success',
            query: { orderId: response.orderId }
        })
    } catch (error: any) {
        console.error('Quick order failed:', error)
        orderError.value = error?.data?.statusMessage || error?.data?.message || 'Failed to place order. Please try again.'
    } finally {
        orderSubmitting.value = false
    }
}

const handleAddToCart = async () => {
    if (!props.product) return
    if (!canPurchase.value) {
        triggerSuccessToast('Out of stock', 'Please select an in-stock option.')
        return
    }
    addToCartSubmitting.value = true

    const variantLabel = props.currentVariant ? getVariantTitle(props.currentVariant) : ''

    cartStore.addItem({
        productId: props.product.id,
        variantId: props.currentVariant?.id,
        title: props.product.title + (variantLabel ? ` (${variantLabel})` : ''),
        slug: props.product.slug,
        price: props.currentPrice,
        stock: cartStockCap.value,
        image: props.activeImage,
        quantity: quantity.value
    })

    triggerSuccessToast('Added to basket', 'View your basket to checkout.')
    addToCartSubmitting.value = false
}
</script>

<template>
  <div class="space-y-6">
    <!-- Quantity Selector -->
    <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
      <div class="flex flex-col gap-0.5">
        <span class="font-medium text-slate-700">Quantity</span>
        <span v-if="product?.isActive === false" class="text-xs text-slate-400">Unavailable</span>
        <span v-else-if="isOutOfStock" class="text-xs text-red-500 font-medium">Out of stock</span>
        <span v-else-if="isLowStock" class="text-xs text-amber-600 font-medium">
          Only {{ maxQuantity }} left
        </span>
        <span v-else class="text-xs text-green-600 font-medium">In stock</span>
      </div>
      <div class="flex items-center bg-white rounded-full border border-slate-200">
        <button 
          type="button"
          class="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-l-full transition-colors disabled:opacity-30"
          :disabled="!canPurchase || quantity <= 1"
          @click="decrementQuantity"
        >
          <Icon name="lucide:minus" class="w-4 h-4 text-slate-500" />
        </button>
        <span class="w-12 text-center font-bold text-slate-700">{{ quantity }}</span>
        <button 
          type="button"
          class="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-r-full transition-colors disabled:opacity-30"
          :disabled="!canPurchase || (maxQuantity > 0 && quantity >= maxQuantity)"
          @click="incrementQuantity"
        >
          <Icon name="lucide:plus" class="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </div>

    <!-- Quick COD Order Form -->
    <div
      v-if="codEnabled"
      data-test="cod-order-card"
      class="bg-white p-6 rounded-[2rem] shadow-soft border border-slate-100"
    >
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-full flex items-center justify-center bg-brand-100 text-brand-500">
          <Icon name="lucide:banknote" class="w-5 h-5" />
        </div>
        <div>
          <h3 class="font-bold text-slate-800">Quick Order</h3>
          <span class="text-xs text-slate-400">Cash on Delivery</span>
        </div>
      </div>
      
      <form class="space-y-4" @submit.prevent="handleOrderSubmit">
        <div>
          <label class="block text-sm font-medium text-slate-600 mb-2">Full Name</label>
          <input 
            v-model="quickForm.fullName"
            type="text" 
            placeholder="John Doe" 
            class="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-600 mb-2">Phone Number</label>
          <input
            v-model="quickForm.phone"
            type="tel"
            placeholder="0XXXXXXXXX"
            class="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
          >
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-2">Wilaya</label>
            <div class="relative">
              <select
                v-model="quickForm.wilaya"
                class="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none appearance-none cursor-pointer"
              >
                <option value="">Select...</option>
                <option value="16">Algiers</option>
                <option value="31">Oran</option>
              </select>
              <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Icon name="lucide:chevron-down" class="w-4 h-4" />
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-2">Commune</label>
            <input
              v-model="quickForm.commune"
              type="text"
              placeholder="Bab Ezzouar"
              class="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
            >
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-600 mb-2">Address (Optional)</label>
          <input
            v-model="quickForm.address"
            type="text"
            placeholder="Street, building, apartment"
            class="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none transition-all"
          >
        </div>

        <div
          v-if="orderError"
          class="p-3 bg-red-50 rounded-xl text-red-600 text-sm"
        >
          {{ orderError }}
        </div>

        <!-- Total Price Display -->
        <div class="flex items-center justify-between p-4 bg-brand-50 rounded-xl">
          <span class="text-slate-600 font-medium">Total Price:</span>
          <span class="font-bold text-xl text-brand-500">{{ formatCurrency(totalPrice) }}</span>
        </div>

        <button 
          type="submit"
          :disabled="orderSubmitting || !canPurchase"
          class="w-full bg-brand-500 text-white font-bold py-4 rounded-full shadow-lg shadow-brand-200 hover:bg-brand-600 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Icon v-if="orderSubmitting" name="lucide:loader-2" class="w-5 h-5 animate-spin" />
          <span>{{ orderSubmitting ? 'Processing...' : 'Confirm Order' }}</span>
        </button>
      </form>
    </div>

    <!-- Add to Cart Button -->
    <div v-if="cartEnabled">
      <button 
        type="button"
        :disabled="addToCartSubmitting || !canPurchase"
        class="w-full bg-slate-800 text-white font-bold py-4 rounded-full hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        @click="handleAddToCart"
      >
        <Icon name="lucide:handbag" class="w-5 h-5" />
        <span>{{ addToCartSubmitting ? 'Adding...' : 'Add to Basket' }}</span>
      </button>
    </div>
    
    <!-- Success Toast -->
    <Transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSuccess"
        class="fixed bottom-4 right-4 z-50 bg-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4"
      >
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
          <Icon name="lucide:check" class="w-5 h-5 text-green-600" />
        </div>
        <div>
          <div class="font-bold text-slate-800">{{ successTitle }}</div>
          <div class="text-sm text-slate-500">{{ successMessage }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
