<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 py-8 bg-black/70 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] surface-2 border border-line shadow-overlay">
        <!-- Header -->
        <div class="px-6 py-4 flex items-center justify-between" style="border-bottom: 1px solid var(--surface-border); background: var(--surface-2)">
          <h2 class="text-xl font-bold text-primary">
            {{ t('admin.pages.pos.paymentModal.title') }}
          </h2>
          <button class="p-2 rounded-lg transition-colors text-muted" @click="$emit('close')">
            <Icon name="lucide:x" class="w-6 h-6" />
          </button>
        </div>

        <div class="flex flex-1 min-h-0 border-line">
          <!-- Left: Payment Details -->
          <div class="flex-1 p-4 lg:p-5 flex flex-col overflow-y-auto">
            <div class="text-center mb-4">
              <div class="text-sm font-medium lg:mb-1 text-tertiary">
                {{ t('admin.pages.pos.paymentModal.totalToPay') }}
              </div>
              <div class="text-4xl font-extrabold tracking-tight text-primary">
                {{ formatCurrency(total) }}
              </div>
            </div>

            <!-- Payment Methods -->
            <div class="grid grid-cols-2 gap-3 mb-4">
              <button
                class="flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border-2 transition-all"
                :class="method === 'cash' ? '[border-color:var(--brand)] [color:rgba(var(--brand-rgb)/0.85)]' : ''"
                :style="method === 'cash' ? 'background: rgba(var(--brand-rgb)/0.08)' : 'border-color: var(--surface-border); background: var(--surface-3); color: var(--text-secondary)'"
                @click="method = 'cash'"
              >
                <Icon name="lucide:banknote" class="w-5 h-5 mb-1" />
                <span class="font-bold text-sm">{{ t('admin.pages.pos.paymentModal.methods.cash') }}</span>
              </button>
              <button
                class="flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border-2 transition-all"
                :class="method === 'card' ? '[border-color:var(--brand)] [color:rgba(var(--brand-rgb)/0.85)]' : ''"
                :style="method === 'card' ? 'background: rgba(var(--brand-rgb)/0.08)' : 'border-color: var(--surface-border); background: var(--surface-3); color: var(--text-secondary)'"
                @click="method = 'card'"
              >
                <Icon name="lucide:credit-card" class="w-5 h-5 mb-1" />
                <span class="font-bold text-sm">{{ t('admin.pages.pos.paymentModal.methods.card') }}</span>
              </button>
            </div>

            <!-- Cash Input View -->
            <template v-if="method === 'cash'">
              <div class="mb-4">
                <label class="ui-label block mb-1.5">{{ t('admin.pages.pos.paymentModal.cashReceived') }}</label>
                <div class="flex items-center px-4 py-2 rounded-xl border-2 [border-color:var(--brand)]" style="background: var(--surface-3); box-shadow: 0 0 0 3px rgba(var(--brand-rgb)/0.1)">
                  <Icon name="lucide:banknote" class="w-5 h-5 [color:rgba(var(--brand-rgb)/0.85)] mr-3" />
                  <div class="flex-1 text-2xl font-bold text-primary">
                    <span class="text-muted" v-if="!cashReceivedString">0</span>
                    {{ cashReceivedString }}
                  </div>
                  <button v-if="cashReceivedString" class="p-1 rounded-full transition-colors hover:text-red-400 text-muted" @click="clearCash">
                    <Icon name="lucide:delete" class="w-5 h-5" />
                  </button>
                </div>
              </div>

              <!-- Smart Suggestions -->
              <div class="flex flex-wrap gap-2 mb-5">
                <button
                  v-for="amt in suggestions"
                  :key="amt"
                  class="px-4 py-2 rounded-lg font-semibold hover:[border-color:var(--brand)] hover:[color:rgba(var(--brand-rgb)/0.85)] transition-colors"
                  style="background: var(--surface-3); border: 1px solid var(--surface-border); color: var(--text-secondary)"
                  @click="setCashAmount(amt)"
                >
                  {{ formatCurrency(amt) }}
                </button>
              </div>

              <!-- Breakdown -->
              <div
                class="mt-auto p-4 rounded-xl"
                :class="isSettled ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-orange-500/10 border-orange-500/30'"
                style="border-width: 1px; border-style: solid"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-lg" :class="isSettled ? 'text-emerald-400' : 'text-orange-400'">
                    {{ isSettled ? t('admin.pages.pos.paymentModal.breakdown.changeToReturn') : t('admin.pages.pos.paymentModal.breakdown.remainingDue') }}
                  </span>
                  <span class="font-extrabold text-2xl" :class="isSettled ? 'text-emerald-400' : 'text-orange-400'">
                    {{ formatCurrency(isSettled ? change : remaining) }}
                  </span>
                </div>
              </div>
            </template>

            <!-- Card View -->
            <template v-else>
              <div class="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div class="w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-pulse surface-3">
                  <Icon name="lucide:credit-card" class="w-12 h-12 text-muted" />
                </div>
                <h3 class="text-xl font-bold mb-2 text-primary">
                  {{ t('admin.pages.pos.paymentModal.card.chargeToCard', { amount: formatCurrency(total) }) }}
                </h3>
                <p class="text-secondary">{{ t('admin.pages.pos.paymentModal.card.waiting') }}</p>
              </div>
            </template>
          </div>

          <!-- Right: Numpad -->
          <div class="w-72 p-4 lg:p-5 flex flex-col justify-center" style="background: var(--surface-3); border-left: 1px solid var(--surface-border)">
            <div class="mb-2 text-center">
              <span class="text-micro font-bold uppercase tracking-wider text-muted">{{ t('admin.pages.pos.paymentModal.keypad') }}</span>
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
        <div class="p-4" style="border-top: 1px solid var(--surface-border); background: var(--surface-2)">
          <button
            class="w-full h-12 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
            :class="canConfirm ? '[background:var(--brand)] hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] text-brand-contrast' : 'cursor-not-allowed opacity-40'"
            :style="!canConfirm ? 'background: var(--surface-3); color: var(--text-muted)' : ''"
            :disabled="!canConfirm"
            @click="confirmPayment"
          >
            <Icon v-if="loading" name="lucide:loader-2" class="w-5 h-5 animate-spin" />
            <span v-else>{{ t('admin.pages.pos.paymentModal.actions.confirmPayment') }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import PosNumberPad from './PosNumberPad.vue'

const props = defineProps<{ total: number; loading?: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', payment: { method: 'cash' | 'card', cashReceived: number, cardAmount: number }): void
}>()

const { t } = useI18n({ useScope: 'global' })
const { format: formatCurrency } = useCurrency()

const method = ref<'cash' | 'card'>('cash')
const cashReceivedString = ref('')

const cashReceived = computed(() => !cashReceivedString.value ? 0 : parseFloat(cashReceivedString.value))
const change = computed(() => Math.max(0, cashReceived.value - props.total))
const remaining = computed(() => Math.max(0, props.total - cashReceived.value))
const isSettled = computed(() => method.value === 'card' || cashReceived.value >= props.total)
const canConfirm = computed(() => !props.loading && (method.value === 'card' || isSettled.value))

const suggestions = computed(() => {
  const t = props.total
  if (t === 0) return []
  const amounts = new Set<number>()
  amounts.add(t)
  const ceilTo = (val: number, step: number) => Math.ceil(val / step) * step
  amounts.add(ceilTo(t, 5)); amounts.add(ceilTo(t, 10)); amounts.add(ceilTo(t, 20)); amounts.add(ceilTo(t, 50)); amounts.add(ceilTo(t, 100))
  return Array.from(amounts).sort((a, b) => a - b).filter(a => a >= t).slice(0, 4)
})

function setCashAmount(amt: number) { method.value = 'cash'; cashReceivedString.value = amt.toString() }

function handleNumpadInput(val: string) {
  if (method.value !== 'cash') { method.value = 'cash'; cashReceivedString.value = '' }
  if (val === '.') {
    if (cashReceivedString.value.includes('.')) return
    if (!cashReceivedString.value) { cashReceivedString.value = '0.'; return }
  }
  if (cashReceivedString.value.includes('.')) {
    const parts = cashReceivedString.value.split('.')
    if (parts[1].length >= 2) return
  }
  cashReceivedString.value += val
}

function handleNumpadBackspace() { if (cashReceivedString.value) cashReceivedString.value = cashReceivedString.value.slice(0, -1) }
function clearCash() { cashReceivedString.value = '' }

function confirmPayment() {
  if (!canConfirm.value) return
  emit('confirm', { method: method.value, cashReceived: method.value === 'cash' ? cashReceived.value : 0, cardAmount: method.value === 'card' ? props.total : 0 })
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { emit('close'); return }
  if (e.key === 'Enter') { confirmPayment(); return }
  if (method.value === 'cash') {
    if (/^[0-9.]$/.test(e.key)) handleNumpadInput(e.key)
    else if (e.key === 'Backspace') handleNumpadBackspace()
  }
}
</script>
