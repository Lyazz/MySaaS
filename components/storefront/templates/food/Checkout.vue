<template>
  <div class="bg-[#f8faf9] min-h-screen py-10 font-sans text-stone-600 selection:bg-brand-100 selection:text-brand-900">
    <!-- Decorative Background -->
    <div class="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
         <div class="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-gradient-to-br from-orange-100/40 to-transparent rounded-full blur-3xl"></div>
         <div class="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-gradient-to-bl from-green-100/40 to-transparent rounded-full blur-3xl"></div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <!-- Header -->
      <div class="mb-10 text-center">
        <h1 class="text-4xl font-bold text-stone-900 mb-2">
          Checkout
        </h1>
        <p class="text-lg text-stone-500 font-medium">
          {{ cartStore.itemCount }} items
        </p>
        <div
          v-if="!cartEnabled"
          class="mt-6 inline-block rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-sm px-6 py-2 font-bold uppercase tracking-wider shadow-sm"
        >
          Checkout is currently disabled for this store.
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        <!-- Left Column: Attributes & Delivery -->
        <div class="lg:col-span-7 space-y-10">
          <!-- Personal Info -->
          <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100 relative overflow-hidden group">
            <div class="absolute top-0 inset-x-0 h-1 bg-stone-100"></div>
            
            <h3 class="text-xl font-bold text-stone-900 mb-8 flex items-center gap-3">
                <span class="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-sans font-bold shadow-lg">1</span>
                Your Details
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="col-span-2 md:col-span-1 space-y-3">
                <label class="block text-xs font-bold uppercase tracking-widest text-stone-500 ml-1">Full name</label>
                <input
                  v-model="form.fullName"
                  type="text"
                  class="w-full h-14 rounded-2xl border-2 border-stone-100 bg-stone-50 px-5 text-stone-900 placeholder:text-stone-300 focus:border-stone-900 focus:ring-0 transition-all duration-300 outline-none font-medium"
                  placeholder="e.g. John Doe"
                >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-3">
                <label class="block text-xs font-bold uppercase tracking-widest text-stone-500 ml-1">Phone</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  class="w-full h-14 rounded-2xl border-2 border-stone-100 bg-stone-50 px-5 text-stone-900 placeholder:text-stone-300 focus:border-stone-900 focus:ring-0 transition-all duration-300 outline-none font-medium"
                  placeholder="0XXXXXXXX"
                >
              </div>
              <div class="col-span-2 md:col-span-1 space-y-3">
                <label class="block text-xs font-bold uppercase tracking-widest text-stone-500 ml-1">Wilaya</label>
                <div class="relative">
                  <select
                    v-model="form.wilaya"
                    class="w-full h-14 rounded-2xl border-2 border-stone-100 bg-stone-50 px-5 text-stone-900 focus:border-stone-900 focus:ring-0 transition-all duration-300 outline-none appearance-none cursor-pointer font-medium"
                  >
                    <option
                      value=""
                      disabled
                      selected
                    >
                      Select a wilaya...
                    </option>
                    <option value="16">
                      16 - Alger
                    </option>
                    <!-- Mock options -->
                  </select>
                  <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                    <Icon name="lucide:chevron-down" class="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div class="col-span-2 md:col-span-1 space-y-3">
                <label class="block text-xs font-bold uppercase tracking-widest text-stone-500 ml-1">City</label>
                <div class="relative">
                  <select
                    v-model="form.commune"
                    class="w-full h-14 rounded-2xl border-2 border-stone-100 bg-stone-50 px-5 text-stone-900 focus:border-stone-900 focus:ring-0 transition-all duration-300 outline-none appearance-none cursor-pointer font-medium"
                  >
                    <option
                      value=""
                      disabled
                      selected
                    >
                      Select a commune
                    </option>
                    <!-- Mock options -->
                  </select>
                  <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                    <Icon name="lucide:chevron-down" class="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div class="col-span-2 space-y-3">
                <label class="block text-xs font-bold uppercase tracking-widest text-stone-500 ml-1">Address (optional)</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="w-full h-14 rounded-2xl border-2 border-stone-100 bg-stone-50 px-5 text-stone-900 placeholder:text-stone-300 focus:border-stone-900 focus:ring-0 transition-all duration-300 outline-none font-medium"
                  placeholder="Street address, apartment, etc."
                >
              </div>
            </div>
          </div>

          <!-- Delivery Options -->
          <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
            <div class="flex items-center justify-between mb-8">
              <h3 class="text-xl font-bold text-stone-900 flex items-center gap-3">
                <span class="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-sans font-bold shadow-lg">2</span>
                Delivery Method
              </h3>
            </div>
                    
            <div class="space-y-4">
              <div 
                v-for="option in deliveryOptions"
                :key="option.id"
                class="cursor-pointer relative rounded-3xl p-6 border-2 transition-all duration-300 group hover:scale-[1.01]"
                :class="form.selectedDeliveryOption === option.id 
                  ? 'border-stone-900 bg-stone-50 shadow-md' 
                  : 'border-stone-100 hover:border-stone-300'"
                @click="form.selectedDeliveryOption = option.id"
              >
                <div class="flex items-center gap-5">
                  <!-- Icon -->
                  <div 
                    class="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-sm border border-white"
                    :class="form.selectedDeliveryOption === option.id 
                      ? `bg-stone-900 text-white` 
                      : `bg-${option.color}-50 text-${option.color}-600`"
                  >
                    <Icon :name="option.icon" class="w-7 h-7" />
                  </div>
                  
                  <!-- Details -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-1">
                      <h4 class="font-bold text-stone-900 text-base">
                        {{ option.providerLabel }}
                      </h4>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border"
                        :class="option.mode === 'home' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-blue-50 text-blue-800 border-blue-100'"
                      >
                        {{ option.modeLabel }}
                      </span>
                    </div>
                    <p class="text-xs text-stone-500 font-medium opacity-80">
                      {{ option.description }}
                    </p>
                  </div>
                  
                  <!-- Price & Radio -->
                  <div class="flex items-center gap-4 flex-shrink-0">
                    <div class="text-right">
                      <div class="font-bold text-stone-900 text-base">
                        {{ option.price === 'Free' ? option.price : `${option.price} ${currencyCode}` }}
                      </div>
                    </div>
                    <div
                      class="w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center"
                      :class="form.selectedDeliveryOption === option.id 
                        ? 'border-stone-900 bg-stone-900' 
                        : 'border-stone-300'"
                    >
                      <Icon v-if="form.selectedDeliveryOption === option.id" name="lucide:check" class="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Right Column: Summary (Receipt Style) -->
        <div class="lg:col-span-5 relative">
          <div class="bg-white px-8 py-10 shadow-2xl relative ticket-container lg:sticky lg:top-24 transform hover:scale-[1.01] transition-transform duration-500">
             <!-- Jagged edges -->
             <div class="absolute top-0 left-0 right-0 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAxMCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PHBhdGggZD0iTTAgMTBMMTAgMEwyMCAxMEgweiIgZmlsbD0iI2Y4ZmFmOSIvPjwvc3ZnPg==')] bg-repeat-x bg-[length:20px_10px] transform -translate-y-full"></div>
             <div class="absolute bottom-0 left-0 right-0 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAxMCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PHBhdGggZD0iTTAgMEwxMCAxMEwyMCAwSDB6IiBmaWxsPSIjZjhmYWY5Ii8+PC9zdmc+')] bg-repeat-x bg-[length:20px_10px] transform translate-y-full"></div>

            <div class="flex items-center justify-center mb-8 pb-6 border-b-2 border-stone-900 border-double">
              <h2 class="text-2xl font-bold text-stone-900 uppercase tracking-widest text-center">
                Order Summary
              </h2>
            </div>

            <!-- Cart Items -->
            <div class="space-y-4 mb-8 max-h-80 overflow-y-auto pr-2 text-sm">
              <div
                v-for="item in cartStore.items"
                :key="item.productId"
                class="flex justify-between items-start pb-4 border-b border-dashed border-stone-200 last:border-0"
              >
                <div class="flex-1 pr-4">
                  <h4 class="font-bold text-stone-900 uppercase">
                    {{ item.title }}
                  </h4>
                  <p class="text-xs text-stone-500 mt-1">
                    Qty: {{ item.quantity }} x {{ item.price }} {{ currencyCode }}
                  </p>
                </div>
                <div class="font-bold text-stone-900">
                  {{ (Number(item.price) * item.quantity).toFixed(2) }} {{ currencyCode }}
                </div>
              </div>
            </div>

            <!-- Coupon -->
            <div class="p-4 bg-stone-50 rounded-xl border border-dashed border-stone-300 mb-8">
              <div class="flex gap-2">
                <input
                  v-model="couponCode"
                  type="text"
                  placeholder="Promo Code"
                  class="flex-1 h-10 bg-transparent border-b border-stone-300 text-sm focus:border-stone-900 focus:outline-none placeholder:text-stone-400"
                >
                <button class="text-xs font-bold uppercase tracking-widest text-stone-900 hover:text-brand-600 transition-colors">
                  Apply
                </button>
              </div>
            </div>

            <!-- Totals -->
            <div class="space-y-3 pt-6 border-t-2 border-stone-900 border-dashed text-sm">
              <div class="flex justify-between">
                <span class="text-stone-600 uppercase">Subtotal</span>
                <span class="font-bold text-stone-900">{{ cartStore.total }} {{ currencyCode }}</span>
              </div>
              <div v-if="selectedDelivery" class="flex justify-between">
                <span class="text-stone-600 uppercase">Delivery</span>
                <span class="font-bold text-stone-900">{{ selectedDelivery.price === 'Free' ? '0.00' : selectedDelivery.price }} {{ currencyCode }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-stone-600 uppercase">Tax</span>
                <span class="font-bold text-stone-900">0.00 {{ currencyCode }}</span>
              </div>
                        
              <div class="flex justify-between items-end pt-6 mt-4 border-t-2 border-stone-900">
                <span class="font-bold text-xl text-stone-900 uppercase">Total Due</span>
                <span class="font-bold text-2xl text-stone-900">{{ cartStore.total }} {{ currencyCode }}</span>
              </div>
            </div>

            <div
              v-if="errorMessage"
              class="mt-6 p-4 bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wide border border-red-200 text-center"
            >
              {{ errorMessage }}
            </div>

            <!-- Checkout Button -->
            <button 
              :disabled="submitting || !cartEnabled || !hasRequiredFields"
              class="w-full mt-8 bg-stone-900 hover:bg-stone-800 text-white font-bold py-5 px-6 rounded-xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 group relative overflow-hidden"
              @click="handleSubmit"
            >
              <Icon
                v-if="submitting"
                name="lucide:loader-2"
                class="w-5 h-5 animate-spin"
              />
              <span class="text-sm uppercase tracking-widest">
                {{ submitting ? 'Processing...' : (!cartEnabled ? 'Checkout disabled' : 'Place Order') }}
              </span>
              <Icon
                v-if="!submitting && cartEnabled && hasRequiredFields"
                name="lucide:check-circle"
                class="w-5 h-5"
              />
            </button>
            
            <div class="mt-6 text-center">
                 <Icon name="lucide:shield-check" class="w-5 h-5 text-stone-300 mx-auto mb-2" />
                 <p class="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                     Secure Transaction
                 </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const cartStore = useCartStore()
const { currencyCode } = useCurrency()
const { data: storeSettings } = await useFetch('/api/store/settings')

// Form state
const form = reactive({
  fullName: '',
  phone: '',
  wilaya: '',
  commune: '',
  address: '',
  selectedDeliveryOption: 1 // Default to first option
})

const couponCode = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const cartEnabled = computed(() => storeSettings.value?.cartEnabled ?? true)

// Delivery Options Mock Data
const deliveryOptions = [
  {
    id: 1,
    provider: 'yalidine',
    providerLabel: 'Yalidine',
    mode: 'home',
    modeLabel: 'Home Delivery',
    price: 500,
    description: 'Delivery to your door in 2-4 days',
    icon: 'lucide:truck',
    color: 'emerald'
  },
  {
    id: 2,
    provider: 'yalidine',
    providerLabel: 'Yalidine',
    mode: 'desk',
    modeLabel: 'Desk Pickup',
    price: 300,
    description: 'Pick up from nearest Yalidine desk',
    icon: 'lucide:package',
    color: 'blue'
  },
  {
    id: 3,
    provider: 'zr_express',
    providerLabel: 'ZR Express',
    mode: 'home',
    modeLabel: 'Home Delivery',
    price: 550,
    description: 'Fast delivery to your home',
    icon: 'lucide:truck',
    color: 'emerald'
  }
]

const selectedDelivery = computed(() => {
  return deliveryOptions.find(opt => opt.id === form.selectedDeliveryOption)
})

const hasRequiredFields = computed(() => {
  return form.fullName && form.phone && form.wilaya && form.commune
})

const handleSubmit = async () => {
    if (!cartEnabled.value) return
    if (!hasRequiredFields.value) {
        errorMessage.value = 'Please fill in all required fields.'
        return
    }

    submitting.value = true
    errorMessage.value = ''

    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Success logic
    cartStore.clearCart()
    router.push('/thank-you')
    submitting.value = false
}

// Redirect if empty
onMounted(() => {
    if (cartStore.items.length === 0) {
        router.push('/')
    }
})
</script>
