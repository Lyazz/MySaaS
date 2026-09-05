<template>
  <div class="max-w-[100rem] mx-auto space-y-6">
    <UiPageHeader
      :section="t('admin.pages.aiImport.kicker')"
      :title="t(`admin.pages.aiImport.kinds.${kindKey}`)"
      :subtitle="t('admin.pages.aiImport.review.subtitle')"
    >
      <template #actions>
        <UiButton
          variant="ghost"
          icon="lucide:arrow-left"
          :to="backTo"
        >
          {{ t('admin.common.back') }}
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Extraction in flight -->
    <UiCard v-if="isWorking">
      <div class="flex items-center gap-3 py-6">
        <Icon
          name="lucide:loader-circle"
          class="h-5 w-5 animate-spin text-brand"
        />
        <div>
          <p class="text-sm font-medium text-primary">
            {{ t('admin.pages.aiImport.review.reading') }}
          </p>
          <p class="text-mini text-tertiary">
            {{ t('admin.pages.aiImport.review.readingHint') }}
          </p>
        </div>
      </div>
    </UiCard>

    <UiCard v-else-if="job?.status === 'FAILED'">
      <UiEmptyState
        icon="lucide:file-x"
        :title="t('admin.pages.aiImport.review.failedTitle')"
        :description="job.errorMessage || t('admin.pages.aiImport.review.failedHint')"
      >
        <UiButton
          icon="lucide:rotate-ccw"
          :to="backTo"
        >
          {{ t('admin.pages.aiImport.review.tryAgain') }}
        </UiButton>
      </UiEmptyState>
    </UiCard>

    <UiCard v-else-if="job?.status === 'CONFIRMED'">
      <UiEmptyState
        icon="lucide:circle-check"
        :title="t('admin.pages.aiImport.review.alreadyImported')"
        :description="t('admin.pages.aiImport.review.alreadyImportedHint')"
      >
        <UiButton
          v-if="job.purchaseOrderId"
          :to="`/admin/purchases/${job.purchaseOrderId}`"
        >
          {{ t('admin.pages.aiImport.review.openPurchase') }}
        </UiButton>
      </UiEmptyState>
    </UiCard>

    <template v-else-if="draft">
      <!-- What still needs a human -->
      <div
        v-if="pendingReview.size || draft.totalsMismatch"
        class="rounded-2xl border border-line surface-2 p-4"
      >
        <div class="flex items-start gap-3">
          <Icon
            name="lucide:triangle-alert"
            class="mt-0.5 h-5 w-5 text-warning"
          />
          <div class="space-y-1">
            <p
              v-if="pendingReview.size"
              class="text-sm font-medium text-primary"
            >
              {{ t('admin.pages.aiImport.review.needsReview', { count: pendingReview.size }) }}
            </p>
            <p
              v-if="pendingReview.size"
              class="text-mini text-secondary"
            >
              {{ t('admin.pages.aiImport.review.needsReviewHint') }}
            </p>
            <p
              v-if="draft.totalsMismatch"
              class="text-mini text-secondary"
            >
              {{
                t('admin.pages.aiImport.review.totalsMismatch', {
                  computed: formatMoney(draft.totalsMismatch.computed),
                  printed: formatMoney(draft.totalsMismatch.printed)
                })
              }}
            </p>
          </div>
        </div>
      </div>

      <p
        v-if="error"
        class="ui-error"
      >
        {{ error }}
      </p>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div class="space-y-6">
          <AdminAiImportDocumentViewer
            :url="documentUrl"
            :mime-type="job?.mimeType ?? ''"
          />

          <AdminAiImportSupplierResolver
            v-if="kindKey !== 'catalog'"
            v-model="draft.supplier"
            :suppliers="suppliers"
            @update:model-value="persistSoon()"
          />

          <UiCard :title="t('admin.pages.aiImport.review.detailsTitle')">
            <div class="grid gap-4 sm:grid-cols-2">
              <UiInput
                v-model="referenceModel"
                :label="t('admin.pages.aiImport.review.reference')"
              />
              <UiInput
                v-model="issuedAtModel"
                type="date"
                :label="t('admin.pages.aiImport.review.issuedAt')"
              />
            </div>
            <p
              v-if="draft.notes"
              class="mt-3 text-mini text-tertiary"
            >
              {{ t('admin.pages.aiImport.review.modelNotes', { notes: draft.notes }) }}
            </p>
          </UiCard>
        </div>

        <div class="space-y-4">
          <AdminAiImportMarginControl
            v-model="marginModel"
            :pinned-count="pinnedCount"
            @apply="applyMarginToAll"
          />

          <AdminAiImportExtractedLinesTable
            :lines="draft.lines"
            :variants="job?.variants ?? {}"
            :pending-review="pendingReview"
            @update="onLineUpdate"
            @review="markReviewed"
          />
        </div>
      </div>

      <!-- Confirm bar -->
      <div
        class="sticky bottom-0 z-10 -mx-4 border-t border-line surface-1 px-4 py-3 shadow-card sm:mx-0 sm:rounded-2xl sm:border"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="text-mini text-secondary">
            <span class="font-mono-nums">{{ totals.lineCount }}</span>
            {{ t('admin.pages.aiImport.confirm.lines') }} ·
            <span class="font-mono-nums">{{ totals.quantity }}</span>
            {{ t('admin.pages.aiImport.confirm.units') }} ·
            <span class="font-mono-nums">{{ formatMoney(totals.cost) }}</span>
            <span
              v-if="saving"
              class="ms-2 text-tertiary"
            >{{ t('admin.common.saving') }}</span>
          </div>

          <div class="flex items-center gap-2">
            <UiButton
              variant="ghost"
              :disabled="confirming"
              @click="discard"
            >
              {{ t('admin.pages.aiImport.confirm.discard') }}
            </UiButton>
            <UiButton
              icon="lucide:check"
              :loading="confirming"
              :disabled="!canConfirm"
              @click="onConfirm"
            >
              {{ t('admin.pages.aiImport.confirm.submit') }}
            </UiButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import type { DraftLine } from '~/composables/useAiImportJob'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.aiImport.title'
})

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { format: formatMoney } = useCurrency()
const { showToast } = useToast()

const {
  job,
  draft,
  documentUrl,
  saving,
  confirming,
  error,
  pendingReview,
  canConfirm,
  totals,
  load,
  loadDocumentUrl,
  followExtraction,
  persistSoon,
  confirm,
  cancel,
  markReviewed,
  applyMarginToAll
} = useAiImportJob()

const jobId = computed(() => String(route.params.id))
const suppliers = ref<{ id: string; name: string }[]>([])
let cancelled = false

const isWorking = computed(() => job.value?.status === 'PENDING' || job.value?.status === 'EXTRACTING')

const kindKey = computed(() => {
  switch (job.value?.kind) {
    case 'DELIVERY_NOTE':
      return 'deliveryNote'
    case 'PRODUCT_CATALOG':
      return 'catalog'
    default:
      return 'invoice'
  }
})

const backTo = computed(() => (kindKey.value === 'catalog' ? '/admin/products' : '/admin/purchases'))

const pinnedCount = computed(() => (draft.value?.lines ?? []).filter((l) => l.salePricePinned).length)

/** Two-way bindings that persist on change, so nothing is lost on a closed tab. */
const bind = <K extends 'reference' | 'issuedAt'>(key: K) =>
  computed({
    get: () => draft.value?.[key] ?? '',
    set: (value: string) => {
      if (!draft.value) return
      draft.value[key] = value || null
      persistSoon()
    }
  })

const referenceModel = bind('reference')
const issuedAtModel = bind('issuedAt')

const marginModel = computed({
  get: () => draft.value?.marginPercent ?? 30,
  set: (value: number) => {
    if (!draft.value) return
    draft.value.marginPercent = value
  }
})

const onLineUpdate = (line: DraftLine, patch: Partial<DraftLine>) => {
  Object.assign(line, patch)
  // A sale price the merchant did not pin follows the cost.
  if ('unitCost' in patch && !line.salePricePinned && draft.value) {
    line.salePrice =
      line.unitCost > 0 ? Math.round(line.unitCost * (1 + draft.value.marginPercent / 100)) : null
  }
  persistSoon()
}

const loadSuppliers = async () => {
  try {
    suppliers.value = await $fetch('/api/admin/suppliers', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } catch {
    suppliers.value = []
  }
}

const onConfirm = async () => {
  const result = await confirm()
  if (!result) return
  showToast(t('admin.pages.aiImport.confirm.done'), 'success')
  await router.push(
    result.purchaseOrderId ? `/admin/purchases/${result.purchaseOrderId}` : '/admin/products'
  )
}

const discard = async () => {
  await cancel()
  await router.push(backTo.value)
}

onMounted(async () => {
  await load(jobId.value)
  if (cancelled) return

  void loadDocumentUrl(jobId.value)
  void loadSuppliers()

  if (isWorking.value) await followExtraction(jobId.value)
})

onUnmounted(() => {
  cancelled = true
})
</script>
