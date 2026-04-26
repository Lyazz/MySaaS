<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4" @click.self="cancel">
      <div class="w-full max-w-5xl overflow-hidden rounded-xl" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <div class="flex items-center justify-between border-b px-4 py-3" style="border-color: var(--surface-border)">
          <div>
            <h3 class="text-sm font-semibold" style="color: var(--text-primary)">
              {{ title || t('admin.components.imageCropper.title') }}
            </h3>
            <p class="text-xs" style="color: var(--text-tertiary)">
              {{ subtitleText }}
            </p>
          </div>
          <button
            type="button"
            class="rounded p-1.5" style="color: var(--text-tertiary); border: 1px solid var(--surface-border)"
            :disabled="processing"
            @click="cancel"
          >
            <Icon name="lucide:x" class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-4 p-4">
          <div v-if="showPresetSelector" class="flex flex-wrap gap-2">
            <button
              v-for="preset in cropPresets"
              :key="preset"
              type="button"
              class="rounded-md px-2.5 py-1.5 text-xs font-medium transition"
              :disabled="processing"
              :class="selectedPreset === preset ? '[background:var(--brand)] text-white' : 'hover:bg-white/10'"
              :style="selectedPreset !== preset ? 'border: 1px solid var(--surface-border); color: var(--text-secondary)' : ''"
              @click="selectedPreset = preset"
            >
              {{ presetLabel(preset) }}
            </button>
          </div>

          <div class="overflow-hidden rounded-lg" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
            <ClientOnly>
              <Cropper
                v-if="sourceUrl"
                ref="cropperRef"
                class="h-[60vh]"
                :src="sourceUrl"
                :stencil-props="stencilProps"
                :default-size="defaultSize"
                :default-position="defaultPosition"
                :image-restriction="'fit-area'"
                :canvas="true"
                @error="onCropperError"
              />
            </ClientOnly>
          </div>

          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              class="ui-btn ui-btn--secondary"
              :disabled="processing"
              @click="cancel"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="rounded-md [background:var(--brand)] px-4 py-2 text-sm font-medium text-white hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="processing"
              @click="confirm"
            >
              <span v-if="processing">{{ t('admin.common.saving') }}</span>
              <span v-else>{{ t('admin.components.imageCropper.confirm') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { CROP_PRESET_RATIO, type CropRatioPreset } from '~/shared/image-upload/policies'

const props = withDefaults(
  defineProps<{
    open: boolean
    file: File | null
    cropPresets: CropRatioPreset[]
    defaultPreset: CropRatioPreset
    title?: string
    subtitle?: string
  }>(),
  {
    title: '',
    subtitle: ''
  }
)

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'confirm', value: File): void
  (e: 'error', message: string): void
}>()

const { t } = useI18n({ useScope: 'global' })

const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)
const sourceUrl = ref<string | null>(null)
const processing = ref(false)
const selectedPreset = ref<CropRatioPreset>('free')

const showPresetSelector = computed(() => props.cropPresets.length > 1)

const subtitleText = computed(() => {
  if (props.subtitle) return props.subtitle
  if (selectedPreset.value === 'free') {
    return t('admin.components.imageCropper.subtitleFree')
  }
  return t('admin.components.imageCropper.subtitlePreset', { preset: selectedPreset.value })
})

const stencilProps = computed(() => {
  if (selectedPreset.value === 'free') return {}
  const ratio = CROP_PRESET_RATIO[selectedPreset.value]
  return {
    aspectRatio: ratio
  }
})

type CropperArea = {
  width: number
  height: number
}

type CropperDefaultSizeArgs = {
  imageSize?: CropperArea | null
}

type CropperDefaultPositionArgs = {
  imageSize?: CropperArea | null
  coordinates?: CropperArea | null
}

const defaultSize = ({ imageSize }: CropperDefaultSizeArgs) => {
  if (!imageSize) {
    return { width: 0, height: 0 }
  }

  if (selectedPreset.value === 'free') {
    return {
      width: imageSize.width,
      height: imageSize.height
    }
  }

  const ratio = CROP_PRESET_RATIO[selectedPreset.value]
  if (!ratio || !Number.isFinite(ratio)) {
    return {
      width: imageSize.width,
      height: imageSize.height
    }
  }

  const imageRatio = imageSize.width / imageSize.height
  if (imageRatio > ratio) {
    return {
      width: imageSize.height * ratio,
      height: imageSize.height
    }
  }

  return {
    width: imageSize.width,
    height: imageSize.width / ratio
  }
}

const defaultPosition = ({ imageSize, coordinates }: CropperDefaultPositionArgs) => {
  if (!imageSize || !coordinates) {
    return { left: 0, top: 0 }
  }

  return {
    left: Math.max(0, (imageSize.width - coordinates.width) / 2),
    top: Math.max(0, (imageSize.height - coordinates.height) / 2)
  }
}

const clearObjectUrl = () => {
  if (sourceUrl.value) {
    URL.revokeObjectURL(sourceUrl.value)
    sourceUrl.value = null
  }
}

const refreshObjectUrl = () => {
  clearObjectUrl()
  if (props.open && props.file) {
    sourceUrl.value = URL.createObjectURL(props.file)
  }
}

watch(
  () => [props.open, props.file, props.defaultPreset, props.cropPresets.join('|')] as const,
  () => {
    selectedPreset.value = props.cropPresets.includes(props.defaultPreset)
      ? props.defaultPreset
      : (props.cropPresets[0] ?? 'free')

    refreshObjectUrl()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  clearObjectUrl()
})

const cancel = () => {
  if (processing.value) return
  emit('cancel')
}

const presetLabel = (preset: CropRatioPreset) => {
  if (preset === 'free') return t('admin.components.imageCropper.presets.free')
  return preset
}

const extensionByMime = (mimeType: string): string => {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/webp') return 'webp'
  return 'png'
}

const buildCroppedFileName = (originalName: string, mimeType: string): string => {
  const ext = extensionByMime(mimeType)
  const baseName = originalName.replace(/\.[^.]+$/, '') || 'image'
  return `${baseName}.${ext}`
}

const toBlob = (canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob | null> =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })

const confirm = async () => {
  if (!props.file) {
    emit('error', t('admin.components.imageCropper.errors.noFile'))
    return
  }

  const cropper = cropperRef.value
  if (!cropper) {
    emit('error', t('admin.components.imageCropper.errors.unavailable'))
    return
  }

  const result = cropper.getResult()
  if (!result?.canvas) {
    emit('error', t('admin.components.imageCropper.errors.resultFailed'))
    return
  }

  const preferredMime = ['image/png', 'image/jpeg', 'image/webp'].includes(props.file.type)
    ? props.file.type
    : 'image/png'
  const quality = preferredMime === 'image/png' ? undefined : 0.92

  processing.value = true
  try {
    const blob = await toBlob(result.canvas, preferredMime, quality)
    if (!blob) {
      emit('error', t('admin.components.imageCropper.errors.resultFailed'))
      return
    }

    const file = new File([blob], buildCroppedFileName(props.file.name, blob.type || preferredMime), {
      type: blob.type || preferredMime
    })

    emit('confirm', file)
  } finally {
    processing.value = false
  }
}

const onCropperError = () => {
  emit('error', t('admin.components.imageCropper.errors.loadFailed'))
}
</script>
