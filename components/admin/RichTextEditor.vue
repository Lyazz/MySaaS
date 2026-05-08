<template>
  <ClientOnly>
    <div class="rich-text-editor-wrapper">
      <div v-if="isUploading" class="upload-progress-badge">
        {{ t('admin.common.uploading') }} {{ uploadProgress }}%
      </div>
      <QuillEditor
        ref="quillRef"
        v-model:content="content"
        content-type="html"
        :options="editorOptions"
        :placeholder="placeholder || t('admin.components.richTextEditor.placeholder')"
        @update:content="onContentUpdate"
        @ready="onEditorReady"
      />
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { useToast } from '~/composables/useToast'

const props = defineProps<{
  modelValue: string | null
  placeholder?: string
}>()

const emit = defineEmits(['update:modelValue'])
const { showToast } = useToast()
const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const { uploadWithProgress } = useUploadWithProgress()

const quillRef = ref<any>(null)
const content = ref(props.modelValue || '')
const isUploading = ref(false)
const uploadProgress = ref(0)

// Toolbar configuration - RTL direction is a toggle button in the toolbar
const editorOptions = {
  theme: 'snow',
  modules: {
    toolbar: [
      // Font options
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      
      // Text formatting
      ['bold', 'italic', 'underline', 'strike'],
      
      // Headers
      [{ 'header': [1, 2, 3, false] }],
      
      // Alignment and Direction - direction toggle for RTL
      [{ 'align': [] }, { 'direction': 'rtl' }],
      
      // Lists and indentation
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      
      // Colors
      [{ 'color': [] }, { 'background': [] }],
      
      // Blocks
      ['blockquote', 'code-block'],
      
      // Links and media
      ['link', 'image'],
      
      // Clear
      ['clean']
    ]
  }
}

// Store initial direction state
const isRtl = ref(false)

// Custom image upload handler
const handleImageUpload = async (quill: any) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/png,image/jpeg,image/webp'
  
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    
    // Validate file type client-side
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      showToast(t('admin.components.richTextEditor.errors.invalidType'), 'error')
      return
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('admin.components.richTextEditor.errors.tooLarge'), 'error')
      return
    }
    
    isUploading.value = true
    uploadProgress.value = 0
    
    try {
      const token = authStore.token || useCookie('auth_token').value
      const data = await uploadWithProgress<{ url: string; error?: string }>({
        url: '/api/upload',
        file,
        token,
        fallbackErrorMessage: t('admin.components.richTextEditor.errors.uploadFailed'),
        onProgress: (percent) => {
          uploadProgress.value = percent
        }
      })
      
      // Insert the image at current cursor position
      const range = quill.getSelection(true)
      quill.insertEmbed(range.index, 'image', data.url)
      quill.setSelection(range.index + 1)
      
    } catch (error) {
      const message = error instanceof Error ? error.message : t('admin.components.richTextEditor.errors.uploadFailed')
      showToast(message, 'error')
    } finally {
      isUploading.value = false
      uploadProgress.value = 0
    }
  }
  
  input.click()
}

const onEditorReady = () => {
  // Get the Quill instance and override the image handler
  const quill = quillRef.value?.getQuill()
  if (quill) {
    const toolbar = quill.getModule('toolbar')
    toolbar.addHandler('image', () => handleImageUpload(quill))
  }
}

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== content.value) {
    content.value = newValue || ''
  }
})

// Emit changes
const onContentUpdate = (value: string) => {
  emit('update:modelValue', value)
}
</script>

<style>
/* ==============================
   WRAPPER STYLES
   ============================== */
.rich-text-editor-wrapper {
  position: relative;
  border: 1px solid var(--surface-border);
  border-radius: 0.75rem;
  overflow: hidden;
  background: var(--surface-1);
  transition: border-color 0.2s;
}

.upload-progress-badge {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 10;
  border-radius: 9999px;
  background: rgba(15, 118, 110, 0.12);
  border: 1px solid rgba(15, 118, 110, 0.2);
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #4D7C0F;
}

.rich-text-editor-wrapper:focus-within {
  border-color: rgba(var(--brand-rgb) / 0.5);
  box-shadow: 0 0 0 3px rgba(var(--brand-rgb) / 0.1);
}

/* ==============================
   TOOLBAR STYLES
   ============================== */
.rich-text-editor-wrapper .ql-toolbar.ql-snow {
  border: none !important;
  border-bottom: 1px solid var(--surface-border) !important;
  background: var(--surface-2);
  padding: 0.75rem;
}

.rich-text-editor-wrapper .ql-toolbar .ql-formats {
  margin-right: 0.75rem;
}

/* Toolbar buttons */
.rich-text-editor-wrapper .ql-toolbar button {
  width: 2rem;
  height: 2rem;
  padding: 0.25rem;
  border-radius: 0.375rem;
  transition: all 0.15s;
}

.rich-text-editor-wrapper .ql-toolbar button:hover {
  background: rgba(255,255,255,0.08);
}

.rich-text-editor-wrapper .ql-toolbar button:hover .ql-stroke {
  stroke: #4D7C0F;
}

.rich-text-editor-wrapper .ql-toolbar button:hover .ql-fill {
  fill: #4D7C0F;
}

.rich-text-editor-wrapper .ql-toolbar button.ql-active {
  background: #4D7C0F;
}

.rich-text-editor-wrapper .ql-toolbar button.ql-active .ql-stroke {
  stroke: white;
}

.rich-text-editor-wrapper .ql-toolbar button.ql-active .ql-fill {
  fill: white;
}

/* Toolbar pickers (dropdowns) */
.rich-text-editor-wrapper .ql-toolbar .ql-picker {
  height: 2rem;
}

.rich-text-editor-wrapper .ql-toolbar .ql-picker-label {
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
}

.rich-text-editor-wrapper .ql-toolbar .ql-picker-label:hover {
  background: rgba(255,255,255,0.08);
  color: var(--brand);
}

.rich-text-editor-wrapper .ql-toolbar .ql-picker.ql-expanded .ql-picker-label {
  border-color: #4D7C0F;
}

/* ==============================
   EDITOR CONTAINER
   ============================== */
.rich-text-editor-wrapper .ql-container.ql-snow {
  border: none !important;
  font-size: 1rem;
  min-height: 300px;
}

.rich-text-editor-wrapper .ql-editor {
  min-height: 300px;
  padding: 1rem;
  line-height: 1.6;
}

.rich-text-editor-wrapper .ql-editor.ql-blank::before {
  color: var(--text-muted);
  font-style: normal;
}

/* ==============================
   CONTENT STYLES
   ============================== */
.rich-text-editor-wrapper .ql-editor h1 {
  font-size: 2em;
  font-weight: bold;
  margin: 1rem 0 0.5rem;
}

.rich-text-editor-wrapper .ql-editor h2 {
  font-size: 1.5em;
  font-weight: bold;
  margin: 1rem 0 0.5rem;
}

.rich-text-editor-wrapper .ql-editor h3 {
  font-size: 1.25em;
  font-weight: bold;
  margin: 1rem 0 0.5rem;
}

.rich-text-editor-wrapper .ql-editor p {
  margin: 0.5rem 0;
}

.rich-text-editor-wrapper .ql-editor blockquote {
  border-left: 4px solid var(--brand);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--text-secondary);
  font-style: italic;
}

.rich-text-editor-wrapper .ql-editor pre.ql-syntax {
  background: var(--surface-3);
  color: var(--text-primary);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  font-family: 'Geist Mono', 'Courier New', monospace;
}

.rich-text-editor-wrapper .ql-editor a {
  color: #4D7C0F;
  text-decoration: underline;
}

.rich-text-editor-wrapper .ql-editor img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

.rich-text-editor-wrapper .ql-editor ul,
.rich-text-editor-wrapper .ql-editor ol {
  padding-left: 1.5rem;
  margin: 1rem 0;
}

/* ==============================
   RTL DIRECTION STYLES
   When the direction button is clicked, 
   Quill adds .ql-direction-rtl class
   ============================== */
.rich-text-editor-wrapper .ql-editor .ql-direction-rtl {
  direction: rtl;
  text-align: right;
}

/* RTL blockquote - border on right */
.rich-text-editor-wrapper .ql-editor .ql-direction-rtl blockquote,
.rich-text-editor-wrapper .ql-editor blockquote.ql-direction-rtl {
  border-left: none;
  border-right: 4px solid #4D7C0F;
  padding-left: 0;
  padding-right: 1rem;
}

/* RTL lists - padding on right */
.rich-text-editor-wrapper .ql-editor .ql-direction-rtl ul,
.rich-text-editor-wrapper .ql-editor .ql-direction-rtl ol,
.rich-text-editor-wrapper .ql-editor ul.ql-direction-rtl,
.rich-text-editor-wrapper .ql-editor ol.ql-direction-rtl {
  padding-left: 0;
  padding-right: 1.5rem;
}

/* RTL list items */
.rich-text-editor-wrapper .ql-editor li.ql-direction-rtl {
  padding-right: 1.5em;
  padding-left: 0;
}

/* RTL indent classes */
.rich-text-editor-wrapper .ql-editor .ql-direction-rtl.ql-indent-1 {
  padding-right: 3em;
  padding-left: 0;
}

.rich-text-editor-wrapper .ql-editor .ql-direction-rtl.ql-indent-2 {
  padding-right: 6em;
  padding-left: 0;
}

.rich-text-editor-wrapper .ql-editor .ql-direction-rtl.ql-indent-3 {
  padding-right: 9em;
  padding-left: 0;
}

/* ==============================
   ALIGNMENT STYLES
   ============================== */
.rich-text-editor-wrapper .ql-editor .ql-align-center {
  text-align: center;
}

.rich-text-editor-wrapper .ql-editor .ql-align-right {
  text-align: right;
}

.rich-text-editor-wrapper .ql-editor .ql-align-justify {
  text-align: justify;
}

/* RTL with alignment - ensure alignment takes precedence */
.rich-text-editor-wrapper .ql-editor .ql-direction-rtl.ql-align-left {
  text-align: left;
}

.rich-text-editor-wrapper .ql-editor .ql-direction-rtl.ql-align-center {
  text-align: center;
}

.rich-text-editor-wrapper .ql-editor .ql-direction-rtl.ql-align-right {
  text-align: right;
}

/* ==============================
   SNOW THEME COLOR OVERRIDES
   ============================== */
.rich-text-editor-wrapper .ql-snow a {
  color: #4D7C0F;
}

.rich-text-editor-wrapper .ql-snow .ql-stroke {
  stroke: #a1a1aa;
}

.rich-text-editor-wrapper .ql-snow .ql-fill {
  fill: #a1a1aa;
}

.rich-text-editor-wrapper .ql-snow .ql-picker {
  color: #a1a1aa;
}

.rich-text-editor-wrapper .ql-snow .ql-picker-options {
  background: var(--surface-3);
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
}

/* Tooltip styling */
.rich-text-editor-wrapper .ql-snow .ql-tooltip {
  border-radius: 0.5rem;
  background: var(--surface-3);
  border-color: var(--surface-border);
  color: var(--text-primary);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.rich-text-editor-wrapper .ql-snow .ql-tooltip input[type="text"] {
  border-radius: 0.375rem;
  background: var(--surface-2);
  border-color: var(--surface-border);
  color: var(--text-primary);
}

.rich-text-editor-wrapper .ql-snow .ql-tooltip a.ql-action::after {
  border-right-color: var(--surface-border);
}

.rich-text-editor-wrapper .ql-editor {
  color: var(--text-primary);
}
</style>
