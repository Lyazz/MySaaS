<template>
  <Teleport to="body">
    <div 
      v-if="modelValue" 
      class="fixed inset-0 z-[100] overflow-y-auto"
      @click.self="handleCancel"
    >
      <div class="flex items-center justify-center min-h-screen px-4">
        <!-- Overlay -->
        <div
          class="fixed inset-0 bg-black/70 backdrop-blur-sm"
          @click="handleCancel"
        />

        <!-- Modal -->
        <div class="relative rounded-2xl max-w-md w-full p-6 z-10 surface-2 border border-line shadow-overlay">
          <!-- Icon -->
          <div class="mx-auto flex items-center justify-center h-11 w-11 rounded-xl mb-4" style="background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.2)">
            <Icon name="lucide:alert-triangle" class="h-5 w-5 text-red-400" />
          </div>

          <!-- Title -->
          <h3 class="text-base font-semibold text-center mb-2 text-primary">
            {{ resolvedTitle }}
          </h3>

          <!-- Message -->
          <p class="text-sm text-center mb-4 text-secondary">
            {{ resolvedMessage }}
          </p>

          <!-- Inline error -->
          <div v-if="error" class="mb-4 rounded-xl px-4 py-3 text-sm text-red-400" style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.18)">
            {{ error }}
          </div>

          <!-- Actions -->
          <div class="flex gap-2.5">
            <button
              type="button"
              class="flex-1 ui-btn ui-btn--secondary ui-btn--md"
              @click="handleCancel"
            >
              {{ resolvedCancelText }}
            </button>
            <button
              type="button"
              class="flex-1 ui-btn ui-btn--md"
              style="background: rgb(220,38,38); color: #fff; border: 1px solid transparent"
              @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = 'rgb(185,28,28)'"
              @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.background = 'rgb(220,38,38)'"
              @click="handleConfirm"
            >
              {{ resolvedConfirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  error?: string | null
}

const props = defineProps<Props>()
const { t } = useI18n({ useScope: 'global' })

const resolvedTitle = computed(() => props.title ?? t('admin.confirmModal.defaults.title'))
const resolvedMessage = computed(() => props.message ?? t('admin.confirmModal.defaults.message'))
const resolvedConfirmText = computed(() => props.confirmText ?? t('admin.confirmModal.defaults.confirm'))
const resolvedCancelText = computed(() => props.cancelText ?? t('admin.common.cancel'))

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
  'cancel': []
}>()

function handleConfirm() {
  emit('confirm')
  // Don't auto-close — the parent will close once the action succeeds (or show error)
}

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>
