<template>
  <div class="rich-text-editor-wrapper">
    <div v-if="editor" class="editor-toolbar">
      <!-- Row 1: Text Formatting -->
      <div class="toolbar-row">
        <div class="button-group">
          <button 
            @click="editor.chain().focus().undo().run()" 
            :disabled="!editor.can().undo()"
            class="toolbar-btn"
            title="Undo"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
          </button>
          <button 
            @click="editor.chain().focus().redo().run()" 
            :disabled="!editor.can().redo()"
            class="toolbar-btn"
            title="Redo"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"/></svg>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="button-group">
          <button 
            @click="editor.chain().focus().toggleBold().run()" 
            :class="{ 'is-active': editor.isActive('bold') }"
            class="toolbar-btn"
            title="Bold (Ctrl+B)"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
          </button>
          <button 
            @click="editor.chain().focus().toggleItalic().run()" 
            :class="{ 'is-active': editor.isActive('italic') }"
            class="toolbar-btn"
            title="Italic (Ctrl+I)"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 4h-9m4 16H5m11-14L10 20"/></svg>
          </button>
          <button 
            @click="editor.chain().focus().toggleUnderline().run()" 
            :class="{ 'is-active': editor.isActive('underline') }"
            class="toolbar-btn"
            title="Underline (Ctrl+U)"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 4v7a7 7 0 0014 0V4M4 21h16"/></svg>
          </button>
          <button 
            @click="editor.chain().focus().toggleStrike().run()" 
            :class="{ 'is-active': editor.isActive('strike') }"
            class="toolbar-btn"
            title="Strikethrough"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h18M8 5h8M9 19h6"/></svg>
          </button>
          <button 
            @click="editor.chain().focus().toggleCode().run()" 
            :class="{ 'is-active': editor.isActive('code') }"
            class="toolbar-btn"
            title="Inline Code"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="button-group">
          <button 
            @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" 
            :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
            class="toolbar-btn"
            title="Heading 1"
            type="button"
          >
            <span class="font-bold text-base">H1</span>
          </button>
          <button 
            @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" 
            :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
            class="toolbar-btn"
            title="Heading 2"
            type="button"
          >
            <span class="font-bold text-sm">H2</span>
          </button>
          <button 
            @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" 
            :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
            class="toolbar-btn"
            title="Heading 3"
            type="button"
          >
            <span class="font-bold text-xs">H3</span>
          </button>
          <button 
            @click="editor.chain().focus().setParagraph().run()" 
            :class="{ 'is-active': editor.isActive('paragraph') }"
            class="toolbar-btn"
            title="Paragraph"
            type="button"
          >
            <span class="text-xs">¶</span>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="button-group">
          <button 
            @click="editor.chain().focus().setTextAlign('left').run()" 
            :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }"
            class="toolbar-btn"
            title="Align Left"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h10M4 18h16"/></svg>
          </button>
          <button 
            @click="editor.chain().focus().setTextAlign('center').run()" 
            :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }"
            class="toolbar-btn"
            title="Align Center"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M7 12h10M4 18h16"/></svg>
          </button>
          <button 
            @click="editor.chain().focus().setTextAlign('right').run()" 
            :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }"
            class="toolbar-btn"
            title="Align Right"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M10 12h10M4 18h16"/></svg>
          </button>
        </div>
      </div>

      <!-- Row 2: Lists, Quotes, Media -->
      <div class="toolbar-row">
        <div class="button-group">
          <button 
            @click="editor.chain().focus().toggleBulletList().run()" 
            :class="{ 'is-active': editor.isActive('bulletList') }"
            class="toolbar-btn"
            title="Bullet List"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
          </button>
          <button 
            @click="editor.chain().focus().toggleOrderedList().run()" 
            :class="{ 'is-active': editor.isActive('orderedList') }"
            class="toolbar-btn"
            title="Numbered List"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5h12M9 12h12M9 19h12M5 5L3 7m2 5v4m0-4l-2 2"/></svg>
          </button>
          <button 
            @click="editor.chain().focus().toggleBlockquote().run()" 
            :class="{ 'is-active': editor.isActive('blockquote') }"
            class="toolbar-btn"
            title="Quote"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
          </button>
          <button 
            @click="editor.chain().focus().toggleCodeBlock().run()" 
            :class="{ 'is-active': editor.isActive('codeBlock') }"
            class="toolbar-btn"
            title="Code Block"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="button-group">
          <button 
            @click="setLink" 
            :class="{ 'is-active': editor.isActive('link') }"
            class="toolbar-btn"
            title="Insert Link"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
          </button>
          <button 
            @click="addImage" 
            class="toolbar-btn"
            title="Insert Image"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </button>
          <button 
            @click="editor.chain().focus().setHorizontalRule().run()" 
            class="toolbar-btn"
            title="Horizontal Line"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="button-group">
          <div class="color-picker-group">
            <label class="color-picker-label" title="Text Color">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
              <input 
                type="color" 
                @input="(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()"
                :value="editor.getAttributes('textStyle').color || '#000000'"
                class="color-input"
              />
            </label>
            <label class="color-picker-label" title="Highlight Color">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              <input 
                type="color" 
                @input="(e) => editor.chain().focus().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run()"
                value="#ffff00"
                class="color-input"
              />
            </label>
          </div>
        </div>

        <div class="toolbar-divider"></div>

        <button 
          @click="editor.chain().focus().clearNodes().unsetAllMarks().run()" 
          class="toolbar-btn"
          title="Clear Formatting"
          type="button"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    </div>

    <editor-content :editor="editor" class="editor-content" />
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Image,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-indigo-600 underline',
      },
    }),
    Placeholder.configure({
      placeholder: props.placeholder || 'Start writing your product description...',
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true,
    }),
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[300px] p-4',
    },
  },
})

watch(() => props.modelValue, (newValue) => {
  const isSame = editor.value?.getHTML() === newValue
  if (!isSame && editor.value && newValue !== undefined) {
    editor.value.commands.setContent(newValue || '', { emitUpdate: false })
  }
})

const setLink = () => {
  const previousUrl = editor.value?.getAttributes('link').href
  const url = window.prompt('URL', previousUrl)

  if (url === null) {
    return
  }

  if (url === '') {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }

  editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

const addImage = () => {
  const url = window.prompt('Enter image URL')

  if (url) {
    editor.value?.chain().focus().setImage({ src: url }).run()
  }
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.rich-text-editor-wrapper {
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
  background: white;
  transition: border-color 0.2s;
}

.rich-text-editor-wrapper:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.editor-toolbar {
  background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
  border-bottom: 1px solid #e5e7eb;
  padding: 0.75rem;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.toolbar-row + .toolbar-row {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.button-group {
  display: flex;
  gap: 2px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 2px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  min-width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: #374151;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.875rem;
}

.toolbar-btn:hover:not(:disabled) {
  background: #f3f4f6;
  color: #6366f1;
}

.toolbar-btn.is-active {
  background: #6366f1;
  color: white;
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-divider {
  width: 1px;
  height: 2rem;
  background: #d1d5db;
  margin: 0 0.25rem;
}

.color-picker-group {
  display: flex;
  gap: 2px;
}

.color-picker-label {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: background 0.15s;
  position: relative;
}

.color-picker-label:hover {
  background: #f3f4f6;
}

.color-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.editor-content {
  background: white;
}

/* Prosemirror styles */
:deep(.ProseMirror) {
  outline: none;
  min-height: 300px;
  padding: 1rem;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: #9ca3af;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

:deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

:deep(.ProseMirror blockquote) {
  border-left: 4px solid #6366f1;
  padding-left: 1rem;
  margin: 1rem 0;
  color: #6b7280;
  font-style: italic;
}

:deep(.ProseMirror pre) {
  background: #1f2937;
  color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
}

:deep(.ProseMirror code) {
  background: #f3f4f6;
  color: #dc2626;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: 'Courier New', monospace;
  font-size: 0.875em;
}

:deep(.ProseMirror pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
}

:deep(.ProseMirror hr) {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 2rem 0;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  padding-left: 1.5rem;
  margin: 1rem 0;
}

:deep(.ProseMirror h1) {
  font-size: 2em;
  font-weight: bold;
  margin: 1rem 0 0.5rem;
}

:deep(.ProseMirror h2) {
  font-size: 1.5em;
  font-weight: bold;
  margin: 1rem 0 0.5rem;
}

:deep(.ProseMirror h3) {
  font-size: 1.25em;
  font-weight: bold;
  margin: 1rem 0 0.5rem;
}

:deep(.ProseMirror a) {
  color: #6366f1;
  text-decoration: underline;
  cursor: pointer;
}

:deep(.ProseMirror a:hover) {
  color: #4f46e5;
}
</style>
