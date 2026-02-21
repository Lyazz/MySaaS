const fs = require('fs');

let content = fs.readFileSync('pages/admin/orders/create.vue', 'utf8');

const oldModal = `    <!-- Variant Selection Modal inside create component for simplicity -->
    <PosVariantModal
      v-if="variantModalOpen"
      :is-open="variantModalOpen"
      :product-title="selectedProductForVariant?.title || ''"
      :variants="availableVariantsForSelection"
      :loading="loadingVariants"
      @close="variantModalOpen = false"
      @select="onVariantSelected"
    />`;

const newModal = `    <TransitionRoot
      appear
      :show="variantModalOpen"
      as="template"
    >
      <Dialog
        as="div"
        class="relative z-50"
        @close="variantModalOpen = false"
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
                  {{ selectedProductForVariant?.title || 'Select Variant' }}
                  <button
                    class="p-1 rounded-full hover:bg-slate-100 text-slate-400"
                    @click="variantModalOpen = false"
                  >
                    <Icon
                      name="lucide:x"
                      class="w-5 h-5"
                    />
                  </button>
                </DialogTitle>
                <div class="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
                  <div
                    v-if="loadingVariants"
                    class="py-8 text-center text-slate-500"
                  >
                    Loading variants...
                  </div>
                  <button
                    v-for="v in availableVariantsForSelection"
                    :key="v.id"
                    class="w-full p-4 rounded-xl border border-slate-100 hover:border-teal-500 hover:bg-teal-50 hover:ring-1 hover:ring-teal-500 transition-all flex justify-between items-center group"
                    @click="onVariantSelected(v)"
                  >
                    <div class="text-left">
                      <div class="font-semibold text-slate-900 group-hover:text-teal-800">
                        {{ v.label }}
                      </div>
                      <div class="text-xs text-slate-500 mt-0.5">
                        {{ v.availableStock }} in stock
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
    </TransitionRoot>`;

if (content.includes('PosVariantModal')) {
    content = content.replace(oldModal, newModal);
    
    // add imports
    if (!content.includes('import { Dialog')) {
        content = content.replace(
            "import { useAuthStore } from '~/stores/auth'",
            "import { useAuthStore } from '~/stores/auth'\nimport { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'"
        );
    }
    
    fs.writeFileSync('pages/admin/orders/create.vue', content);
    console.log('Fixed PosVariantModal');
} else {
    console.log('PosVariantModal not found, maybe already replaced?');
}
