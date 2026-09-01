<template>
  <TransitionRoot :show="open" as="template">
    <Dialog class="relative z-50" @close="close">
      <TransitionChild
        as="template"
        enter="duration-150 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-100 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      </TransitionChild>

      <div class="fixed inset-0 flex items-center justify-center p-4">
        <TransitionChild
          as="template"
          enter="duration-150 ease-out"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="duration-100 ease-in"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel class="ui-card flex max-h-[90dvh] w-full flex-col overflow-hidden" :class="widthClass">
            <div v-if="title || $slots.header" class="ui-card-header flex items-start justify-between gap-3">
              <div class="min-w-0">
                <slot name="header">
                  <DialogTitle class="truncate text-sm font-semibold text-primary">{{ title }}</DialogTitle>
                  <DialogDescription v-if="description" class="mt-0.5 text-mini text-tertiary">
                    {{ description }}
                  </DialogDescription>
                </slot>
              </div>
              <UiButton
                v-if="dismissible"
                variant="ghost"
                size="sm"
                icon="lucide:x"
                :aria-label="closeLabel"
                @click="close"
              />
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto custom-scrollbar ui-card-body">
              <slot />
            </div>

            <div v-if="$slots.footer" class="ui-card-header flex flex-wrap justify-end gap-2 border-b-0 border-t">
              <slot name="footer" />
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
/**
 * Modal shell on Headless UI's Dialog, so focus trapping, Escape and the
 * return-focus-on-close behaviour are handled rather than re-invented per
 * screen. Set `dismissible` false for a modal that must be answered.
 */
import { computed } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
  TransitionRoot,
  TransitionChild
} from '@headlessui/vue'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  dismissible?: boolean
  closeLabel?: string
}>(), { size: 'md', dismissible: true, closeLabel: 'Close' })

const emit = defineEmits<{ (e: 'update:open', value: boolean): void, (e: 'close'): void }>()

const widthClass = computed(() => ({
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
}[props.size]))

function close() {
  if (!props.dismissible) return
  emit('update:open', false)
  emit('close')
}
</script>
