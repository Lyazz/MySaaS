<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useTenantApiHeaders, useTenantApiUrl } from '~/composables/useTenantApi'
import BundleDealsPicker from './BundleDealsPicker.vue'
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

const totalPrice = computed(() => (props.currentPrice || 0) * quantity.value)
const hasVariants = computed(() => Array.isArray(props.product?.variants) && props.product.variants.length > 0)
const maxQuantity = computed(() => { if (props.currentVariant?.trackInventory === false) return 99; return Math.max(0, Number(props.currentStock ?? 0)) })
const isInStock = computed(() => {
    if (props.product?.isActive === false) return false
    if (hasVariants.value && !props.currentVariant) return false
    if (props.currentVariant?.trackInventory === false) return true
    return maxQuantity.value > 0
})
const isOutOfStock = computed(() => !isInStock.value)
const isLowStock = computed(() => isInStock.value && props.currentVariant?.trackInventory !== false && maxQuantity.value > 0 && maxQuantity.value <= LOW_STOCK_THRESHOLD)
const canPurchase = computed(() => isInStock.value)
const cartStockCap = computed(() => props.currentVariant?.trackInventory === false ? 9999 : maxQuantity.value)

const incrementQuantity = () => { if (!canPurchase.value) return; if (maxQuantity.value > 0 && quantity.value >= maxQuantity.value) return; quantity.value++ }
const decrementQuantity = () => { if (!canPurchase.value) return; if (quantity.value > 1) quantity.value-- }
const selectBundleQty = (qty: number) => { if (!canPurchase.value) return; quantity.value = Math.max(1, Math.min(qty, maxQuantity.value || qty)) }

const quickForm = reactive({ fullName: '', phone: '', wilaya: '', commune: '', address: '' })

onMounted(() => cartStore.loadFromLocalStorage())
watch(() => props.currentVariant, () => { quantity.value = 1 })
watch([() => props.currentStock, () => props.currentVariant], () => {
    if (!canPurchase.value) { quantity.value = 1; return }
    if (maxQuantity.value > 0 && quantity.value > maxQuantity.value) quantity.value = Math.max(1, maxQuantity.value)
})

function getVariantTitle(variant: any) {
    if (!variant.optionValues?.length) return ''
    let values = [...variant.optionValues]
    if (props.product?.options?.length) {
        const optionPos = new Map(props.product.options.map((o: any) => [o.id, o.position]))
        values.sort((a: any, b: any) => ((optionPos.get(a.optionValue?.optionId) ?? 999) as number) - ((optionPos.get(b.optionValue?.optionId) ?? 999) as number))
    }
    return values.map((ov: any) => ov.optionValue?.label).join(' / ')
}

const triggerSuccessToast = (title: string, message: string) => {
    successTitle.value = title; successMessage.value = message; showSuccess.value = true
    setTimeout(() => { showSuccess.value = false }, 3000)
}

const handleOrderSubmit = async () => {
    if (!props.product) return
    orderError.value = ''
    if (!canPurchase.value) { orderError.value = storefrontContent.value.productForm.errors.outOfStockVariant; return }
    if (codEnabled.value && !quickForm.fullName.trim()) { orderError.value = storefrontContent.value.checkout.errors.fullNameRequired; return }
    if (codEnabled.value && !quickForm.phone.trim()) { orderError.value = storefrontContent.value.checkout.errors.phoneRequired; return }
    orderSubmitting.value = true
    try {
        const payload = { customerName: quickForm.fullName.trim(), customerPhone: quickForm.phone.trim(), customerAddress: quickForm.address?.trim() || undefined, shippingAddressLine1: quickForm.address?.trim() || undefined, shippingWilayaCode: quickForm.wilaya || undefined, shippingCommuneCode: quickForm.commune || undefined, deliveryMode: 'home', items: [{ productId: props.product.id, variantId: props.currentVariant?.id, quantity: quantity.value }] }
        metaPixel.initiateCheckout({ contents: [{ id: props.product.id, quantity: quantity.value, item_price: Number(props.currentPrice || 0) }], numItems: quantity.value, value: totalPrice.value, currency: storeSettings.value?.currencyCode || 'DZD', pixelIds: (props.product as any)?.metaPixelIds })
        const response = await $fetch<{ orderId: string }>(useTenantApiUrl('/api/orders'), { method: 'POST', body: payload, headers: { ...(useTenantApiHeaders() || {}) } })
        triggerSuccessToast(storefrontContent.value.toasts.orderReceived.title, storefrontContent.value.toasts.orderReceived.message)
        cartStore.clearCart(); quickForm.fullName = ''; quickForm.phone = ''; quickForm.wilaya = ''; quickForm.commune = ''; quickForm.address = ''
        router.push({ path: '/order-success', query: { orderId: response.orderId } })
    } catch (error: any) {
        orderError.value = error?.data?.statusMessage || error?.data?.message || storefrontContent.value.checkout.errors.submitFailed
    } finally { orderSubmitting.value = false }
}

const handleAddToCart = async () => {
    if (!props.product) return
    if (!canPurchase.value) { triggerSuccessToast(storefrontContent.value.actions.outOfStock, storefrontContent.value.toasts.outOfStock.message); return }
    addToCartSubmitting.value = true
    const variantLabel = props.currentVariant ? getVariantTitle(props.currentVariant) : ''
    cartStore.addItem({ productId: props.product.id, variantId: props.currentVariant?.id, title: props.product.title + (variantLabel ? ` (${variantLabel})` : ''), slug: props.product.slug, price: props.currentPrice, bundleDeals: props.product?.bundleDeals || [], stock: cartStockCap.value, image: props.activeImage, quantity: quantity.value, metaPixelIds: (props.product as any)?.metaPixelIds })
    triggerSuccessToast(storefrontContent.value.toasts.addedToCart.title, storefrontContent.value.toasts.addedToCart.message)
    addToCartSubmitting.value = false
}

const mainOrderFormRef = ref<HTMLElement | null>(null)
const showStickyBar = ref(false)

onMounted(() => {
    const observer = new IntersectionObserver((entries) => { showStickyBar.value = !entries[0].isIntersecting }, { threshold: 0.1, rootMargin: '0px 0px -20% 0px' })
    if (mainOrderFormRef.value) observer.observe(mainOrderFormRef.value)
    onUnmounted(() => { if (mainOrderFormRef.value) observer.unobserve(mainOrderFormRef.value); observer.disconnect() })
})

const scrollToForm = () => {
    if (mainOrderFormRef.value) { window.scrollTo({ top: mainOrderFormRef.value.getBoundingClientRect().top + window.scrollY - 20, behavior: 'smooth' }) }
    else window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
    <div>
        <!-- Quantity Selector -->
        <div class="flex items-center justify-between p-4 mb-6 border" style="background-color:#131720; border-color:rgba(212,197,169,0.12); border-radius:2px;">
            <div class="flex flex-col gap-0.5">
                <span class="font-medium text-sm" style="color:#D4C5A9;">{{ storefrontContent.productForm.quantity.label }}</span>
                <span v-if="product?.isActive === false" class="text-xs" style="color:#5A5450;">{{ storefrontContent.productForm.stock.unavailable }}</span>
                <span v-else-if="isOutOfStock" class="text-xs" style="color:#D97070;">{{ storefrontContent.productForm.stock.outOfStock }}</span>
                <span v-else-if="isLowStock" class="text-xs" style="color:#D9A050;">{{ storefrontContent.productForm.stock.lowStock(maxQuantity) }}</span>
                <span v-else class="text-xs" style="color:#70A080;">{{ storefrontContent.product.inStock }}</span>
            </div>
            <div class="flex items-center gap-1 p-1 border" style="background-color:#0E1117; border-color:rgba(212,197,169,0.1); border-radius:1px;">
                <button type="button" class="w-9 h-9 flex items-center justify-center transition-colors" style="color:#8A8070;" :disabled="!canPurchase || quantity <= 1" @click="decrementQuantity">
                    <Icon name="lucide:minus" class="w-4 h-4" />
                </button>
                <input v-model.number="quantity" type="number" min="1" :max="maxQuantity" class="w-10 text-center border-none bg-transparent font-medium p-0 focus:ring-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none" style="color:#E8E0D5;" readonly>
                <button type="button" class="w-9 h-9 flex items-center justify-center transition-colors" style="color:#8A8070;" :disabled="!canPurchase || (maxQuantity > 0 && quantity >= maxQuantity)" @click="incrementQuantity">
                    <Icon name="lucide:plus" class="w-4 h-4" />
                </button>
            </div>
        </div>

        <!-- Testimonial / Social Proof -->
        <div class="mb-6 p-4 border flex items-center gap-4 relative overflow-hidden" style="background-color:#1A1F2E; border-color:rgba(166,124,82,0.15); border-radius:2px;">
            <div class="w-11 h-11 rounded-full overflow-hidden border flex-shrink-0" style="border-color:rgba(166,124,82,0.3);">
                <img src="https://i.pravatar.cc/100?img=5" alt="Customer" class="w-full h-full object-cover">
            </div>
            <div>
                <p class="text-sm font-medium leading-tight mb-1" style="color:#D4C5A9;">"Loved it, will buy again!"</p>
                <div class="flex mb-0.5" style="color:#A67C52;">
                    <Icon v-for="i in 5" :key="i" name="lucide:star" class="w-3 h-3 fill-current" />
                </div>
                <p class="text-xs" style="color:#5A5450;">Susanae from NY just bought one!</p>
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
            class="p-6 md:p-7 border relative overflow-hidden"
            style="background-color:#111620; border-color:rgba(166,124,82,0.2); border-radius:2px;"
        >
            <!-- Top accent line -->
            <div class="absolute top-0 left-0 right-0 h-px" style="background:linear-gradient(to right, #A67C52, rgba(166,124,82,0.1));"></div>
            
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 flex items-center justify-center border" style="background-color:#1A1F2E; border-color:rgba(166,124,82,0.25); border-radius:1px; color:#A67C52;">
                    <Icon name="lucide:banknote" class="w-5 h-5" />
                </div>
                <div>
                    <h3 class="font-medium text-lg leading-none" style="color:#E8E0D5; font-family:'Cormorant Garamond',serif;">{{ storefrontContent.productForm.cod.title }}</h3>
                    <span class="text-xs" style="color:#5A5450;">{{ storefrontContent.productForm.cod.badge }}</span>
                </div>
            </div>
            
            <form class="space-y-4" @submit.prevent="handleOrderSubmit">
                <div class="space-y-1.5">
                    <label class="block text-xs font-medium tracking-[0.2em] uppercase ml-1" style="color:#A67C52;">{{ storefrontContent.checkout.form.fullName.label }}</label>
                    <input v-model="quickForm.fullName" type="text" :placeholder="storefrontContent.checkout.form.fullName.placeholder" class="block w-full h-11 px-4 text-sm placeholder:text-[#3A3530] focus:outline-none transition-all" style="background-color:#0E1117; border:1px solid rgba(212,197,169,0.12); color:#E8E0D5; border-radius:1px;" :class="{ 'border-[#A67C52]': !quickForm.fullName }">
                </div>
                
                <div class="space-y-1.5">
                    <label class="block text-xs font-medium tracking-[0.2em] uppercase ml-1" style="color:#A67C52;">{{ storefrontContent.checkout.form.phone.label }}</label>
                    <input v-model="quickForm.phone" type="tel" :placeholder="storefrontContent.checkout.form.phone.placeholder" class="block w-full h-11 px-4 text-sm placeholder:text-[#3A3530] focus:outline-none transition-all" style="background-color:#0E1117; border:1px solid rgba(212,197,169,0.12); color:#E8E0D5; border-radius:1px;">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                        <label class="block text-xs font-medium tracking-[0.2em] uppercase ml-1" style="color:#A67C52;">{{ storefrontContent.checkout.form.wilaya.label }}</label>
                        <div class="relative">
                            <select v-model="quickForm.wilaya" class="w-full h-11 px-4 text-sm appearance-none cursor-pointer focus:outline-none" style="background-color:#0E1117; border:1px solid rgba(212,197,169,0.12); color:#E8E0D5; border-radius:1px;">
                                <option value="" disabled style="background:#0E1117;">{{ storefrontContent.common.selectPlaceholder }}</option>
                                <option
                                  v-for="w in wilayas"
                                  :key="w.code"
                                  :value="w.code"
                                  style="background:#0E1117;"
                                >
                                  {{ w.code }} - {{ w.name }}
                                </option>
                            </select>
                            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style="color:#5A5450;"><Icon name="lucide:chevron-down" class="w-4 h-4" /></div>
                        </div>
                    </div>
                    <div class="space-y-1.5">
                        <label class="block text-xs font-medium tracking-[0.2em] uppercase ml-1" style="color:#A67C52;">{{ storefrontContent.checkout.form.commune.label }}</label>
                        <input v-model="quickForm.commune" type="text" :placeholder="storefrontContent.checkout.form.commune.placeholder" class="block w-full h-11 px-4 text-sm placeholder:text-[#3A3530] focus:outline-none" style="background-color:#0E1117; border:1px solid rgba(212,197,169,0.12); color:#E8E0D5; border-radius:1px;">
                    </div>
                </div>

                <div class="space-y-1.5">
                    <label class="block text-xs font-medium tracking-[0.2em] uppercase ml-1" style="color:#A67C52;">{{ storefrontContent.checkout.form.address.label }}</label>
                    <input v-model="quickForm.address" type="text" :placeholder="storefrontContent.checkout.form.address.placeholder" class="block w-full h-11 px-4 text-sm placeholder:text-[#3A3530] focus:outline-none" style="background-color:#0E1117; border:1px solid rgba(212,197,169,0.12); color:#E8E0D5; border-radius:1px;">
                </div>

                <div v-if="orderError" class="p-3 border text-sm" style="background-color:rgba(139,20,20,0.2); border-color:rgba(200,80,80,0.25); color:#FCA5A5; border-radius:1px;">
                    {{ orderError }}
                </div>

                <!-- Total Price -->
                <div class="flex items-center justify-between px-4 py-3 border" style="background-color:#0E1117; border-color:rgba(212,197,169,0.1); border-radius:1px;">
                    <span class="text-sm font-medium" style="color:#8A8070;">{{ storefrontContent.productForm.totalPrice }}</span>
                    <span class="text-xl font-light" style="color:#D4C5A9; font-family:'Cormorant Garamond',serif;">{{ totalPrice }} {{ storeSettings?.currencyCode || 'DZD' }}</span>
                </div>

                <button 
                    type="submit"
                    :disabled="orderSubmitting || !canPurchase"
                    class="w-full h-14 font-medium text-base tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-3 group relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                    style="background-color:#A67C52; color:#fff; border-radius:1px;"
                >
                    <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-700 z-0"></div>
                    <Icon v-if="orderSubmitting" name="lucide:loader-2" class="w-5 h-5 animate-spin relative z-10" />
                    <span class="relative z-10 flex items-center gap-2" :class="{ 'opacity-0': orderSubmitting }">
                        <span>{{ storefrontContent.productForm.cod.submit }}</span>
                        <Icon name="lucide:arrow-right" class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div v-if="orderSubmitting" class="absolute inset-0 flex items-center justify-center z-10">
                        <Icon name="lucide:loader-2" class="animate-spin h-5 w-5" style="color:#fff;" />
                    </div>
                </button>
            </form>
        </div>

        <!-- Add to Cart -->
        <div v-if="cartEnabled" class="mt-4">
            <button 
                type="button"
                :disabled="addToCartSubmitting || !canPurchase"
                class="w-full h-12 border font-medium text-sm tracking-[0.15em] uppercase transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                style="background-color:transparent; border-color:rgba(166,124,82,0.3); color:#A67C52; border-radius:1px;"
                @click="handleAddToCart"
            >
                <Icon name="lucide:shopping-bag" class="w-4 h-4" />
                <span>{{ addToCartSubmitting ? storefrontContent.actions.adding : storefrontContent.actions.addToCart }}</span>
            </button>
        </div>

        <!-- Trust Badges -->
        <div class="mt-8">
            <p class="text-center text-xs uppercase tracking-[0.2em] mb-4" style="color:#4A4540;">{{ $t('storefront.product.whyChooseUs') }}</p>
            <div class="grid grid-cols-3 gap-3">
                <div class="flex flex-col items-center text-center gap-2 p-3 border" style="background-color:#131720; border-color:rgba(212,197,169,0.08); border-radius:2px;">
                    <div class="w-9 h-9 flex items-center justify-center" style="color:#A67C52;"><Icon name="lucide:truck" class="w-5 h-5" /></div>
                    <span class="text-[10px] font-medium leading-tight" style="color:#8A8070;">{{ $t('storefront.product.features.delivery') }}</span>
                </div>
                <div class="flex flex-col items-center text-center gap-2 p-3 border" style="background-color:#131720; border-color:rgba(212,197,169,0.08); border-radius:2px;">
                    <div class="w-9 h-9 flex items-center justify-center" style="color:#A67C52;"><Icon name="lucide:headset" class="w-5 h-5" /></div>
                    <span class="text-[10px] font-medium leading-tight" style="color:#8A8070;">{{ $t('storefront.product.features.support') }}</span>
                </div>
                <div class="flex flex-col items-center text-center gap-2 p-3 border" style="background-color:#131720; border-color:rgba(212,197,169,0.08); border-radius:2px;">
                    <div class="w-9 h-9 flex items-center justify-center" style="color:#A67C52;"><Icon name="lucide:shield-check" class="w-5 h-5" /></div>
                    <span class="text-[10px] font-medium leading-tight" style="color:#8A8070;">{{ $t('storefront.product.features.securePayment') }}</span>
                </div>
            </div>
        </div>
        
        <!-- Success Toast -->
        <Transition enter-active-class="transform ease-out duration-300 transition" enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2" enter-to-class="translate-y-0 opacity-100 sm:translate-x-0" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
            <div v-if="showSuccess" class="fixed bottom-4 right-4 z-50 px-6 py-4 shadow-2xl flex items-center gap-4" style="background-color:#1A1F2E; border:1px solid rgba(166,124,82,0.25); border-radius:2px; color:#E8E0D5;">
                <div class="w-8 h-8 flex items-center justify-center shrink-0" style="background-color:#A67C52; border-radius:1px; color:#fff;">
                    <Icon name="lucide:check" class="w-4 h-4" />
                </div>
                <div>
                    <div class="font-medium text-sm" style="color:#D4C5A9;">{{ successTitle }}</div>
                    <div class="text-xs mt-0.5" style="color:#5A5450;">{{ successMessage }}</div>
                </div>
            </div>
        </Transition>

        <!-- Mobile Sticky Bar -->
        <Transition enter-active-class="transform transition ease-out duration-300" enter-from-class="translate-y-full" enter-to-class="translate-y-0" leave-active-class="transform transition ease-in duration-200" leave-from-class="translate-y-0" leave-to-class="translate-y-full">
            <div v-if="showStickyBar && codEnabled" class="fixed bottom-0 left-0 right-0 z-40 p-4 md:hidden flex items-center justify-between gap-4 border-t" style="background-color:#111620; border-color:rgba(166,124,82,0.15);">
                <div class="flex flex-col">
                    <span class="text-xs" style="color:#5A5450;">Total</span>
                    <span class="text-xl font-light" style="color:#D4C5A9; font-family:'Cormorant Garamond',serif;">{{ totalPrice }} {{ storeSettings?.currencyCode || 'DZD' }}</span>
                </div>
                <button type="button" :disabled="!canPurchase" class="flex-1 h-12 font-medium text-sm tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-40" style="background-color:#A67C52; color:#fff; border-radius:1px;" @click="scrollToForm">
                    <span>{{ storefrontContent.productForm.cod.submit }}</span>
                    <Icon name="lucide:arrow-right" class="w-4 h-4" />
                </button>
            </div>
        </Transition>
    </div>
</template>
