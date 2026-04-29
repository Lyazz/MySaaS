<template>
  <div class="brand-field">
    <div class="brand-field-head">
      <div>
        <p class="brand-field-label">{{ label }}</p>
        <p v-if="hint" class="brand-field-hint">{{ hint }}</p>
      </div>
      <div v-if="modelValue" class="brand-field-actions">
        <label class="brand-field-action">
          <Icon name="lucide:replace" class="w-3.5 h-3.5" />
          <span>{{ t('admin.common.replace') || 'Replace' }}</span>
          <input
            type="file"
            class="hidden"
            :accept="acceptMimes"
            @change="onFileChange"
          >
        </label>
        <button type="button" class="brand-field-action brand-field-action-danger" @click="remove">
          <Icon name="lucide:trash-2" class="w-3.5 h-3.5" />
          <span>{{ t('admin.common.delete') || 'Remove' }}</span>
        </button>
      </div>
    </div>

    <!-- Logo variant: wide rectangular preview -->
    <div v-if="variant === 'logo'" class="brand-logo-preview" :style="{ '--accent': accent }">
      <div class="brand-logo-accent" />
      <template v-if="modelValue">
        <img :src="modelValue" :alt="label" class="brand-logo-img" />
      </template>
      <label v-else class="brand-logo-empty">
        <Icon name="lucide:image-plus" class="w-5 h-5" />
        <span>{{ t('admin.appearanceSettingsForm.brandAssets.logo.upload') }}</span>
        <input
          type="file"
          class="hidden"
          :accept="acceptMimes"
          @change="onFileChange"
        >
      </label>
      <div v-if="uploading" class="brand-uploading">
        <Icon name="lucide:loader-2" class="brand-uploading-spinner" />
        <span>{{ uploadProgress }}%</span>
      </div>
    </div>

    <!-- Favicon variant: compact browser-tab mockup -->
    <div v-else-if="variant === 'favicon'" class="brand-favicon-preview">
      <div class="favicon-tab">
        <div class="favicon-tab-icon">
          <img v-if="modelValue" :src="modelValue" alt="favicon" />
          <Icon v-else name="lucide:globe" class="w-3 h-3" />
        </div>
        <span class="favicon-tab-title">{{ tabTitle }}</span>
        <span class="favicon-tab-close">×</span>
      </div>
      <label v-if="!modelValue" class="favicon-empty-cta">
        <Icon name="lucide:upload" class="w-3.5 h-3.5" />
        <span>{{ t('admin.appearanceSettingsForm.brandAssets.favicon.upload') || 'Upload favicon' }}</span>
        <input
          type="file"
          class="hidden"
          :accept="acceptMimes"
          @change="onFileChange"
        >
      </label>
      <div v-else-if="uploading" class="brand-uploading brand-uploading-inline">
        <Icon name="lucide:loader-2" class="brand-uploading-spinner" />
        <span>{{ uploadProgress }}%</span>
      </div>
    </div>

    <ImageCropperModal
      :open="cropperOpen"
      :file="selectedFile"
      :crop-presets="policy.cropPresets"
      :default-preset="policy.defaultPreset"
      @cancel="closeCropper"
      @error="showCropperError"
      @confirm="handleCroppedFile"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import ImageCropperModal from '~/components/admin/ImageCropperModal.vue'
import {
  bytesFromMb,
  formatMaxFileSizeLabel,
  isAllowedImageMimeType,
  resolveImageUploadPolicy,
  type ImageUploaderMode
} from '~/shared/image-upload/policies'

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    variant: 'logo' | 'favicon'
    label: string
    hint?: string
    accent?: string
    tabTitle?: string
    mode?: ImageUploaderMode
  }>(),
  {
    accent: 'var(--brand)',
    tabTitle: 'My Store',
    mode: 'logo'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

const policy = computed(() =>
  resolveImageUploadPolicy({ mode: props.variant === 'favicon' ? 'favicon' : 'logo' })
)
const acceptMimes = computed(() => policy.value.allowedMimeTypes.join(','))

const selectedFile = ref<File | null>(null)
const cropperOpen = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const { uploadWithProgress } = useUploadWithProgress()

const getAuthToken = () => authStore.token || useCookie('auth_token').value

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!isAllowedImageMimeType(file.type, policy.value.allowedMimeTypes)) {
    alert(t('admin.components.singleImageUploader.errors.invalidType'))
    input.value = ''
    return
  }
  const max = policy.value.maxFileSizeMb
  if (max && file.size > bytesFromMb(max)) {
    alert(t('admin.components.singleImageUploader.errors.tooLarge', { max: formatMaxFileSizeLabel(max) }))
    input.value = ''
    return
  }

  selectedFile.value = file
  cropperOpen.value = true
  input.value = ''
}

function closeCropper() {
  cropperOpen.value = false
  selectedFile.value = null
}

async function handleCroppedFile(file: File) {
  uploading.value = true
  uploadProgress.value = 0
  try {
    const token = getAuthToken()
    const payload = await uploadWithProgress<{ url: string }>({
      url: '/api/upload',
      file,
      token,
      fallbackErrorMessage: t('admin.components.singleImageUploader.errors.uploadFailed'),
      onProgress: (p) => { uploadProgress.value = p }
    })
    emit('update:modelValue', payload.url)
  } catch (err: any) {
    alert(err?.message || t('admin.components.singleImageUploader.errors.uploadFailed'))
  } finally {
    uploading.value = false
    uploadProgress.value = 0
    closeCropper()
  }
}

function showCropperError(msg: string) {
  alert(msg || t('admin.components.singleImageUploader.errors.cropFailed'))
}

function remove() {
  emit('update:modelValue', null)
}
</script>

<style scoped>
.brand-field {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand-field-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.brand-field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.005em;
}

.brand-field-hint {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--text-tertiary);
  line-height: 1.4;
}

.brand-field-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.brand-field-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  font-size: 11.5px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.brand-field-action:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.brand-field-action-danger:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);
}

.hidden {
  display: none;
}

/* Logo preview — wide rectangular */
.brand-logo-preview {
  position: relative;
  height: 96px;
  border-radius: 12px;
  background:
    linear-gradient(45deg, var(--surface-1) 25%, transparent 25%),
    linear-gradient(-45deg, var(--surface-1) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--surface-1) 75%),
    linear-gradient(-45deg, transparent 75%, var(--surface-1) 75%),
    var(--surface-2);
  background-size: 14px 14px;
  background-position: 0 0, 0 7px, 7px -7px, -7px 0;
  border: 1px solid var(--surface-border);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-logo-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent);
  z-index: 1;
}

.brand-logo-img {
  max-width: 70%;
  max-height: 60px;
  object-fit: contain;
  position: relative;
  z-index: 1;
}

.brand-logo-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
  z-index: 2;
}

.brand-logo-empty:hover {
  background: rgba(var(--brand-rgb) / 0.06);
  color: var(--text-primary);
}

/* Favicon preview — browser tab mockup */
.brand-favicon-preview {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--surface-2);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
}

.favicon-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 8px;
  background: var(--surface-1);
  border: 1px solid var(--surface-border);
  border-radius: 8px 8px 0 0;
  border-bottom: none;
  font-size: 11.5px;
  color: var(--text-secondary);
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.favicon-tab::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: var(--surface-1);
}

.favicon-tab-icon {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-3);
  color: var(--text-muted);
  overflow: hidden;
  flex-shrink: 0;
}

.favicon-tab-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.favicon-tab-title {
  font-weight: 500;
  letter-spacing: -0.005em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
}

.favicon-tab-close {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1;
}

.favicon-empty-cta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px dashed var(--surface-border);
  color: var(--text-secondary);
  background: var(--surface-1);
  cursor: pointer;
  transition: all 0.15s ease;
}

.favicon-empty-cta:hover {
  border-color: rgba(var(--brand-rgb) / 0.5);
  color: var(--text-primary);
}

.brand-uploading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  font-size: 12px;
  font-weight: 600;
  z-index: 3;
}

.brand-uploading-inline {
  position: static;
  background: transparent;
  color: var(--text-secondary);
  padding: 0;
}

.brand-uploading-spinner {
  width: 14px;
  height: 14px;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
