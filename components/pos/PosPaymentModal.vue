<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <h2 class="text-xl font-bold text-gray-900">
          {{ t('admin.pages.pos.paymentModal.title') }}
        </h2>
        <div class="flex items-center gap-2">
          <button
            class="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            @click="$emit('close')"
          >
            <Icon
              name="lucide:x"
              class="w-6 h-6"
            />
          </button>
        </div>
      </div>

      <div class="flex flex-1 min-h-0 divide-x divide-gray-100">
        <!-- Left: Payment Details -->
        <div class="flex-1 p-4 lg:p-5 flex flex-col overflow-y-auto">
          <div class="text-center mb-4">
            <div class="text-sm text-gray-500 font-medium lg:mb-1">
              {{ t('admin.pages.pos.paymentModal.totalToPay') }}
            </div>
            <div class="text-4xl font-extrabold text-gray-900 tracking-tight">
              {{ formatCurrency(total) }}
            </div>
          </div>

          <!-- Payment Methods -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <button
              class="flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border-2 transition-all"
              :class="method === 'cash' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'"
              @click="method = 'cash'"
            >
              <Icon
                name="lucide:banknote"
                class="w-5 h-5 mb-1"
              />
              <span class="font-bold text-sm">{{ t('admin.pages.pos.paymentModal.methods.cash') }}</span>
            </button>
            <button
              class="flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border-2 transition-all"
              :class="method === 'card' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'"
              @click="method = 'card'"
            >
              <Icon
                name="lucide:credit-card"
                class="w-5 h-5 mb-1"
              />
              <span class="font-bold text-sm">{{ t('admin.pages.pos.paymentModal.methods.card') }}</span>
            </button>
          </div>

          <!-- Cash Input View -->
          <template v-if="method === 'cash'">
            <div class="mb-4">
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">{{ t('admin.pages.pos.paymentModal.cashReceived') }}</label>
              <div
                class="flex items-center px-4 py-2 rounded-xl border-2 border-teal-600 bg-white shadow-sm ring-4 ring-teal-50"
              >
                <Icon
                  name="lucide:banknote"
                  class="w-5 h-5 text-teal-600 mr-3"
                />
                <div class="flex-1 text-2xl font-bold text-gray-900">
                  <span v-if="!cashReceivedString" class="text-gray-300">0</span>
                  {{ cashReceivedString }}
                </div>
                <button
                  v-if="cashReceivedString"
                  class="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500"
                  @click="clearCash"
                >
                  <Icon
                    name="lucide:delete"
                    class="w-5 h-5"
                  />
                </button>
              </div>
            </div>

            <!-- Smart Suggestions -->
            <div class="flex flex-wrap gap-2 mb-5">
              <button
                v-for="amt in suggestions"
                :key="amt"
                class="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-semibold hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50 transition-colors shadow-sm"
                @click="setCashAmount(amt)"
              >
                {{ formatCurrency(amt) }}
              </button>
            </div>

            <!-- Breakdown -->
            <div
              class="mt-auto p-4 rounded-xl border"
              :class="isSettled ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'"
            >
              <div class="flex items-center justify-between">
                <span
                  class="font-bold text-lg"
                  :class="isSettled ? 'text-green-800' : 'text-orange-800'"
                >
                  {{ isSettled ? t('admin.pages.pos.paymentModal.breakdown.changeToReturn') : t('admin.pages.pos.paymentModal.breakdown.remainingDue') }}
                </span>
                <span
                  class="font-extrabold text-2xl"
                  :class="isSettled ? 'text-green-700' : 'text-orange-700'"
                >
                  {{ formatCurrency(isSettled ? change : remaining) }}
                </span>
              </div>
            </div>
          </template>

          <!-- Card View -->
          <template v-else>
            <div class="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6 animate-pulse">
                <Icon
                  name="lucide:credit-card"
                  class="w-12 h-12 text-gray-400"
                />
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">
                {{ t('admin.pages.pos.paymentModal.card.chargeToCard', { amount: formatCurrency(total) }) }}
              </h3>
              <p class="text-gray-500">
                {{ t('admin.pages.pos.paymentModal.card.waiting') }}
              </p>
            </div>
          </template>
        </div>

        <!-- Right: Numpad (Desktop Only) -->
        <div class="w-72 bg-gray-50 p-4 lg:p-5 flex flex-col justify-center border-l border-gray-100">
          <div class="mb-2 text-center">
             <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{{ t('admin.pages.pos.paymentModal.keypad') }}</span>
          </div>
          <PosNumberPad
            :allow-decimal="true"
            @input="handleNumpadInput"
            @backspace="handleNumpadBackspace"
            @clear="clearCash"
            @confirm="confirmPayment"
          />
        </div>
      </div>

      <!-- Footer Action -->
      <div class="p-4 border-t border-gray-100 bg-white">
        <button
          class="w-full h-12 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
          :class="canConfirm ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg hover:shadow-teal-500/30' : 'bg-gray-100 text-gray-400 cursor-not-allowed'"
          :disabled="!canConfirm"
          @click="confirmPayment"
        >
          <Icon
            v-if="loading"
            name="lucide:loader-2"
            class="w-5 h-5 animate-spin"
          />
          <span v-else>{{ t('admin.pages.pos.paymentModal.actions.confirmPayment') }}</span>
        </button>
      </div>
    </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import PosNumberPad from './PosNumberPad.vue'

const props = defineProps<{
  total: number
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', payment: { method: 'cash' | 'card', cashReceived: number, cardAmount: number }): void
}>()

const { t } = useI18n({ useScope: 'global' })
const { format: formatCurrency } = useCurrency()

const method = ref<'cash' | 'card'>('cash')
const cashReceivedString = ref('')

// Computed
const cashReceived = computed(() => {
  if (!cashReceivedString.value) return 0
  return parseFloat(cashReceivedString.value)
})

const change = computed(() => Math.max(0, cashReceived.value - props.total))
const remaining = computed(() => Math.max(0, props.total - cashReceived.value))
const isSettled = computed(() => {
  if (method.value === 'card') return true
  return cashReceived.value >= props.total
})

const canConfirm = computed(() => {
  if (props.loading) return false
  if (method.value === 'card') return true
  return isSettled.value
})

const suggestions = computed(() => {
  const t = props.total
  if (t === 0) return []
  
  const amounts = new Set<number>()
  
  // Exact amount
  amounts.add(t)
  
  // Next 5, 10, 20, 50, 100
  const ceilTo = (val: number, step: number) => Math.ceil(val / step) * step
  
  amounts.add(ceilTo(t, 5))
  amounts.add(ceilTo(t, 10))
  amounts.add(ceilTo(t, 20))
  amounts.add(ceilTo(t, 50))
  amounts.add(ceilTo(t, 100))
  
  return Array.from(amounts).sort((a, b) => a - b).filter(a => a >= t).slice(0, 4)
})

// Quick set
function setCashAmount(amt: number) {
  method.value = 'cash'
  cashReceivedString.value = amt.toString()
}

// Numpad Handlers
function handleNumpadInput(val: string) {
  if (method.value !== 'cash') {
    method.value = 'cash'
    cashReceivedString.value = ''
  }
  
  if (val === '.') {
    if (cashReceivedString.value.includes('.')) return
    if (!cashReceivedString.value) {
      cashReceivedString.value = '0.'
      return
    }
  }
  
  // Limit decimals
  if (cashReceivedString.value.includes('.')) {
    const parts = cashReceivedString.value.split('.')
    if (parts[1].length >= 2) return
  }
  
  cashReceivedString.value += val
}

function handleNumpadBackspace() {
  if (!cashReceivedString.value) return
  cashReceivedString.value = cashReceivedString.value.slice(0, -1)
}

function clearCash() {
  cashReceivedString.value = ''
}

function confirmPayment() {
  if (!canConfirm.value) return
  
  emit('confirm', {
    method: method.value,
    cashReceived: method.value === 'cash' ? cashReceived.value : 0,
    cardAmount: method.value === 'card' ? props.total : 0
  })
}

// Keyboard support
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  
  if (e.key === 'Enter') {
    confirmPayment()
    return
  }
  
  if (method.value === 'cash') {
    if (/^[0-9.]$/.test(e.key)) {
      handleNumpadInput(e.key)
    } else if (e.key === 'Backspace') {
      handleNumpadBackspace()
    }
  }
}
</script>
