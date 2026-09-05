<template>
  <div class="ui-card overflow-hidden">
    <!-- ── Summary header ── -->
    <div class="ui-card-header surface-2">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-micro font-bold uppercase tracking-[0.12em] text-muted">
            {{ t('admin.pages.billing.checkout.eyebrow') }}
          </p>
          <h2 class="mt-1 text-lg font-bold text-primary">{{ planName }}</h2>
          <p class="text-xs text-tertiary">{{ intervalLabel }}</p>
        </div>
        <button
          type="button"
          class="ui-btn ui-btn--ghost ui-btn--sm shrink-0"
          :aria-label="t('admin.common.close', 'Close')"
          @click="emit('dismiss')"
        >
          <Icon name="lucide:x" class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- ── Free plan: nothing to charge ── -->
    <div v-if="plan.free" class="ui-card-body space-y-4">
      <p class="text-sm leading-relaxed text-secondary">
        {{ t('admin.pages.billing.checkout.downgradeToFree', { date: date(currentPeriodEnd) }) }}
      </p>
      <button
        type="button"
        class="ui-btn ui-btn--secondary ui-btn--md w-full"
        :disabled="cancelBusy || cancelAtPeriodEnd"
        @click="emit('cancel-renewal')"
      >
        <Icon v-if="cancelBusy" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
        <Icon v-else name="lucide:calendar-x" class="h-4 w-4" />
        {{
          cancelAtPeriodEnd
            ? t('admin.pages.billing.checkout.renewalAlreadyOff')
            : t('admin.pages.billing.checkout.turnOffRenewal')
        }}
      </button>
    </div>

    <template v-else>
      <!-- ── Price breakdown ── -->
      <div class="ui-card-body space-y-2 border-b border-line">
        <div class="flex items-center justify-between text-sm">
          <span class="text-secondary">
            {{ t('admin.pages.billing.checkout.unitLine', { price: money(quote.monthlyEquivalentDzd), months: quote.months }) }}
          </span>
          <span class="tabular-nums text-secondary">{{ money(quote.totalDzd) }}</span>
        </div>

        <div v-if="quote.savingsDzd > 0" class="flex items-center justify-between text-sm">
          <span class="text-tertiary">
            {{ t('admin.pages.billing.checkout.listLine', { price: money(quote.listTotalDzd) }) }}
          </span>
          <span class="tabular-nums font-semibold text-success">
            −{{ money(quote.savingsDzd) }} ({{ quote.savingsPercent }}%)
          </span>
        </div>

        <div
 class="flex items-baseline justify-between pt-2 border-t border-line"
 
>
          <span class="text-sm font-semibold text-primary">
            {{ t('admin.pages.billing.checkout.total') }}
          </span>
          <span class="text-xl font-black tabular-nums text-primary">
            {{ money(quote.totalDzd) }} <span class="text-xs font-bold uppercase">{{ quote.currency }}</span>
          </span>
        </div>

        <p class="text-mini leading-relaxed text-muted">
          {{ t('admin.pages.billing.checkout.termNote', { start: date(termStart), end: date(termEnd) }) }}
        </p>
      </div>

      <!-- ── Method picker ── -->
      <div class="ui-card-body space-y-4">
        <div>
          <p class="ui-label mb-2">{{ t('admin.pages.billing.checkout.methodLabel') }}</p>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="method in methods"
              :key="method.id"
              type="button"
              class="flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 transition-all"
              :style="methodStyle(method.id)"
              :disabled="!method.available"
              :class="{ 'cursor-not-allowed opacity-50': !method.available }"
              @click="selectMethod(method.id)"
            >
              <Icon :name="method.icon" class="h-5 w-5" />
              <span class="text-mini font-semibold leading-tight text-center">
                {{ t(`admin.pages.billing.payment.methods.${method.id.toLowerCase()}`) }}
              </span>
              <span v-if="!method.available" class="text-micro uppercase tracking-wide text-muted">
                {{ t('admin.pages.billing.checkout.soon') }}
              </span>
            </button>
          </div>
        </div>

        <!-- ── Transfer instructions ── -->
        <div v-if="activeMethod" class="rounded-xl p-4 surface-2 border border-line">
          <p class="text-sm leading-relaxed text-secondary">
            {{ transferInstruction }}
          </p>

          <p
 v-if="activeMethod.settlementCurrency === 'EUR'"
 class="mt-1.5 text-mini leading-relaxed text-muted"
 
>
            {{ t('admin.pages.billing.checkout.eurNote', { rate: EUR_REFERENCE_RATE_DZD }) }}
          </p>

          <dl class="mt-3 space-y-1.5">
            <div
 v-for="row in activeMethod.account"
 :key="row.labelKey"
 class="flex items-center justify-between gap-3 rounded-lg px-3 py-2 surface-3"
 
>
              <dt class="text-mini uppercase tracking-wide text-muted">{{ t(row.labelKey) }}</dt>
              <dd class="flex min-w-0 items-center gap-2">
                <span class="truncate font-mono text-xs font-semibold text-primary">{{ row.value }}</span>
                <button
                  type="button"
                  class="shrink-0 transition-colors"
                  :style="{ color: copiedValue === row.value ? 'var(--brand)' : 'var(--text-muted)' }"
                  :aria-label="t('admin.pages.billing.checkout.copy')"
                  @click="copy(row.value)"
                >
                  <Icon :name="copiedValue === row.value ? 'lucide:check' : 'lucide:copy'" class="h-3.5 w-3.5" />
                </button>
              </dd>
            </div>
          </dl>
        </div>

        <!-- ── Proof upload ── -->
        <div v-if="activeMethod?.requiresProof">
          <p class="ui-label mb-2">{{ t('admin.pages.billing.payment.uploadProof') }}</p>
          <label
            class="flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors"
            :style="dropzoneStyle"
          >
            <Icon v-if="uploading" name="lucide:loader-2" class="mb-1.5 h-6 w-6 animate-spin [color:var(--brand)]" />
            <Icon v-else-if="proofUrl" name="lucide:file-check" class="mb-1.5 h-6 w-6 text-emerald-500" />
            <Icon v-else name="lucide:upload-cloud" class="mb-1.5 h-6 w-6 text-muted" />

            <span class="text-sm font-semibold" :style="{ color: proofUrl ? 'var(--status-delivered-text)' : 'var(--text-secondary)' }">
              {{ dropzoneLabel }}
            </span>
            <span v-if="!proofUrl && !uploading" class="mt-0.5 text-mini text-muted">
              {{ t('admin.pages.billing.checkout.fileHint') }}
            </span>

            <input
              type="file"
              class="hidden"
              accept="image/png, image/jpeg, image/webp, application/pdf"
              :disabled="uploading"
              @change="handleFileUpload"
            />
          </label>
          <p v-if="uploadError" class="mt-2 flex items-center gap-1.5 text-xs font-medium text-danger">
            <Icon name="lucide:alert-circle" class="h-3.5 w-3.5" />
            {{ uploadError }}
          </p>
        </div>

        <!-- ── Submit ── -->
        <button
          type="button"
          class="ui-btn ui-btn--primary ui-btn--md w-full"
          :disabled="!canSubmit"
          @click="submit"
        >
          <Icon v-if="submitting" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
          <Icon v-else name="lucide:shield-check" class="h-4 w-4" />
          {{ t('admin.pages.billing.checkout.submit', { amount: `${money(quote.totalDzd)} ${quote.currency}` }) }}
        </button>

        <p v-if="blockedReason" class="text-center text-mini text-muted">{{ blockedReason }}</p>

        <div
          v-if="submitError"
          class="flex items-start gap-2 rounded-xl p-3 text-sm"
          style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #ef4444"
        >
          <Icon name="lucide:alert-octagon" class="mt-0.5 h-4 w-4 shrink-0" />
          {{ submitError }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useBillingFormat } from '~/composables/useBillingFormat'
import {
  EUR_REFERENCE_RATE_DZD,
  PAYMENT_METHODS,
  getPaymentMethod,
  toEurGuideAmount
} from '~/shared/pricing/payment-methods'
import type { BillingInterval, PlanQuote } from '~/shared/pricing/plans'

type PlanEntry = { code: string; free: boolean; quotes: Record<BillingInterval, PlanQuote> }

const props = defineProps<{
  plan: PlanEntry
  interval: BillingInterval
  /** When the paid term would start — the end of the current one if it has time left. */
  termStart: string
  termEnd: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  cancelBusy?: boolean
  /** Set while a previous submission is still awaiting review. */
  hasPendingPayment?: boolean
}>()

const emit = defineEmits<{
  (e: 'submitted'): void
  (e: 'dismiss'): void
  (e: 'cancel-renewal'): void
}>()

const { t } = useI18n({ useScope: 'global' })
const { money, date } = useBillingFormat()
const { uploadWithProgress } = useUploadWithProgress()
const authStore = useAuthStore()

const methods = PAYMENT_METHODS
const quote = computed(() => props.plan.quotes[props.interval])
const planName = computed(() => t(`pricing.plans.${props.plan.code}.name`))
const intervalLabel = computed(() =>
  props.interval === 'year'
    ? t('admin.pages.billing.checkout.yearlyTerm')
    : t('admin.pages.billing.checkout.monthlyTerm')
)

const selectedMethod = ref<string>('')
const activeMethod = computed(() => (selectedMethod.value ? getPaymentMethod(selectedMethod.value) : null))

const proofUrl = ref('')
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref('')
const submitting = ref(false)
const submitError = ref('')
const copiedValue = ref('')

const selectMethod = (id: string) => {
  const method = getPaymentMethod(id)
  if (!method?.available) return
  selectedMethod.value = id
}

// A receipt belongs to the method it was issued by; changing method invalidates it.
watch(selectedMethod, () => {
  proofUrl.value = ''
  uploadError.value = ''
  submitError.value = ''
})

// Re-pricing the order invalidates a receipt for the old amount too.
watch(
  () => [props.plan.code, props.interval],
  () => {
    proofUrl.value = ''
    uploadError.value = ''
    submitError.value = ''
  }
)

const transferInstruction = computed(() => {
  const method = activeMethod.value
  if (!method) return ''

  if (method.settlementCurrency === 'EUR') {
    return t('admin.pages.billing.checkout.instructions.eur', {
      amount: `${toEurGuideAmount(quote.value.totalDzd)} EUR`
    })
  }
  return t('admin.pages.billing.checkout.instructions.dzd', {
    amount: `${money(quote.value.totalDzd)} ${quote.value.currency}`
  })
})

const dropzoneLabel = computed(() => {
  if (uploading.value) return `${t('admin.common.uploading', 'Uploading…')} ${uploadProgress.value}%`
  if (proofUrl.value) return t('admin.pages.billing.payment.uploadSuccess')
  return t('admin.common.clickToUpload', 'Click to upload receipt')
})

const dropzoneStyle = computed(() => {
  if (uploadError.value) return 'border-color: rgba(239,68,68,0.5); background: rgba(239,68,68,0.05)'
  if (proofUrl.value) return 'border-color: rgba(34,197,94,0.5); background: rgba(34,197,94,0.05)'
  return 'border-color: var(--surface-border); background: var(--surface-3)'
})

const methodStyle = (id: string) => {
  if (selectedMethod.value === id) {
    return 'background: rgba(var(--brand-rgb)/0.1); border-color: var(--brand); color: var(--brand)'
  }
  return 'background: var(--surface-3); border-color: var(--surface-border); color: var(--text-secondary)'
}

/** Why the submit button is off, said out loud instead of leaving it inert. */
const blockedReason = computed(() => {
  if (props.hasPendingPayment) return t('admin.pages.billing.checkout.blocked.pending')
  if (!activeMethod.value) return t('admin.pages.billing.checkout.blocked.noMethod')
  if (activeMethod.value.requiresProof && !proofUrl.value) return t('admin.pages.billing.checkout.blocked.noProof')
  return ''
})

const canSubmit = computed(
  () => !blockedReason.value && !uploading.value && !submitting.value
)

const authToken = () => {
  const token = (authStore as any).token?.value ?? (authStore as any).token
  return typeof token === 'string' && token ? token : null
}

const copy = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value)
    copiedValue.value = value
    setTimeout(() => {
      if (copiedValue.value === value) copiedValue.value = ''
    }, 1600)
  } catch {
    // Clipboard access can be denied; the value stays selectable on screen.
  }
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploading.value = true
  uploadProgress.value = 0
  uploadError.value = ''

  try {
    const res = (await uploadWithProgress<{ url: string }>({
      url: '/api/admin/billing/proofs/upload',
      file,
      token: authToken(),
      fallbackErrorMessage: t('admin.pages.billing.payment.errors.uploadFailed'),
      onProgress: (percent) => {
        uploadProgress.value = percent
      }
    })) as { url: string }

    proofUrl.value = res.url
  } catch (e: any) {
    uploadError.value = e?.message || e?.data?.error || t('admin.pages.billing.payment.errors.uploadFailed')
  } finally {
    uploading.value = false
    uploadProgress.value = 0
    target.value = ''
  }
}

async function submit() {
  const token = authToken()
  if (!token || !canSubmit.value) return

  submitting.value = true
  submitError.value = ''

  try {
    // No `amountDzd` here on purpose — the server prices the term from the
    // catalogue so the client cannot name its own figure.
    await $fetch('/api/admin/billing/payments/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        planCode: props.plan.code,
        interval: props.interval,
        method: selectedMethod.value,
        proofUrl: proofUrl.value
      }
    })

    emit('submitted')
  } catch (e: any) {
    submitError.value =
      e?.data?.statusMessage || e?.message || t('admin.pages.billing.payment.errors.submitFailed')
  } finally {
    submitting.value = false
  }
}
</script>
