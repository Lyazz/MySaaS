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

        triggerSuccessToast('Order received!', 'We will contact you shortly to confirm your order.')
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

    triggerSuccessToast('Added to cart', 'Review your cart to complete checkout.')
    addToCartSubmitting.value = false
}
</script>

<template>
  <div class="mt-8 pt-8 border-t-4 border-black">
    <!-- Quantity Selector -->
    <div class="flex items-center justify-between p-4 bg-gray-100 border-2 border-black mb-6">
        <div class="flex flex-col gap-0.5">
            <span class="font-street text-xl uppercase">Quantity</span>
            <span v-if="product?.isActive === false" class="text-xs font-mono uppercase text-gray-500">Unavailable</span>
            <span v-else-if="isOutOfStock" class="text-xs font-mono uppercase text-red-700 font-bold">Out of stock</span>
            <span v-else-if="isLowStock" class="text-xs font-mono uppercase text-orange-700 font-bold">
                Low stock: {{ maxQuantity }} left
            </span>
            <span v-else class="text-xs font-mono uppercase text-green-700 font-bold">In stock</span>
        </div>
        <div class="flex items-center border-2 border-black">
            <button 
                type="button"
                class="w-10 h-10 flex items-center justify-center hover:bg-brand transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                :disabled="!canPurchase || quantity <= 1"
                @click="decrementQuantity"
            >
                <Icon name="lucide:minus" class="w-4 h-4" />
            </button>
            <span class="w-12 text-center bg-white font-mono font-bold py-2">{{ quantity }}</span>
            <button 
                type="button"
                class="w-10 h-10 flex items-center justify-center hover:bg-brand transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                :disabled="!canPurchase || (maxQuantity > 0 && quantity >= maxQuantity)"
                @click="incrementQuantity"
            >
                <Icon name="lucide:plus" class="w-4 h-4" />
            </button>
        </div>
    </div>

    <!-- Quick COD Order Form -->
    <div
        v-if="codEnabled"
        data-test="cod-order-card"
        class="bg-white border-4 border-black p-6 shadow-[8px_8px_0_0_var(--brand)] relative overflow-hidden mb-6"
    >
        <div class="absolute top-0 left-0 w-full h-1 bg-brand" />
        
        <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 border-2 border-black flex items-center justify-center bg-brand">
              <Icon name="lucide:banknote" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-street text-2xl uppercase leading-none">Order Now</h3>
              <span class="text-xs font-mono uppercase text-gray-500">Cash on Delivery (COD)</span>
            </div>
        </div>
        
        <form class="space-y-4" @submit.prevent="handleOrderSubmit">
            <div class="space-y-2">
              <label class="block font-street text-lg uppercase">Full Name</label>
              <input 
                  v-model="quickForm.fullName"
                  type="text" 
                  placeholder="JOHN DOE" 
                  class="block w-full bg-gray-100 border-2 border-black p-3 font-mono uppercase focus:shadow-[4px_4px_0_0_var(--brand)] outline-none"
              >
            </div>
            
            <div class="space-y-2">
              <label class="block font-street text-lg uppercase">Phone Number</label>
              <input
                  v-model="quickForm.phone"
                  type="tel"
                  placeholder="0XXXXXXXXX"
                  class="block w-full bg-gray-100 border-2 border-black p-3 font-mono focus:shadow-[4px_4px_0_0_var(--brand)] outline-none"
              >
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                  <label class="block font-street text-lg uppercase">Wilaya</label>
                  <div class="relative">
                    <select
                        v-model="quickForm.wilaya"
                        class="block w-full bg-gray-100 border-2 border-black p-3 font-mono uppercase focus:shadow-[4px_4px_0_0_var(--brand)] outline-none appearance-none cursor-pointer"
                    >
                        <option value="">Select...</option>
                        <option value="16">Algiers</option>
                        <option value="31">Oran</option>
                    </select>
                    <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Icon name="lucide:chevron-down" class="w-4 h-4" />
                    </div>
                  </div>
              </div>
              <div class="space-y-2">
                  <label class="block font-street text-lg uppercase">Commune</label>
                  <input
                    v-model="quickForm.commune"
                    type="text"
                    placeholder="Bab Ezzouar"
                    class="block w-full bg-gray-100 border-2 border-black p-3 font-mono focus:shadow-[4px_4px_0_0_var(--brand)] outline-none"
                  >
              </div>
            </div>

            <div class="space-y-2">
                <label class="block font-street text-lg uppercase">Address (Optional)</label>
                <input
                    v-model="quickForm.address"
                    type="text"
                    placeholder="Street, building, apartment"
                    class="block w-full bg-gray-100 border-2 border-black p-3 font-mono focus:shadow-[4px_4px_0_0_var(--brand)] outline-none"
                >
            </div>

            <div
                v-if="orderError"
                class="p-3 border-2 border-black bg-red-100 font-mono text-sm uppercase text-red-700"
            >
                {{ orderError }}
            </div>

            <!-- Total Price Display -->
            <div class="flex items-center justify-between p-4 bg-black text-white">
                <span class="font-mono uppercase">Total Price:</span>
                <span class="font-street text-2xl">{{ formatCurrency(totalPrice) }}</span>
            </div>

            <button 
              type="submit"
              :disabled="orderSubmitting || !canPurchase"
              class="w-full bg-brand border-2 border-black py-4 font-street text-2xl uppercase shadow-[6px_6px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Icon v-if="orderSubmitting" name="lucide:loader-2" class="w-6 h-6 animate-spin" />
              <span>{{ orderSubmitting ? 'Processing...' : 'Confirm Order' }}</span>
            </button>
        </form>
    </div>

    <!-- Add to Cart Button -->
    <div v-if="cartEnabled">
        <button 
            type="button"
            :disabled="addToCartSubmitting || !canPurchase"
            class="w-full bg-white border-4 border-black py-4 font-street text-2xl uppercase hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            @click="handleAddToCart"
        >
            <Icon name="lucide:handbag" class="w-6 h-6" />
            <span>{{ addToCartSubmitting ? 'Adding...' : 'Add to Cart' }}</span>
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
          class="fixed bottom-4 right-4 z-50 bg-black text-white px-6 py-4 border-4 border-brand shadow-[8px_8px_0_0_var(--brand)] flex items-center gap-4"
      >
          <div class="w-8 h-8 bg-brand flex items-center justify-center border-2 border-black shrink-0">
            <Icon name="lucide:check" class="w-5 h-5" />
          </div>
          <div>
            <div class="font-street text-lg uppercase">{{ successTitle }}</div>
            <div class="text-xs font-mono text-gray-300 uppercase">{{ successMessage }}</div>
          </div>
      </div>
    </Transition>
  </div>
</template>
