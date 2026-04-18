<template>
  <div class="h-[calc(100vh-4rem)] relative flex overflow-hidden bg-slate-100">
    <!-- Mobile Cart Overlay -->
    <div 
      v-if="showCart" 
      class="fixed inset-0 bg-black/50 z-20 lg:hidden"
      @click="showCart = false"
    />

    <!-- Left: Catalog (flex-1) -->
    <div class="flex-1 flex flex-col min-w-0 bg-slate-100 transition-all duration-300">
      
      <!-- Top Bar -->
      <header class="bg-white border-b border-slate-200 p-3 md:p-4 flex items-center gap-3 md:gap-4 shrink-0 shadow-sm z-10">
        <!-- Title & Search (Merged for space) -->
        <h1 class="text-xl font-bold text-slate-800 hidden md:block">
          {{ categoryDisplayTitle(selectedCategory) || t('admin.pages.pos.catalog.title') }}
        </h1>

        <!-- Search -->
        <div class="flex-1 max-w-md mx-auto relative group">
          <Icon
            name="lucide:search"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors w-5 h-5"
          />
          <input
            v-model="productSearch"
            type="text"
            :placeholder="t('admin.pages.pos.catalog.searchPlaceholder')"
            class="w-full pl-10 pr-10 py-2 bg-slate-50 border border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all text-sm font-medium placeholder:text-slate-400"
          >
          <button
            v-if="productSearch"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            @click="productSearch = ''"
          >
            <Icon
              name="lucide:x"
              class="w-4 h-4"
            />
          </button>
        </div>

        <!-- Desktop Actions -->
        <div class="hidden lg:flex items-center gap-2">
          <button
            class="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 font-medium hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center gap-1.5 shrink-0"
            :title="t('admin.pages.pos.catalog.actions.discount')"
            @click="openExampleDialog(t('admin.pages.pos.catalog.actions.discount'))"
          >
            <Icon
              name="lucide:percent"
              class="w-4 h-4"
            />
            <span class="hidden xl:inline">{{ t('admin.pages.pos.catalog.actions.discount') }}</span>
          </button>
          <button
             class="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 font-medium hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center gap-1.5 shrink-0"
             :title="t('admin.pages.pos.catalog.actions.reprintLastOrder')"
             @click="printLastSale"
          >
             <Icon
               name="lucide:printer"
               class="w-4 h-4"
             />
             <span class="hidden 2xl:inline">{{ t('admin.pages.pos.catalog.actions.reprint') }}</span>
          </button>
          <button
            class="h-9 px-3 text-sm rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 shadow-sm transition-all flex items-center gap-1.5 border border-transparent shrink-0"
            :title="t('admin.pages.pos.catalog.actions.quickCharge')"
            @click="openExampleDialog(t('admin.pages.pos.catalog.actions.quickCharge'))"
          >
            <Icon
              name="lucide:zap"
              class="w-4 h-4"
            />
            <span class="hidden xl:inline">{{ t('admin.pages.pos.catalog.actions.quickCharge') }}</span>
          </button>

          <div class="h-6 w-px bg-slate-200 mx-1 shrink-0" />

          <!-- Product View Controls -->
          <div class="flex items-center gap-1.5">
            <button
              class="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 shrink-0"
              :title="t('admin.pages.pos.catalog.actions.sort')"
            >
              <Icon
                name="lucide:arrow-up-down"
                class="w-4 h-4"
              />
            </button>
            <button
              class="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 text-sm font-medium flex items-center gap-1.5 shrink-0"
              :title="t('admin.pages.pos.catalog.actions.columns')"
              @click="cycleProductsPerRow"
            >
              <Icon
                name="lucide:grid-3x3"
                class="w-4 h-4"
              />
              <span>{{ productsPerRow }}</span>
            </button>
            <div class="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
              <button
                v-for="view in ['grid', 'list']"
                :key="view"
                class="p-1.5 rounded-md transition-all shadow-sm"
                :class="productsView === view ? 'bg-white text-teal-600' : 'text-slate-400 hover:text-slate-600'"
                @click="productsView = view as 'grid' | 'list'"
              >
                <Icon
                  :name="view === 'grid' ? 'lucide:layout-grid' : 'lucide:list'"
                  class="w-4 h-4"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Menu Toggle -->
        <button class="lg:hidden p-2 text-slate-600">
           <Icon name="lucide:more-vertical" class="w-6 h-6" />
        </button>
      </header>
  
      <!-- Main Content Area: Sidebar + Grid -->
      <div class="flex-1 flex overflow-hidden relative">
        
        <!-- Category Sidebar -->
        <div class="w-20 md:w-24 lg:w-40 bg-white border-r border-slate-200 overflow-y-auto shrink-0 flex flex-col no-scrollbar">
          <button
            class="p-2 md:p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors flex flex-col items-center gap-2 text-center group"
            :class="!selectedCategoryId ? 'bg-teal-50 border-r-4 border-r-teal-500' : 'text-slate-500'"
            @click="selectCategory(null)"
          >
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              :class="!selectedCategoryId ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 group-hover:bg-slate-200 text-slate-400'"
            >
              <Icon name="lucide:layout-grid" class="w-5 h-5" />
            </div>
            <span 
              class="text-[10px] md:text-xs font-semibold leading-tight line-clamp-2"
              :class="!selectedCategoryId ? 'text-teal-700' : 'text-slate-600'"
            >
              {{ t('admin.pages.pos.catalog.allProducts') }}
            </span>
          </button>

          <button
            v-for="cat in categories"
            :key="cat.id"
            class="p-2 md:p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors flex flex-col items-center gap-2 text-center group"
            :class="selectedCategoryId === cat.id ? 'bg-teal-50 border-r-4 border-r-teal-500' : 'text-slate-500'"
            @click="selectCategory(cat.id)"
          >
             <div 
              class="w-10 h-10 rounded-full overflow-hidden bg-slate-100 relative group-hover:ring-2 group-hover:ring-offset-1 group-hover:ring-slate-200 transition-all"
             >
               <img
                  v-if="cat.imageUrl"
                  :src="cat.imageUrl"
                  :alt="categoryDisplayTitle(cat)"
                  class="w-full h-full object-cover"
                >
                <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                  <Icon name="lucide:image" class="w-5 h-5" />
                </div>
             </div>
             <span 
               class="text-[10px] md:text-xs font-semibold leading-tight line-clamp-2"
               :class="selectedCategoryId === cat.id ? 'text-teal-700' : 'text-slate-600'"
             >
               {{ categoryDisplayTitle(cat) }}
             </span>
          </button>
        </div>

        <!-- Products Area -->
        <div class="flex-1 overflow-y-auto p-3 md:p-6 bg-slate-50/50 pb-24 lg:pb-6">
           <!-- Loading State -->
           <div v-if="loadingProducts" class="flex justify-center items-center h-full">
             <Icon name="lucide:loader-2" class="w-8 h-8 animate-spin text-teal-600" />
           </div>

           <!-- Empty State -->
           <div v-else-if="filteredProducts.length === 0" class="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
             <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
               <Icon name="lucide:package-search" class="w-10 h-10 text-slate-300" />
             </div>
             <p class="font-medium text-lg">{{ t('admin.pages.pos.catalog.noProducts') }}</p>
             <button 
                v-if="selectedCategoryId"
                class="text-teal-600 font-semibold hover:underline"
                @click="selectCategory(null)"
             >
               {{ t('admin.pages.pos.catalog.clearFilter') }}
             </button>
           </div>
           
           <!-- Product Grid/List -->
            <div
             v-else
             class="grid gap-3 md:gap-4 md:gap-5 content-start auto-rows-min"
             :class="productsView === 'list' ? 'grid-cols-1' : ''"
             :style="productsView === 'grid' ? { gridTemplateColumns: `repeat(${productsPerRow}, minmax(0, 1fr))` } : {}"
           >
             <!-- Back Card (Grid View Only) -->
             <button
               v-if="selectedCategoryId && productsView === 'grid'"
               class="h-full min-h-[160px] rounded-xl bg-white shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group p-4"
               @click="selectCategory(null)"
             >
               <div class="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                 <Icon
                   name="lucide:arrow-left"
                   class="w-6 h-6 text-teal-600"
                 />
               </div>
               <span class="font-bold text-teal-600">{{ t('admin.pages.pos.catalog.back') }}</span>
             </button>

             <!-- Back Item (List View Only) -->
             <button
               v-if="selectedCategoryId && productsView === 'list'"
               class="p-4 rounded-xl bg-white shadow-sm hover:shadow-md flex items-center gap-4 text-teal-700 font-bold transition-all"
               @click="selectCategory(null)"
             >
               <div class="p-2 rounded-full bg-teal-50">
                 <Icon
                   name="lucide:arrow-left"
                   class="w-5 h-5"
                 />
               </div>
               {{ t('admin.pages.pos.catalog.backToCategories') }}
             </button>

             <!-- Products -->
             <button
               v-for="product in filteredProducts"
               :key="product.id"
               class="relative group bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-left overflow-hidden flex h-full min-h-[180px]"
               :class="productsView === 'grid' ? 'flex-col' : 'flex-row items-center p-2 min-h-[80px]'"
               @click="handleAddProduct(product)"
             >
               <!-- Badge -->
               <div
                 v-if="product.stock <= 5"
                 class="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
                 :class="product.stock <= 0 ? 'bg-red-500' : 'bg-orange-500'"
               >
                 {{ product.stock <= 0 ? t('admin.pages.pos.catalog.badges.outOfStock') : t('admin.pages.pos.catalog.badges.lowStock', { count: product.stock }) }}
               </div>
  
               <!-- Image -->
               <div
                 class="bg-white overflow-hidden shrink-0 relative flex-1"
                 :class="productsView === 'grid' ? 'w-full aspect-square p-2 md:p-3' : 'w-16 h-16 rounded-xl flex-none'"
               >
                 <div class="w-full h-full rounded-lg overflow-hidden bg-slate-50 relative flex items-center justify-center">
                   <img
                     v-if="getProductMainImage(product)"
                     :src="getProductMainImage(product)"
                     :alt="product.title"
                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                   >
                   <div
                     v-else
                     class="w-full h-full flex items-center justify-center text-slate-300"
                   >
                     <Icon
                       name="lucide:image"
                       class="w-8 h-8"
                     />
                   </div>
                 </div>
               </div>
  
               <!-- Info -->
               <div class="flex-1 flex flex-col justify-between px-3 pb-3 md:px-4 md:pb-4 pt-0 min-w-0" :class="productsView === 'list' ? 'py-0 px-0' : ''">
                 <div class="mb-1 md:mb-2">
                   <h3
                     class="font-semibold text-slate-800 leading-snug"
                     :class="productsView === 'grid' ? 'line-clamp-2 text-xs md:text-sm' : 'truncate text-base'"
                   >
                     {{ product.title }}
                   </h3>
                   <p v-if="productsView === 'list'" class="text-xs text-slate-400 truncate">{{ product.sku }}</p>
                 </div>
                 <div class="font-bold text-indigo-600 text-sm md:text-lg">
                   {{ formatCurrency(product.price) }}
                 </div>
               </div>
             </button>
           </div>
        </div>
      </div>

      <!-- Mobile Bottom Bar -->
      <div v-if="cartTotal >= 0" class="lg:hidden p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4 z-30">
        <div class="flex-1">
          <div class="text-xs text-slate-500 font-medium uppercase">{{ cartItems.length }} {{ t('admin.pages.pos.cart.itemsCount', { count: '' }) }}</div>
          <div class="text-xl font-bold text-indigo-600">{{ formatCurrency(cartTotal) }}</div>
        </div>
        <button 
          class="h-12 px-6 rounded-xl bg-teal-600 text-white font-bold shadow-lg shadow-teal-500/30 flex items-center gap-2"
          @click="showCart = true"
        >
          <Icon name="lucide:shopping-bag" class="w-5 h-5" />
          <span>{{ t('admin.pages.pos.actions.viewCart') }}</span>
        </button>
      </div>
    </div>

    <!-- Right: Cart & Checkout (Desktop + Mobile Drawer) -->
    <div 
      class="fixed inset-y-0 right-0 z-30 w-full sm:w-[400px] bg-white border-l border-slate-200 flex flex-col shadow-2xl lg:shadow-xl transform transition-transform duration-300 lg:relative lg:transform-none lg:w-[400px] lg:block"
      :class="showCart ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'"
    >
      <!-- Mobile Close Button -->
      <button 
        class="lg:hidden absolute top-4 left-4 p-2 bg-slate-100 rounded-full text-slate-500 z-50"
        @click="showCart = false"
      >
        <Icon name="lucide:x" class="w-5 h-5" />
      </button>

      <!-- Session Tabs -->
      <div class="flex border-b border-slate-100 lg:pt-0 pt-16">
        <button
          v-for="i in 3"
          :key="i"
          class="flex-1 py-4 text-sm font-semibold border-b-2 transition-colors relative"
          :class="activeSession === i - 1 ? 'border-teal-600 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'"
          @click="activeSession = i - 1"
        >
          {{ t('admin.pages.pos.sessions.order', { index: i }) }}
          <span
            v-if="getSessionCount(i - 1) > 0"
            class="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-teal-500"
          />
        </button>
      </div>

      <!-- Customer & Scan -->
      <div class="p-4 border-b border-slate-100 space-y-3">
        <div class="flex gap-2">
          <div class="flex-1 relative">
            <BaseSelect
              :model-value="selectedCustomerId"
              @update:model-value="(val) => {
                if (val === 'NEW') {
                  showCustomerModal = true;
                } else {
                  selectedCustomerId = val as string;
                }
              }"
              class="w-full text-sm pl-9 bg-slate-50 border-slate-100 hover:bg-slate-100 transition-colors"
            >
              <option value="">
                {{ t('admin.pages.pos.customer.defaultClient') }}
              </option>
              <option value="NEW" class="text-teal-600 font-bold">
                + {{ t('admin.pages.pos.customer.addClient') }}
              </option>
              <option
                v-for="c in customers"
                :key="c.id"
                :value="c.id"
              >
                {{ c.name }}
              </option>
            </BaseSelect>
            <Icon
              name="lucide:user"
              class="absolute left-3 top-3 w-4 h-4 text-slate-400"
            />
          </div>
          <button
            class="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            :title="t('admin.pages.pos.actions.imageMode')"
          >
             <Icon
               name="lucide:image"
               class="w-5 h-5"
             />
          </button>
          <button
            class="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
            :title="t('admin.pages.pos.cart.actions.clearCart')"
            @click="clearCart"
          >
            <Icon
              name="lucide:trash-2"
              class="w-5 h-5"
            />
          </button>
        </div>
      </div>

      <!-- Cart Items -->
      <div class="flex-1 overflow-y-auto p-4 content-start">
        <div
          v-if="cartItems.length === 0"
          class="h-full flex flex-col items-center justify-center text-slate-300 space-y-4"
        >
          <Icon
            name="lucide:shopping-bag"
            class="w-12 h-12 stroke-1"
          />
          <p class="font-medium">
            {{ t('admin.pages.pos.cart.empty') }}
          </p>
        </div>
        <div
          v-else
          class="space-y-3"
        >
          <div
            v-for="item in cartItems"
            :key="item.key"
            class="group bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3 shadow-sm hover:border-teal-100 transition-all"
          >
             <!-- No Image in Compact View for Screenshot parity -->
            <div class="flex-1 min-w-0">
              <h4 class="font-semibold text-slate-900 text-sm leading-tight truncate">
                {{ item.title }}
              </h4>
              <p
                v-if="item.variantLabel"
                class="text-xs text-slate-500 mt-0.5"
              >
                {{ item.variantLabel }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex items-center h-8 bg-slate-50 rounded-lg border border-slate-200">
                <button
                  class="w-8 h-full flex items-center justify-center text-slate-500 hover:text-teal-600 hover:bg-white rounded-l-lg transition-colors"
                  @click="decrementQty(item.key)"
                >
                  <Icon
                    name="lucide:minus"
                    class="w-3 h-3"
                  />
                </button>
                <div class="w-8 text-center text-sm font-bold text-slate-900">
                  {{ item.quantity }}
                </div>
                <button
                  class="w-8 h-full flex items-center justify-center text-slate-500 hover:text-teal-600 hover:bg-white rounded-r-lg transition-colors"
                  @click="incrementQty(item.key)"
                >
                  <Icon
                    name="lucide:plus"
                    class="w-3 h-3"
                  />
                </button>
              </div>
              
              <button
                class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
                @click="removeFromCart(item.key)"
              >
                <Icon
                  name="lucide:x"
                  class="w-4 h-4"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-white border-t border-slate-200 p-6 space-y-6 z-20">
        <div class="flex items-end justify-between">
          <span class="text-slate-500 font-medium text-lg mb-1">{{ t('admin.pages.pos.cart.total') }}</span>
          <span class="text-3xl font-bold text-indigo-600 tracking-tight leading-none">{{ formatCurrency(cartSubtotal) }}</span>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <button
            class="h-12 rounded-xl font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center gap-2"
            :title="t('admin.pages.pos.cart.actions.paymentOptions')"
            disabled
          >
            <Icon
              name="lucide:credit-card"
              class="w-5 h-5"
            />
            {{ t('admin.pages.pos.cart.actions.payment') }}
          </button>
          <button
            class="h-12 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
            :class="canCreateSale ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-200 cursor-not-allowed text-slate-400 shadow-none'"
            :disabled="!canCreateSale"
            @click="showPaymentModal = true"
          >
            {{ t('admin.pages.pos.cart.actions.checkout') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <PosPaymentModal
      v-if="showPaymentModal"
      :total="cartSubtotal"
      :loading="placingSale"
      @close="showPaymentModal = false"
      @confirm="handlePaymentConfirm"
    />

    <PosCustomerModal
      v-if="showCustomerModal"
      @close="showCustomerModal = false"
      @created="onCustomerCreated"
    />

    <!-- Variant Picker Modal -->
    <TransitionRoot
      appear
      :show="variantModal.open"
      as="template"
    >
      <Dialog
        as="div"
        class="relative z-50"
        @close="closeVariantModal"
      >
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as="template"
              enter="duration-300 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-200 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle
                  as="h3"
                  class="text-lg font-bold leading-6 text-slate-900 flex justify-between items-center"
                >
                  {{ variantModal.productTitle }}
                  <button
                    class="p-1 rounded-full hover:bg-slate-100 text-slate-400"
                    @click="closeVariantModal"
                  >
                    <Icon
                      name="lucide:x"
                      class="w-5 h-5"
                    />
                  </button>
                </DialogTitle>
                <div class="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
                  <div
                    v-if="variantModal.loading"
                    class="py-8 text-center text-slate-500"
                  >
                    {{ t('admin.pages.pos.variants.loading') }}
                  </div>
                  <button
                    v-for="v in variantModal.variants"
                    :key="v.id"
                    class="w-full p-4 rounded-xl border border-slate-100 hover:border-teal-500 hover:bg-teal-50 hover:ring-1 hover:ring-teal-500 transition-all flex justify-between items-center group"
                    @click="addVariantToCart(variantModal.productId, variantModal.productTitle, v)"
                  >
                    <div class="text-left">
                      <div class="font-semibold text-slate-900 group-hover:text-teal-800">
                        {{ v.label }}
                      </div>
                      <div class="text-xs text-slate-500 mt-0.5">
                        {{ v.trackInventory ? t('admin.pages.pos.variants.inStockCount', { count: v.availableStock }) : t('admin.pages.pos.variants.inStock') }}
                      </div>
                    </div>
                    <div class="font-bold text-teal-600">
                      {{ formatCurrency(v.price) }}
                    </div>
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import PosPaymentModal from '~/components/pos/PosPaymentModal.vue'
import PosCustomerModal from '~/components/pos/PosCustomerModal.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.nav.pos'
})

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })
const { format: formatCurrency } = useCurrency()

// Interfaces
interface Category {
  id: string
  title: string
  displayTitle?: string
  parentId?: string | null
  parent?: { title: string } | null
  imageUrl?: string
}

interface ProductListRow {
  id: string
  title: string
  slug: string
  price: number
  stock: number
  isActive: boolean
  sku?: string
  categoryId?: string
  categoryIds?: string[]
  category?: { id: string }
  categories?: Array<{ id: string; title?: string }>
  options?: Array<{ id: string; name: string; values: any[] }>
  variants?: Array<{ id: string; sku?: string | null }>
  images?: string[]
  productImages?: Array<{ id: string; url: string; isMain: boolean }>
}

interface CartItem {
  key: string
  productId: string
  variantId?: string | null
  title: string
  variantLabel?: string
  imageUrl?: string
  price: number
  quantity: number
}

// State
const categories = ref<Category[]>([])
const products = ref<ProductListRow[]>([])
const loadingProducts = ref(true)

const productSearch = ref('')
const selectedCategoryId = ref<string | null>(null)
const productsView = ref<'list' | 'grid'>('grid')
const productsPerRow = ref(4)

// Session Management
interface CartSession {
  items: Record<string, CartItem>
  customerId: string | null
  discount: number
}

const activeSession = ref(0)
const cartSessions = ref<CartSession[]>([
  { items: {}, customerId: null, discount: 0 },
  { items: {}, customerId: null, discount: 0 },
  { items: {}, customerId: null, discount: 0 }
])

const currentSession = computed(() => cartSessions.value[activeSession.value])
const cart = computed(() => currentSession.value.items)
const cartItems = computed(() => Object.values(cart.value))
const cartSubtotal = computed(() => cartItems.value.reduce((sum, i) => sum + i.price * i.quantity, 0))
const cartTotal = computed(() => {
  const sub = cartSubtotal.value
  const disc = currentSession.value.discount || 0
  return Math.max(0, sub - disc)
})

// Modals & UI State
const showPaymentModal = ref(false)
const showCart = ref(false)
const showCustomerModal = ref(false)
const placingSale = ref(false)
const selectedCustomerId = ref('')
const customers = ref<any[]>([]) // Placeholder for customers

function onCustomerCreated(customer: any) {
  customers.value.push(customer)
  selectedCustomerId.value = customer.id
  showCustomerModal.value = false
}

const variantModal = reactive({
  open: false,
  loading: false,
  productId: '',
  productTitle: '',
  variants: [] as any[],
})

// Computed Helpers
const selectedCategory = computed(() => categories.value.find(c => c.id === selectedCategoryId.value))

const categoryDisplayTitle = (category?: Category | null): string => {
  if (!category) return ''
  return category.parentId ? `-> ${category.title}` : category.title
}

const sortedProducts = computed(() => {
  return [...products.value].sort((a, b) => a.title.localeCompare(b.title))
})

const filteredProducts = computed(() => {
  const q = productSearch.value.trim().toLowerCase()
  return sortedProducts.value.filter(p => {
    // 1. Filter by Category
    if (selectedCategoryId.value) {
      const ids = Array.from(
        new Set([
          ...(Array.isArray(p.categoryIds) ? p.categoryIds : []),
          p.categoryId,
          p.category?.id
        ].filter((id): id is string => typeof id === 'string' && id.length > 0))
      )
      if (!ids.includes(selectedCategoryId.value)) return false
    }
    // 2. Filter by Search
    if (!q) return true
    
    return (
      p.title.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q)
    )
  })
})

const canCreateSale = computed(() => cartItems.value.length > 0)

// Methods
function selectCategory(id: string | null) {
  selectedCategoryId.value = id
  productSearch.value = '' // Clear search on cat change
}

function cycleProductsPerRow() {
  if (productsPerRow.value === 3) productsPerRow.value = 4
  else if (productsPerRow.value === 4) productsPerRow.value = 5
  else if (productsPerRow.value === 5) productsPerRow.value = 6
  else productsPerRow.value = 3
}

function getProductMainImage(product: ProductListRow): string | undefined {
  if (product.productImages && product.productImages.length > 0) {
    const main = product.productImages.find(i => i.isMain)
    return main ? main.url : product.productImages[0].url
  }
  if (product.images && product.images.length > 0) return product.images[0]
  return undefined
}

function getSessionCount(index: number) {
  return Object.keys(cartSessions.value[index].items).length
}

// Cart Ops
function handleAddProduct(product: ProductListRow) {
  if (product.options && product.options.length > 0) {
    openVariantModal(product)
  } else {
    addToCart({
      key: product.id,
      productId: product.id,
      title: product.title,
      price: product.price,
      quantity: 1,
      imageUrl: getProductMainImage(product)
    })
  }
}

function addToCart(item: CartItem) {
  const session = cartSessions.value[activeSession.value]
  if (session.items[item.key]) {
    session.items[item.key].quantity++
  } else {
    session.items[item.key] = item
  }
}

function incrementQty(key: string) {
  if (currentSession.value.items[key]) currentSession.value.items[key].quantity++
}

function decrementQty(key: string) {
  const items = currentSession.value.items
  if (items[key]) {
    if (items[key].quantity > 1) {
      items[key].quantity--
    } else {
      delete items[key]
    }
  }
}

function removeFromCart(key: string) {
  delete currentSession.value.items[key]
}

function clearCart() {
  currentSession.value.items = {}
  currentSession.value.discount = 0
  currentSession.value.customerId = null
}

const openVariantModal = async (product: ProductListRow) => {
  variantModal.productId = product.id
  variantModal.productTitle = product.title
  variantModal.loading = true
  variantModal.open = true
  variantModal.variants = []

  try {
     const response = await $fetch(`/api/admin/products/${product.id}`, {
       headers: { Authorization: `Bearer ${authStore.token}` }
    }) as any
    
    variantModal.variants = (response.variants || []).map((v: any) => {
      const label = v.optionValues
        ? v.optionValues.map((ov: any) => ov.optionValue?.label).join(' / ')
        : 'Default'
      return {
        ...v,
        label,
        availableStock: v.stock - (v.reserved || 0)
      }
    })
  } catch (e) {
    console.error(e)
  } finally {
    variantModal.loading = false
  }
}

function closeVariantModal() {
  variantModal.open = false
}

function addVariantToCart(productId: string, productTitle: string, variant: any) {
  const key = `${productId}-${variant.id}`
  addToCart({
    key,
    productId,
    variantId: variant.id,
    title: productTitle,
    variantLabel: variant.label,
    price: variant.price,
    quantity: 1
  })
  closeVariantModal()
}

// Checkout
async function handlePaymentConfirm(payment: any) {
  placingSale.value = true
  try {
    const payload = {
      customerId: selectedCustomerId.value || null,
      items: cartItems.value.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        price: i.price
      })),
      payment: {
        method: payment.method,
        cashReceived: payment.cashReceived,
        cardAmount: payment.cardAmount
      }
    }

    await $fetch('/api/admin/sales', {
      method: 'POST',
      body: payload,
      headers: { Authorization: `Bearer ${authStore.token}` }
    })

    clearCart()
    showPaymentModal.value = false
    alert(t('admin.pages.pos.alerts.saleCreated'))
  } catch (e: any) {
    console.error('Sale failed', e)
    const errorMessage = e.data?.statusMessage || e.data?.message || e.message || t('admin.pages.pos.alerts.unknownError')
    alert(t('admin.pages.pos.alerts.saleFailed', { message: errorMessage }))
  } finally {
    placingSale.value = false
  }
}

function openExampleDialog(name: string) {
  alert(t('admin.pages.pos.alerts.featureComingSoon', { feature: name }))
}

function printLastSale() {
  alert(t('admin.pages.pos.alerts.reprintNotImplemented'))
}

// Initial Load
onMounted(async () => {
  try {
    const [cats, prods, custs] = await Promise.all([
      $fetch('/api/admin/categories', { headers: { Authorization: `Bearer ${authStore.token}` } }) as Promise<Category[]>,
      $fetch('/api/admin/products', { 
        headers: { Authorization: `Bearer ${authStore.token}` },
        query: { limit: 1000 }
      }) as Promise<ProductListRow[]>,
      $fetch('/api/admin/customers', { headers: { Authorization: `Bearer ${authStore.token}` } }) as Promise<any[]>
    ])
    
    categories.value = cats
    products.value = prods
    customers.value = custs
  } catch (e) {
    console.error('Populate failed', e)
  } finally {
    loadingProducts.value = false
  }
})
</script>
