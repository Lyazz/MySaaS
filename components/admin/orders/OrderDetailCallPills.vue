<template>
  <div
    class="flex flex-wrap gap-1.5"
    role="radiogroup"
    :aria-label="t('admin.pages.orders.detail.fields.callStatus', 'Call Status')"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="modelValue === opt.value"
      :disabled="disabled || saving === opt.value"
      class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
      :class="[
        modelValue === opt.value ? 'pill-active' : 'pill-idle',
        opt.tone
      ]"
      @click="onPick(opt.value)"
    >
      <Icon
        v-if="saving === opt.value"
        name="lucide:loader"
        class="w-3 h-3 animate-spin"
      />
      <Icon
        v-else
        :name="opt.icon"
        class="w-3 h-3"
      />
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
  saving?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const { t } = useI18n({ useScope: 'global' })

const options = computed(() => [
  {
    value: 'not_called',
    label: t('admin.pages.orders.detail.fields.callStatusValues.not_called'),
    icon: 'lucide:phone-off',
    tone: 'tone-rose'
  },
  {
    value: 'called',
    label: t('admin.pages.orders.detail.fields.callStatusValues.called'),
    icon: 'lucide:phone-call',
    tone: 'tone-emerald'
  },
  {
    value: 'no_answer',
    label: t('admin.pages.orders.detail.fields.callStatusValues.no_answer'),
    icon: 'lucide:phone-missed',
    tone: 'tone-amber'
  },
  {
    value: 'attempt_1',
    label: t('admin.pages.orders.detail.fields.callStatusValues.attempt_1'),
    icon: 'lucide:phone-incoming',
    tone: 'tone-amber'
  },
  {
    value: 'attempt_2',
    label: t('admin.pages.orders.detail.fields.callStatusValues.attempt_2'),
    icon: 'lucide:phone-incoming',
    tone: 'tone-amber'
  },
  {
    value: 'attempt_3',
    label: t('admin.pages.orders.detail.fields.callStatusValues.attempt_3'),
    icon: 'lucide:phone-incoming',
    tone: 'tone-amber'
  },
  {
    value: 'switched_off',
    label: t('admin.pages.orders.detail.fields.callStatusValues.switched_off'),
    icon: 'lucide:power-off',
    tone: 'tone-rose'
  },
  {
    value: 'whatsapp_sms_sent',
    label: t('admin.pages.orders.detail.fields.callStatusValues.whatsapp_sms_sent'),
    icon: 'lucide:message-square',
    tone: 'tone-amber'
  },
  {
    value: 'whatsapp_link_confirmed',
    label: t('admin.pages.orders.detail.fields.callStatusValues.whatsapp_link_confirmed'),
    icon: 'lucide:check-square',
    tone: 'tone-emerald'
  }
])

function onPick(value: string) {
  if (props.modelValue === value) return
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.pill-idle {
  background: var(--surface-2);
  border: 1px solid var(--surface-border);
  color: var(--text-secondary);
}
.pill-idle:hover:not(:disabled) {
  border-color: var(--text-tertiary);
}
.pill-active.tone-neutral {
  background: var(--surface-3);
  border: 1px solid var(--surface-border);
  color: var(--text-primary);
}
.pill-active.tone-emerald {
  background: rgb(16 185 129 / 0.1);
  border: 1px solid rgb(16 185 129 / 0.4);
  color: rgb(4 120 87);
}
.pill-active.tone-amber {
  background: rgb(245 158 11 / 0.12);
  border: 1px solid rgb(245 158 11 / 0.4);
  color: rgb(180 83 9);
}
.pill-active.tone-rose {
  background: rgb(244 63 94 / 0.1);
  border: 1px solid rgb(244 63 94 / 0.4);
  color: rgb(190 18 60);
}
:global(.dark) .pill-active.tone-emerald { color: rgb(110 231 183); }
:global(.dark) .pill-active.tone-amber { color: rgb(252 211 77); }
:global(.dark) .pill-active.tone-rose { color: rgb(253 164 175); }
.pill-idle, .pill-active {
  border-width: 1px;
}
</style>
