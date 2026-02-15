<template>
  <div 
    v-if="modelValue" 
    class="fixed inset-0 z-50 overflow-y-auto"
    @click.self="handleCancel"
  >
    <div class="flex items-center justify-center min-h-screen px-4">
      <!-- Overlay -->
      <div
        class="fixed inset-0 bg-black opacity-50"
        @click="handleCancel"
      />

      <!-- Modal -->
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
        <!-- Icon -->
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <Icon name="lucide:alert-triangle" class="h-6 w-6 text-red-600" />
        </div>

        <!-- Title -->
        <h3 class="text-lg font-medium text-gray-900 text-center mb-2">
          {{ resolvedTitle }}
        </h3>

        <!-- Message -->
        <p class="text-sm text-gray-500 text-center mb-6">
          {{ resolvedMessage }}
        </p>

        <!-- Actions -->
        <div class="flex space-x-3">
          <button
            type="button"
            class="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            @click="handleCancel"
          >
            {{ resolvedCancelText }}
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            @click="handleConfirm"
          >
            {{ resolvedConfirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
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
  emit('update:modelValue', false)
}

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>
