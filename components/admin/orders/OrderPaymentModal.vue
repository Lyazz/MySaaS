<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-8"
      @click.self="handleCancel"
    >
      <div class="relative w-full max-w-lg rounded-lg surface-1 border border-[var(--surface-border)] shadow-xl flex flex-col max-h-[90vh]">
        <div class="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--surface-border)] shrink-0">
          <div class="min-w-0">
            <h3 class="text-lg font-semibold text-primary">
              {{ title }}
            </h3>
            <p class="mt-1 text-sm text-secondary">
              {{ subtitle }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-md p-2 text-tertiary hover:surface-2 hover:text-primary transition-colors"
            @click="handleCancel"
          >
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>

        <div class="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <label class="ui-label">
              {{ t('admin.common.amount') }}
            </label>
            <BaseInput
              v-model="amount"
              type="number"
              min="0"
              step="any"
              :placeholder="t('admin.common.amount')"
            />
            <p class="mt-1 text-xs text-secondary">
              {{ t('admin.pages.orders.detail.sections.remainingAmount') }}: {{ formatCurrency(remainingAmount) }}
            </p>
            <p v-if="parsedAmount > remainingAmount" class="mt-1 text-xs text-red-500">
              {{ t('admin.common.errors.amountTooHigh', 'Amount cannot be greater than the remaining balance.') }}
            </p>
          </div>

          <div>
            <label class="ui-label">
              {{ t('admin.pages.cash.modals.delivery.cashboxLabel') }}
            </label>
            <BaseSelect v-model="cashboxId">
              <option value="" disabled>
                {{ t('admin.pages.cash.modals.delivery.cashboxPlaceholder') }}
              </option>
              <option
                v-for="c in selectableCashboxes"
                :key="c.id"
                :value="c.id"
                :disabled="!c.openSession"
              >
                {{ c.name }}{{ c.openSession ? '' : ` (${t('admin.pages.cash.modals.delivery.noOpenSession')})` }}
              </option>
            </BaseSelect>
            <p class="mt-1 text-xs text-secondary">
              {{ t('admin.pages.cash.modals.delivery.cashboxHint') }}
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="ui-label">
                {{ t('admin.pages.cash.modals.delivery.methodLabel') }}
              </label>
              <BaseSelect v-model="method">
                <option value="CASH">{{ t('admin.pages.cash.methods.CASH') }}</option>
                <option value="CARD">{{ t('admin.pages.cash.methods.CARD') }}</option>
                <option value="TRANSFER">{{ t('admin.pages.cash.methods.TRANSFER') }}</option>
                <option value="OTHER">{{ t('admin.pages.cash.methods.OTHER') }}</option>
              </BaseSelect>
            </div>

            <div>
              <label class="ui-label">
                {{ t('admin.pages.cash.modals.delivery.referenceLabel') }}
              </label>
              <BaseInput
                v-model="reference"
                :placeholder="t('admin.pages.cash.modals.delivery.referencePlaceholder')"
              />
            </div>
          </div>

          <div>
            <label class="ui-label">
              {{ t('admin.pages.cash.modals.delivery.noteLabel') }}
            </label>
            <textarea
              v-model="note"
              rows="2"
              class="ui-input resize-none"
              :placeholder="t('admin.pages.cash.modals.delivery.notePlaceholder')"
            />
          </div>
        </div>

        <div class="px-6 py-4 border-t border-[var(--surface-border)] surface-2 flex items-center justify-end gap-3 rounded-b-lg shrink-0">
          <button
            type="button"
            class="ui-btn ui-btn--ghost"
            @click="handleCancel"
          >
            {{ t('admin.common.cancel') }}
          </button>
          <button
            type="button"
            class="ui-btn ui-btn--primary"
            :disabled="!canConfirm || loading"
            @click="handleConfirm"
          >
            <span v-if="!loading">{{ confirmText }}</span>
            <span v-else>
              <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin me-2 inline" />
              {{ t('admin.common.updating') }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'

type Cashbox = {
  id: string
  name: string
  isActive: boolean
  openSession: null | { id: string; openedAt: string; openingFloat: string | number }
}

const props = defineProps<{
  modelValue: boolean
  cashboxes: Cashbox[]
  defaultAmount: number
  remainingAmount: number
  loading?: boolean
  title?: string
  subtitle?: string
  confirmText?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [{ amount: number; cashboxId: string; method: string; reference: string | null; note: string | null }]
  cancel: []
}>()

const { t } = useI18n({ useScope: 'global' })
const { format: formatCurrency } = useCurrency()

const amount = ref<number | ''>('')
const cashboxId = ref('')
const method = ref<'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'>('CASH')
const reference = ref('')
const note = ref('')

const title = computed(() => props.title ?? t('admin.pages.orders.modals.payment.title', 'Enregistrer le paiement'))
const subtitle = computed(() => props.subtitle ?? t('admin.pages.orders.modals.payment.subtitle', 'Enregistrer un nouveau paiement pour cette commande.'))
const confirmText = computed(() => props.confirmText ?? t('admin.pages.orders.modals.payment.confirm', 'Enregistrer le paiement'))

const selectableCashboxes = computed(() => (Array.isArray(props.cashboxes) ? props.cashboxes : []).filter((c) => c.isActive))
const parsedAmount = computed(() => Number(amount.value))
const canConfirm = computed(() => Boolean(cashboxId.value && method.value && !isNaN(parsedAmount.value) && parsedAmount.value > 0 && parsedAmount.value <= props.remainingAmount))

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      amount.value = props.defaultAmount || 0
      cashboxId.value = ''
      method.value = 'CASH'
      reference.value = ''
      note.value = ''
    }
  }
)

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

function handleConfirm() {
  if (!canConfirm.value) return
  emit('confirm', {
    amount: Number(amount.value),
    cashboxId: cashboxId.value,
    method: method.value,
    reference: reference.value.trim() ? reference.value.trim() : null,
    note: note.value.trim() ? note.value.trim() : null
  })
  emit('update:modelValue', false)
}
</script>
