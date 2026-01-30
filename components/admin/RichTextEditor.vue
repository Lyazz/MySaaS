<template>
  <ClientOnly>
    <div class="rich-text-editor-wrapper">
      <QuillEditor
        ref="quillRef"
        v-model:content="content"
        content-type="html"
        :options="editorOptions"
        :placeholder="placeholder || 'Start writing your product description...'"
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

const quillRef = ref<any>(null)
const content = ref(props.modelValue || '')
const isUploading = ref(false)

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
      showToast('Only PNG, JPEG, and WebP images are allowed', 'error')
      return
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error')
      return
    }
    
    isUploading.value = true
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${useAuthStore().token}`
        },
        body: formData,
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }
      
      // Insert the image at current cursor position
      const range = quill.getSelection(true)
      quill.insertEmbed(range.index, 'image', data.url)
      quill.setSelection(range.index + 1)
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload image'
      showToast(message, 'error')
    } finally {
      isUploading.value = false
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
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
  background: white;
  transition: border-color 0.2s;
}

.rich-text-editor-wrapper:focus-within {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
}

/* ==============================
   TOOLBAR STYLES
   ============================== */
.rich-text-editor-wrapper .ql-toolbar.ql-snow {
  border: none !important;
  border-bottom: 1px solid #e5e7eb !important;
  background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
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
  background: #f3f4f6;
}

.rich-text-editor-wrapper .ql-toolbar button:hover .ql-stroke {
  stroke: #0f766e;
}

.rich-text-editor-wrapper .ql-toolbar button:hover .ql-fill {
  fill: #0f766e;
}

.rich-text-editor-wrapper .ql-toolbar button.ql-active {
  background: #0f766e;
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
  background: #f3f4f6;
  color: #0f766e;
}

.rich-text-editor-wrapper .ql-toolbar .ql-picker.ql-expanded .ql-picker-label {
  border-color: #0f766e;
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
  color: #9ca3af;
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
  border-left: 4px solid #0f766e;
  padding-left: 1rem;
  margin: 1rem 0;
  color: #6b7280;
  font-style: italic;
}

.rich-text-editor-wrapper .ql-editor pre.ql-syntax {
  background: #1f2937;
  color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
}

.rich-text-editor-wrapper .ql-editor a {
  color: #0f766e;
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
  border-right: 4px solid #0f766e;
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
  color: #0f766e;
}

.rich-text-editor-wrapper .ql-snow .ql-stroke {
  stroke: #374151;
}

.rich-text-editor-wrapper .ql-snow .ql-fill {
  fill: #374151;
}

.rich-text-editor-wrapper .ql-snow .ql-picker {
  color: #374151;
}

/* Tooltip styling */
.rich-text-editor-wrapper .ql-snow .ql-tooltip {
  border-radius: 0.5rem;
  border-color: #e5e7eb;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.rich-text-editor-wrapper .ql-snow .ql-tooltip input[type="text"] {
  border-radius: 0.375rem;
  border-color: #d1d5db;
}

.rich-text-editor-wrapper .ql-snow .ql-tooltip a.ql-action::after {
  border-right-color: #e5e7eb;
}
</style>
