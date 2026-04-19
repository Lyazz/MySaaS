<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-8"
      @click.self="handleCancel"
    >
      <div class="relative w-full max-w-lg rounded-lg bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div class="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100 shrink-0">
          <div class="min-w-0">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ title }}
            </h3>
            <p class="mt-1 text-sm text-gray-500">
              {{ subtitle }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            @click="handleCancel"
          >
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>

        <div class="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div class="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
              {{ t('admin.pages.cash.modals.delivery.amountLabel') }}
            </p>
            <p class="mt-1 text-lg font-semibold text-slate-900">
              {{ formatCurrency(amount) }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
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
            <p class="mt-1 text-xs text-slate-500">
              {{ t('admin.pages.cash.modals.delivery.cashboxHint') }}
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
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
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.cash.modals.delivery.referenceLabel') }}
              </label>
              <BaseInput
                v-model="reference"
                :placeholder="t('admin.pages.cash.modals.delivery.referencePlaceholder')"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('admin.pages.cash.modals.delivery.noteLabel') }}
            </label>
            <textarea
              v-model="note"
              rows="2"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:[border-color:var(--brand)] focus:[--tw-ring-color:var(--brand)]"
              :placeholder="t('admin.pages.cash.modals.delivery.notePlaceholder')"
            />
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 rounded-b-lg shrink-0">
          <button
            type="button"
            class="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="handleCancel"
          >
            {{ t('admin.common.cancel') }}
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-md [background:var(--brand)] text-white text-sm font-semibold hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canConfirm || loading"
            @click="handleConfirm"
          >
            <span v-if="!loading">{{ confirmText }}</span>
            <span v-else>{{ t('admin.common.updating') }}</span>
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
  amount: number
  loading?: boolean
  title?: string
  subtitle?: string
  confirmText?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [{ cashboxId: string; method: string; reference: string | null; note: string | null }]
  cancel: []
}>()

const { t } = useI18n({ useScope: 'global' })
const { format: formatCurrency } = useCurrency()

const cashboxId = ref('')
const method = ref<'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'>('CASH')
const reference = ref('')
const note = ref('')

const title = computed(() => props.title ?? t('admin.pages.cash.modals.delivery.title'))
const subtitle = computed(() => props.subtitle ?? t('admin.pages.cash.modals.delivery.subtitle'))
const confirmText = computed(() => props.confirmText ?? t('admin.pages.cash.modals.delivery.confirm'))

const selectableCashboxes = computed(() => (Array.isArray(props.cashboxes) ? props.cashboxes : []).filter((c) => c.isActive))
const canConfirm = computed(() => Boolean(cashboxId.value && method.value))

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
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
    cashboxId: cashboxId.value,
    method: method.value,
    reference: reference.value.trim() ? reference.value.trim() : null,
    note: note.value.trim() ? note.value.trim() : null
  })
  emit('update:modelValue', false)
}
</script>
