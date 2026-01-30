<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const props = defineProps<{
    product: any
    currentVariant: any
    currentPrice: number
    currentStock: number
    activeImage: string
}>()

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')
const codEnabled = computed(() => storeSettings.value?.codEnabled !== false && storeSettings.value?.cartEnabled !== false)
const cartEnabled = computed(() => storeSettings.value?.cartEnabled !== false)

const isAdding = ref(false)
const showSuccess = ref(false)
const fullName = ref('')


function getVariantTitle(variant: any) {
    if (!variant.optionValues) return ''
    
    // Sort logic
    let values = [...variant.optionValues]
    if (props.product.options && props.product.options.length > 0) {
       const optionPos = new Map(props.product.options.map((o: any) => [o.id, o.position]))
        values.sort((a: any, b: any) => {
            const posA = optionPos.get(a.optionValue?.optionId) ?? 999
            const posB = optionPos.get(b.optionValue?.optionId) ?? 999
            return posA - posB
        })
    }
    
    return values.map((ov: any) => ov.optionValue?.label).join(' / ')
}

const handleOrderSubmit = async () => {
  if (!props.product) return

  if (codEnabled.value && !fullName.value) {
      alert('Please fill in your name')
      return 
  }
  isAdding.value = true
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800))

  cartStore.addItem({
      productId: props.product.id,
      variantId: props.currentVariant?.id,
      title: props.product.title + (props.currentVariant ? ` (${getVariantTitle(props.currentVariant)})` : ''),
      slug: props.product.slug,
      price: props.currentPrice,
      stock: props.currentStock || 0,
      image: props.activeImage,
  })
  
  isAdding.value = false
  showSuccess.value = true
  setTimeout(() => showSuccess.value = false, 3000)
}

const handleAddToCart = async () => {
    if (!props.product) return
    isAdding.value = true
    await new Promise(resolve => setTimeout(resolve, 500))
    cartStore.addItem({
        productId: props.product.id,
        variantId: props.currentVariant?.id,
        title: props.product.title + (props.currentVariant ? ` (${getVariantTitle(props.currentVariant)})` : ''),
        slug: props.product.slug,
        price: props.currentPrice,
        stock: props.currentStock || 0,
        image: props.activeImage,
    })
    isAdding.value = false
    showSuccess.value = true
    setTimeout(() => showSuccess.value = false, 3000)
}
</script>

<template>
    <div>
        <!-- Quick COD Order Form -->
        <div
            v-if="codEnabled"
            data-test="cod-order-card"
            class="bg-white rounded-3xl p-6 md:p-8 shadow-soft border border-slate-100 relative overflow-hidden"
        >
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-brand-600" />
            
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 shadow-sm ring-1 ring-brand-100">
                <Icon name="lucide:banknote" class="w-5 h-5" />
                </div>
                <div>
                <h3 class="font-sans font-bold text-slate-900 text-xl leading-none">Order Now</h3>
                <span class="text-xs text-slate-500 font-medium">Cash on Delivery (COD)</span>
                </div>
            </div>
            
            <form class="space-y-5" @submit.prevent="handleOrderSubmit">
                <div class="space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1">Full Name</label>
                <input 
                    v-model="fullName"
                    type="text" 
                    placeholder="e.g. John Doe" 
                    class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                    :class="{ 'animate-attention': !fullName }"
                >
                </div>
                
                <div class="space-y-2">
                <label class="block text-sm font-semibold text-slate-700 ml-1">Phone Number</label>
                <input
                    type="tel"
                    placeholder="e.g. 0550 12 34 56"
                    class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                >
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-slate-700 ml-1">Wilaya</label>
                    <div class="relative">
                    <select class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none appearance-none cursor-pointer shadow-sm">
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
                    type="text"
                    placeholder="e.g. Bab Ezzouar"
                    class="block w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 outline-none shadow-sm"
                    >
                </div>
                </div>

                <button 
                type="submit"
                :disabled="isAdding"
                class="w-full h-14 bg-slate-900 hover:bg-brand-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-brand-600/30 transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 mt-6 group overflow-hidden relative"
                >
                <span class="relative z-10 flex items-center gap-2" :class="{ 'opacity-0': isAdding }">
                    <span>Confirm Order</span>
                    <Icon name="lucide:arrow-right" class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                            
                <div v-if="isAdding" class="absolute inset-0 flex items-center justify-center">
                    <Icon name="lucide:loader-2" class="animate-spin h-6 w-6 text-white" />
                </div>
                </button>
            </form>
        </div>

        <!-- Add to Cart Button (Only if Cart is Enabled) -->
        <div v-if="cartEnabled" class="mt-6">
            <button 
                type="button"
                :disabled="isAdding"
                class="w-full h-14 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-50 font-bold text-lg rounded-xl transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3"
                @click="handleAddToCart"
            >
                    <Icon name="lucide:shopping-cart" class="w-5 h-5" />
                <span>Add to Cart</span>
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
            class="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-700/50 backdrop-blur-md bg-slate-900/95"
        >
            <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
            <Icon name="lucide:check" class="w-5 h-5" />
            </div>
            <div>
            <div class="font-bold">Order Received!</div>
            <div class="text-xs text-slate-300">We'll contact you shortly for confirmation.</div>
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
