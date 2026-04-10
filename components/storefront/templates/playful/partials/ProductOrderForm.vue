<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'
import { DZ_WILAYAS } from '~/shared/geo/dz'

const props = defineProps<{
    product: any
    currentVariant: any
    currentPrice: number
    currentStock: number
    activeImage: string
}>()

const router = useRouter()
const cartStore = useCartStore()
const storefrontContent = useStorefrontContent()
const storeSettings = useState<any>('storeSettings')
const metaPixel = useMetaPixel()
const codEnabled = computed(() => storeSettings.value?.codEnabled !== false && storeSettings.value?.cartEnabled !== false)
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false)
const wilayas = DZ_WILAYAS

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

const selectBundleQty = (qty: number) => {
    if (!canPurchase.value) return
    const cap = maxQuantity.value > 0 ? maxQuantity.value : qty
    quantity.value = Math.max(1, Math.min(qty, cap))
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
        orderError.value = storefrontContent.value.productForm.errors.outOfStockVariant
        return
    }

    if (codEnabled.value && !quickForm.fullName.trim()) {
        orderError.value = storefrontContent.value.checkout.errors.fullNameRequired
        return
    }

    if (codEnabled.value && !quickForm.phone.trim()) {
        orderError.value = storefrontContent.value.checkout.errors.phoneRequired
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

        const currency = storeSettings.value?.currencyCode || 'DZD'
        metaPixel.initiateCheckout({
            contents: [
                {
                    id: props.product.id,
                    quantity: quantity.value,
                    item_price: Number(props.currentPrice || 0)
                }
            ],
            numItems: quantity.value,
            value: totalPrice.value,
            currency,
            pixelIds: (props.product as any)?.metaPixelIds
        })

        const response = await $fetch<{ orderId: string }>(useTenantApiUrl('/api/orders'), {
            method: 'POST',
            body: payload,
            headers: {
                ...(useTenantApiHeaders() || {})
            }
        })

        triggerSuccessToast(
            storefrontContent.value.toasts.orderReceived.title,
            storefrontContent.value.toasts.orderReceived.message
        )
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
        orderError.value =
            error?.data?.statusMessage ||
            error?.data?.message ||
            storefrontContent.value.checkout.errors.submitFailed
    } finally {
        orderSubmitting.value = false
    }
}

const handleAddToCart = async () => {
    if (!props.product) return
    if (!canPurchase.value) {
        triggerSuccessToast(
            storefrontContent.value.actions.outOfStock,
            storefrontContent.value.toasts.outOfStock.message
        )
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
        bundleDeals: props.product?.bundleDeals || [],
        stock: cartStockCap.value,
        image: props.activeImage,
        quantity: quantity.value,
        metaPixelIds: (props.product as any)?.metaPixelIds
    })

    triggerSuccessToast(
        storefrontContent.value.toasts.addedToCart.title,
        storefrontContent.value.toasts.addedToCart.message
    )
    addToCartSubmitting.value = false
}

// Mobile Sticky Buy Bar Logic
const mainOrderFormRef = ref<HTMLElement | null>(null)
const showStickyBar = ref(false)

onMounted(() => {
    cartStore.loadFromLocalStorage()
    
    // Setup observer to detect when main form is out of view
    const observer = new IntersectionObserver((entries) => {
        const entry = entries[0]
        // Show sticky bar when the main form is NOT intersecting (out of view)
        showStickyBar.value = !entry.isIntersecting
    }, {
        root: null,
        threshold: 0.1, // Trigger when 10% of form is visible
        rootMargin: '0px 0px -20% 0px' // Offset to trigger slightly before it's completely gone
    })

    if (mainOrderFormRef.value) {
        observer.observe(mainOrderFormRef.value)
    }

    onUnmounted(() => {
        if (mainOrderFormRef.value) observer.unobserve(mainOrderFormRef.value)
        observer.disconnect()
    })
})

const scrollToForm = () => {
    if (mainOrderFormRef.value) {
        // Calculate position slightly above the form to give it some breathing room
        const yOffset = -20; 
        const y = mainOrderFormRef.value.getBoundingClientRect().top + window.scrollY + yOffset;
        
        window.scrollTo({ top: y, behavior: 'smooth' })
        
        // If the form is focused, the user can immediately interact
        setTimeout(() => {
           if (codEnabled.value && quickForm.fullName === '') {
               const firstInput = document.querySelector('input[type="text"]') as HTMLElement
               if (firstInput) firstInput.focus()
           }
        }, 500)
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }
}
</script>

<template>
    <div>
        <!-- Quantity Selector (Global for both COD and Cart) -->
        <div class="flex items-center justify-between p-4 bg-white rounded-3xl border-4 border-purple-100 shadow-sm mb-6">
            <div class="flex flex-col gap-0.5">
                <span class="font-semibold text-slate-700">{{ storefrontContent.productForm.quantity.label }}</span>
                <span v-if="product?.isActive === false" class="text-xs font-semibold text-slate-500">{{ storefrontContent.productForm.stock.unavailable }}</span>
                <span v-else-if="isOutOfStock" class="text-xs font-semibold text-red-700">{{ storefrontContent.productForm.stock.outOfStock }}</span>
                <span v-else-if="isLowStock" class="text-xs font-semibold text-amber-700">
                    {{ storefrontContent.productForm.stock.lowStock(maxQuantity) }}
                </span>
                <span v-else class="text-xs font-semibold text-emerald-700">{{ storefrontContent.product.inStock }}</span>
            </div>
            <div class="flex items-center bg-slate-50 rounded-xl shadow-inner border border-slate-200 p-1">
                <button 
                    type="button"
                    class="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
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
                    class="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    :disabled="!canPurchase || (maxQuantity > 0 && quantity >= maxQuantity)"
                    @click="incrementQuantity"
                >
                    <Icon name="lucide:plus" class="w-4 h-4" />
                </button>
            </div>
        </div>

        <!-- Testimonial / Social Proof -->
        <div class="mb-6 bg-brand-50 rounded-[2rem] p-4 border-4 border-brand-100 flex items-center gap-4 shadow-sm relative overflow-hidden">
            <!-- Subtle background shine -->
            <div class="absolute top-0 right-0 -m-4 w-24 h-24 bg-brand-200/30 rounded-full blur-2xl"></div>
            
            <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 relative z-10">
                <img src="https://i.pravatar.cc/100?img=5" alt="Customer" class="w-full h-full object-cover">
            </div>
            <div class="relative z-10">
                <p class="text-sm font-bold text-slate-800 leading-tight">"Loved it, will buy again!"</p>
                <div class="flex text-yellow-400 my-0.5 drop-shadow-sm">
                    <Icon name="lucide:star" class="w-3 h-3 fill-current" />
                    <Icon name="lucide:star" class="w-3 h-3 fill-current" />
                    <Icon name="lucide:star" class="w-3 h-3 fill-current" />
                    <Icon name="lucide:star" class="w-3 h-3 fill-current" />
                    <Icon name="lucide:star" class="w-3 h-3 fill-current" />
                </div>
                <p class="text-xs text-slate-500 font-medium">Susanae from NY city just bought one!</p>
            </div>
        </div>

        <BundleDealsPicker
            :bundle-deals="product?.bundleDeals || []"
            :unit-price="currentPrice"
            :max-quantity="maxQuantity"
            :disabled="!canPurchase"
            @select-qty="selectBundleQty"
        />

        <!-- Quick COD Order Form -->
        <div
            v-if="codEnabled"
            ref="mainOrderFormRef"
            data-test="cod-order-card"
            class="bg-white rounded-[2rem] p-6 md:p-8 shadow-soft border-4 border-purple-100 relative overflow-hidden"
        >
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-brand-600" />
            
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 shadow-sm ring-1 ring-brand-100">
                <Icon name="lucide:banknote" class="w-5 h-5" />
                </div>
                <div>
                <h3 class="font-sans font-bold text-slate-900 text-xl leading-none">{{ storefrontContent.productForm.cod.title }}</h3>
                <span class="text-xs text-slate-500 font-medium">{{ storefrontContent.productForm.cod.badge }}</span>
                </div>
            </div>
            
            <form class="space-y-5" @submit.prevent="handleOrderSubmit">
                <div class="space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.fullName.label }}</label>
                <input 
                    v-model="quickForm.fullName"
                    type="text" 
                    :placeholder="storefrontContent.checkout.form.fullName.placeholder" 
                    class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                    :class="{ 'animate-attention': !quickForm.fullName }"
                >
                </div>
                
                <div class="space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.phone.label }}</label>
                <input
                    v-model="quickForm.phone"
                    type="tel"
                    :placeholder="storefrontContent.checkout.form.phone.placeholder"
                    class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                >
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-slate-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                    <div class="relative">
                    <select
                        v-model="quickForm.wilaya"
                        class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm"
                    >
                        <option value="" disabled>{{ storefrontContent.common.selectPlaceholder }}</option>
                        <option
                          v-for="w in wilayas"
                          :key="w.code"
                          :value="w.code"
                        >
                          {{ w.code }} - {{ w.name }}
                        </option>
                    </select>
                    <div class="absolute right-4 rtl:right-auto rtl:left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <Icon name="lucide:chevron-down" class="w-4 h-4 rtl:rotate-180" />
                    </div>
                    </div>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-slate-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.commune.label }}</label>
                    <CommuneField
                        v-model="quickForm.commune"
                        :wilaya-code="quickForm.wilaya"
                        :placeholder="storefrontContent.checkout.form.commune.placeholder"
                        :input-class="'block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm'"
                        :select-class="'block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm'"
                    />
                </div>
                </div>

                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-slate-700 ml-1 rtl:ml-0 rtl:mr-1">{{ storefrontContent.checkout.form.address.label }}</label>
                    <input
                        v-model="quickForm.address"
                        type="text"
                        :placeholder="storefrontContent.checkout.form.address.placeholder"
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
                <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span class="text-slate-600 font-medium">{{ storefrontContent.productForm.totalPrice }}</span>
                    <span class="text-xl font-bold text-brand-600">{{ totalPrice }} {{ storeSettings?.currencyCode || 'DZD' }}</span>
                </div>

                <button 
                type="submit"
                :disabled="orderSubmitting || !canPurchase"
                class="w-full h-14 bg-brand-500 hover:bg-brand-400 text-white font-black text-xl rounded-full shadow-[0_6px_0_0_#7e22ce] hover:-translate-y-1 active:translate-y-2 active:shadow-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 mt-6 group overflow-hidden relative"
                >
                <!-- Animated Shine Effect -->
                <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shine z-0"></div>

                <span class="relative z-10 flex items-center gap-2" :class="{ 'opacity-0': orderSubmitting }">
                    <span>{{ orderSubmitting ? storefrontContent.productForm.cod.submitting : storefrontContent.productForm.cod.submit }}</span>
                    <Icon name="lucide:arrow-right" class="w-6 h-6 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5 rtl:rotate-180 transition-transform duration-300" />
                </span>
                            
                <div v-if="orderSubmitting" class="absolute inset-0 flex items-center justify-center z-10">
                    <Icon name="lucide:loader-2" class="animate-spin h-6 w-6 text-white" />
                </div>
                </button>
            </form>
        </div>

        <!-- Add to Cart Button (Only if Cart is Enabled) -->
        <div v-if="cartEnabled" class="mt-4">
            <button 
                type="button"
                :disabled="addToCartSubmitting || !canPurchase"
                class="w-full h-14 bg-brand-50 border-4 border-brand-200 text-brand-600 hover:bg-brand-100 font-bold text-lg rounded-full transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 hover:shadow-sm"
                @click="handleAddToCart"
            >
                <Icon name="lucide:shopping-bag" class="w-5 h-5" />
                <span>{{ addToCartSubmitting ? storefrontContent.actions.adding : storefrontContent.actions.addToCart }}</span>
            </button>
        </div>

        <!-- Trust Badges -->
        <div class="mt-8 space-y-4">
            <p class="text-center font-semibold text-slate-400 text-sm mb-4">{{ $t('storefront.product.whyChooseUs') }}</p>
            <div class="grid grid-cols-3 gap-2">
                <div class="flex flex-col items-center text-center gap-2 p-2 rounded-2xl bg-white border-4 border-purple-100 py-3 transition-shadow">
                    <div class="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                        <Icon name="lucide:truck" class="w-5 h-5" />
                    </div>
                    <span class="text-[10px] font-bold text-slate-700 leading-tight">{{ $t('storefront.product.features.delivery') }}</span>
                </div>
                <div class="flex flex-col items-center text-center gap-2 p-2 rounded-2xl bg-white border-4 border-purple-100 py-3 transition-shadow">
                    <div class="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                        <Icon name="lucide:headset" class="w-5 h-5" />
                    </div>
                    <span class="text-[10px] font-bold text-slate-700 leading-tight">{{ $t('storefront.product.features.support') }}</span>
                </div>
                <div class="flex flex-col items-center text-center gap-2 p-2 rounded-2xl bg-white border-4 border-purple-100 py-3 transition-shadow">
                    <div class="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                        <Icon name="lucide:shield-check" class="w-5 h-5" />
                    </div>
                    <span class="text-[10px] font-bold text-slate-700 leading-tight">{{ $t('storefront.product.features.securePayment') }}</span>
                </div>
            </div>
            
            <div class="mt-6 flex items-center justify-center gap-4 text-slate-400">
                <Icon name="lucide:credit-card" class="h-6 w-auto" />
                <Icon name="lucide:smartphone" class="h-6 w-auto" />
                <Icon name="lucide:banknote" class="h-6 w-auto" />
            </div>
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
            class="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-700/50 backdrop-blur-md bg-slate-900/95"
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

        <!-- Mobile Sticky Buy Bar -->
        <Transition
        enter-active-class="transform transition ease-out duration-300"
        enter-from-class="translate-y-full"
        enter-to-class="translate-y-0"
        leave-active-class="transform transition ease-in duration-200"
        leave-from-class="translate-y-0"
        leave-to-class="translate-y-full"
        >
        <div 
            v-if="showStickyBar && codEnabled" 
            class="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] p-4 md:hidden flex items-center justify-between gap-4"
        >
            <div class="flex flex-col">
                <span class="text-xs text-slate-500 font-medium">Total</span>
                <span class="text-xl font-bold text-brand-600 leading-none">{{ totalPrice }} {{ storeSettings?.currencyCode || 'DZD' }}</span>
            </div>
            <button
                type="button"
                :disabled="!canPurchase"
                @click="scrollToForm"
                class="flex-1 h-14 bg-brand-500 hover:bg-brand-400 text-white font-black text-lg rounded-full shadow-[0_6px_0_0_#7e22ce] hover:-translate-y-1 active:translate-y-2 active:shadow-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-2 flex items-center justify-center gap-2 relative overflow-hidden group"
            >
                <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shine z-0"></div>
                <span class="relative z-10 flex items-center gap-2">
                    <span>{{ storefrontContent.productForm.cod.submit }}</span>
                    <Icon name="lucide:arrow-right" class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
            </button>
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
