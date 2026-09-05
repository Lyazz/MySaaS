<template>
  <UiModal
    :open="open"
    size="md"
    :title="t('admin.pages.aiImport.upload.title')"
    @close="close"
  >
    <div class="space-y-5">
      <p class="text-sm text-secondary">
        {{ t('admin.pages.aiImport.upload.intro') }}
      </p>

      <fieldset class="space-y-2">
        <legend class="ui-label">
          {{ t('admin.pages.aiImport.upload.kindLabel') }}
        </legend>
        <div class="grid gap-2 sm:grid-cols-3">
          <button
            v-for="option in kindOptions"
            :key="option.value"
            type="button"
            class="flex flex-col rounded-xl border p-3 text-start transition hover:border-line-strong"
            :class="kind === option.value ? 'border-line-strong surface-2' : 'border-line surface-1'"
            :aria-pressed="kind === option.value"
            @click="kind = option.value"
          >
            <Icon
              :name="option.icon"
              class="h-4 w-4 text-brand"
            />
            <span class="mt-1.5 block text-sm font-medium text-primary">{{ t(option.labelKey) }}</span>
            <span class="mt-0.5 mb-2 block text-mini text-tertiary">{{ t(option.hintKey) }}</span>
            <span class="mt-auto flex items-start gap-1.5 text-mini text-secondary">
              <Icon
                name="lucide:eye"
                class="mt-0.5 h-3 w-3 shrink-0 text-tertiary"
              />
              <span>{{ t(option.traitKey) }}</span>
            </span>
          </button>
        </div>

        <!--
          The chosen kind is sent to the model as a hint, so a wrong pick costs
          accuracy, not just a label. These are the traits that actually
          separate the three on an Algerian supplier document.
        -->
        <div class="rounded-xl border border-line surface-2 p-3">
          <p class="flex items-center gap-1.5 text-mini font-medium text-primary">
            <Icon
              name="lucide:camera"
              class="h-3.5 w-3.5 text-brand"
            />
            {{ t('admin.pages.aiImport.upload.tips.title') }}
          </p>
          <ul class="mt-1.5 space-y-1">
            <li
              v-for="tip in captureTips"
              :key="tip"
              class="flex items-start gap-1.5 text-mini text-tertiary"
            >
              <Icon
                name="lucide:check"
                class="mt-0.5 h-3 w-3 shrink-0 text-brand"
              />
              <span>{{ t(tip) }}</span>
            </li>
          </ul>
        </div>
      </fieldset>

      <div
        class="ui-dropzone rounded-2xl border border-dashed border-line p-6 text-center"
        :class="dragging ? 'border-line-strong surface-2' : ''"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <Icon
          name="lucide:scan-line"
          class="mx-auto h-8 w-8 text-tertiary"
        />
        <p class="mt-2 text-sm text-primary">
          {{ t('admin.pages.aiImport.upload.dropHint') }}
        </p>
        <p class="mt-1 text-mini text-tertiary">
          {{ t('admin.pages.aiImport.upload.formats') }}
        </p>

        <UiButton
          class="mt-3"
          variant="secondary"
          size="sm"
          icon="lucide:image-plus"
          :disabled="busy"
          @click="picker?.click()"
        >
          {{ t('admin.pages.aiImport.upload.choose') }}
        </UiButton>

        <input
          ref="picker"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          capture="environment"
          class="hidden"
          @change="onPick"
        >

        <p
          v-if="fileName"
          class="mt-3 truncate text-mini text-secondary"
        >
          {{ fileName }}
        </p>
      </div>

      <div
        v-if="busy"
        class="space-y-1.5"
      >
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            class="h-full rounded-full bg-brand transition-all"
            :style="{ width: `${percent}%` }"
          />
        </div>
        <p class="text-mini text-tertiary">
          {{ t('admin.pages.aiImport.upload.uploading') }}
        </p>
      </div>

      <p
        v-if="error"
        class="ui-error"
      >
        {{ error }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UiButton
          variant="ghost"
          :disabled="busy"
          @click="close"
        >
          {{ t('admin.common.cancel') }}
        </UiButton>
        <UiButton
          :loading="busy"
          :disabled="!file"
          icon="lucide:sparkles"
          @click="submit"
        >
          {{ t('admin.pages.aiImport.upload.submit') }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AiDocumentKind } from '~/composables/useAiImportJob'

const props = defineProps<{ open: boolean; defaultKind?: AiDocumentKind }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'created', jobId: string): void }>()

const { t } = useI18n({ useScope: 'global' })
const { upload, uploadPercent } = useAiImportJob()

const kindOptions: {
  value: AiDocumentKind
  labelKey: string
  hintKey: string
  /** What the document looks like, so the merchant picks the right one. */
  traitKey: string
  icon: string
}[] = [
  {
    value: 'PURCHASE_INVOICE',
    labelKey: 'admin.pages.aiImport.kinds.invoice',
    hintKey: 'admin.pages.aiImport.kinds.invoiceHint',
    traitKey: 'admin.pages.aiImport.kinds.invoiceTrait',
    icon: 'lucide:receipt-text'
  },
  {
    value: 'DELIVERY_NOTE',
    labelKey: 'admin.pages.aiImport.kinds.deliveryNote',
    hintKey: 'admin.pages.aiImport.kinds.deliveryNoteHint',
    traitKey: 'admin.pages.aiImport.kinds.deliveryNoteTrait',
    icon: 'lucide:truck'
  },
  {
    value: 'PRODUCT_CATALOG',
    labelKey: 'admin.pages.aiImport.kinds.catalog',
    hintKey: 'admin.pages.aiImport.kinds.catalogHint',
    traitKey: 'admin.pages.aiImport.kinds.catalogTrait',
    icon: 'lucide:list',
  }
]

/** Shown under the kind picker; ordered by how much each one costs accuracy. */
const captureTips = [
  'admin.pages.aiImport.upload.tips.frame',
  'admin.pages.aiImport.upload.tips.flat',
  'admin.pages.aiImport.upload.tips.light',
  'admin.pages.aiImport.upload.tips.focus',
  'admin.pages.aiImport.upload.tips.pages'
]

const MAX_BYTES = 10 * 1024 * 1024

const kind = ref<AiDocumentKind>(props.defaultKind ?? 'PURCHASE_INVOICE')
const picker = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const fileName = ref('')
const dragging = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const percent = uploadPercent

watch(
  () => props.open,
  (open) => {
    if (!open) return
    kind.value = props.defaultKind ?? 'PURCHASE_INVOICE'
    file.value = null
    fileName.value = ''
    error.value = null
    busy.value = false
  }
)

const accept = (candidate: File | undefined) => {
  dragging.value = false
  if (!candidate) return
  if (candidate.size > MAX_BYTES) {
    error.value = t('admin.pages.aiImport.errors.tooLarge')
    return
  }
  error.value = null
  file.value = candidate
  fileName.value = candidate.name
}

const onPick = (event: Event) => {
  accept((event.target as HTMLInputElement).files?.[0])
  ;(event.target as HTMLInputElement).value = ''
}

const onDrop = (event: DragEvent) => accept(event.dataTransfer?.files?.[0])

const close = () => {
  if (busy.value) return
  emit('close')
}

const submit = async () => {
  if (!file.value) return
  busy.value = true
  error.value = null
  try {
    emit('created', await upload(file.value, kind.value))
  } catch (err: any) {
    error.value =
      err?.data?.statusMessage || err?.message || t('admin.pages.aiImport.errors.uploadFailed')
  } finally {
    busy.value = false
  }
}
</script>
