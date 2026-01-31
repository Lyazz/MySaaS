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
    
    // Sort logic
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
    <div>
        <!-- Quantity Selector (Global for both COD and Cart) -->
        <div class="flex items-center justify-between p-4 bg-white rounded-sm border border-stone-200 shadow-sm mb-6">
            <div class="flex flex-col gap-0.5">
                <span class="font-semibold text-slate-700">Quantity</span>
                <span v-if="product?.isActive === false" class="text-xs font-semibold text-slate-500">Unavailable</span>
                <span v-else-if="isOutOfStock" class="text-xs font-semibold text-red-700">Out of stock</span>
                <span v-else-if="isLowStock" class="text-xs font-semibold text-amber-700">
                    Low stock: {{ maxQuantity }} left
                </span>
                <span v-else class="text-xs font-semibold text-emerald-700">In stock</span>
            </div>
            <div class="flex items-center bg-[#fdfbf7] rounded-sm shadow-inner border border-stone-200 p-1">
                <button 
                    type="button"
                    class="w-10 h-10 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-sm transition-colors"
                    :disabled="!canPurchase || quantity <= 1"
                    @click="decrementQuantity"
                >
                    <Icon name="lucide:minus" class="w-4 h-4" />
                </button>
                <input 
                    v-model.number="quantity" 
                    type="number" 
                    min="1" 
                    :max="maxQuantity"
                    class="w-12 text-center border-none bg-transparent font-bold text-slate-900 focus:ring-0 p-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    readonly
                >
                <button 
                    type="button"
                    class="w-10 h-10 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-sm transition-colors"
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
            class="bg-white rounded-sm p-6 md:p-8 shadow-sm border border-stone-200 relative overflow-hidden"
        >
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-brand-600" />
            
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 rounded-sm bg-brand-50 flex items-center justify-center text-brand-700 shadow-sm ring-1 ring-brand-100">
                <Icon name="lucide:banknote" class="w-5 h-5" />
                </div>
                <div>
                <h3 class="font-stationery font-bold text-slate-900 text-xl leading-none">Order Now</h3>
                <span class="text-xs text-slate-500 font-medium">Cash on Delivery (COD)</span>
                </div>
            </div>
            
            <form class="space-y-5" @submit.prevent="handleOrderSubmit">
                <div class="space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1">Full Name</label>
                <input 
                    v-model="quickForm.fullName"
                    type="text" 
                    placeholder="e.g. John Doe" 
                    class="block w-full h-12 rounded-sm border border-stone-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200 outline-none shadow-sm"
                    :class="{ 'animate-attention': !quickForm.fullName }"
                >
                </div>
                
                <div class="space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1">Phone Number</label>
                <input
                    v-model="quickForm.phone"
                    type="tel"
                    placeholder="e.g. 0550 12 34 56"
                    class="block w-full h-12 rounded-sm border border-stone-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200 outline-none shadow-sm"
                >
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-slate-700 ml-1">Wilaya</label>
                    <div class="relative">
                    <select
                        v-model="quickForm.wilaya"
                        class="block w-full h-12 rounded-sm border border-stone-300 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm"
                    >
                        <option value="">Select...</option>
                        <option value="16">Algiers</option>
                        <option value="31">Oran</option>
                    </select>
                    <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <Icon name="lucide:chevron-down" class="w-4 h-4" />
                    </div>
                    </div>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-slate-700 ml-1">Commune</label>
                    <input
                    v-model="quickForm.commune"
                    type="text"
                    placeholder="e.g. Bab Ezzouar"
                    class="block w-full h-12 rounded-sm border border-stone-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200 outline-none shadow-sm"
                    >
                </div>
                </div>

                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-slate-700 ml-1">Address (optional)</label>
                    <input
                        v-model="quickForm.address"
                        type="text"
                        placeholder="Street, building, apartment"
                        class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                    >
                </div>

                <div
                    v-if="orderError"
                    class="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm"
                >
                    {{ orderError }}
                </div>

                <!-- Total Price Display -->
                <div class="flex items-center justify-between p-4 bg-[#fdfbf7] rounded-sm border border-stone-200">
                    <span class="text-slate-600 font-medium">Total Price:</span>
                    <span class="text-xl font-bold text-brand-600">{{ totalPrice }} {{ storeSettings?.currencyCode || 'DZD' }}</span>
                </div>

                <button 
                type="submit"
                :disabled="orderSubmitting || !canPurchase"
                class="w-full h-14 bg-slate-900 hover:bg-brand-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold text-lg rounded-sm shadow-md transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 mt-6 group overflow-hidden relative"
                >
                <span class="relative z-10 flex items-center gap-2" :class="{ 'opacity-0': orderSubmitting }">
                    <span>{{ orderSubmitting ? 'Submitting...' : 'Confirm Order' }}</span>
                    <Icon name="lucide:arrow-right" class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                            
                <div v-if="orderSubmitting" class="absolute inset-0 flex items-center justify-center">
                    <Icon name="lucide:loader-2" class="animate-spin h-6 w-6 text-white" />
                </div>
                </button>
            </form>
        </div>

        <!-- Add to Cart Button (Only if Cart is Enabled) -->
        <div v-if="cartEnabled" class="mt-6">
            <button 
                type="button"
                :disabled="addToCartSubmitting || !canPurchase"
                class="w-full h-14 bg-white border border-slate-900 text-slate-900 hover:bg-slate-50 font-bold text-lg rounded-sm transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                @click="handleAddToCart"
            >
                    <Icon name="lucide:handbag" class="w-5 h-5" />
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
            class="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-6 py-4 rounded-sm shadow-xl flex items-center gap-4 border border-slate-700/50 backdrop-blur-md bg-slate-900/95"
        >
            <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
            <Icon name="lucide:check" class="w-5 h-5" />
            </div>
            <div>
            <div class="font-bold">{{ successTitle }}</div>
            <div class="text-xs text-slate-300">{{ successMessage }}</div>
            </div>
        </div>
        </Transition>
    </div>
</template>

<style scoped>
.animate-attention {
    animation: attentionCaptivate 3s infinite cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes attentionCaptivate {
    0%, 100% { border-color: #e2e8f0; box-shadow: 0 0 0 0 rgba(0,0,0,0); transform: scale(1); background-color: white; }
    50% { border-color: var(--brand); box-shadow: 0 0 20px -5px color-mix(in srgb, var(--brand), transparent 50%); transform: scale(1.02); background-color: color-mix(in srgb, var(--brand), white 98%); }
}
</style>
