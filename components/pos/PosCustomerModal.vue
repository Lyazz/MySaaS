<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="rounded-2xl w-full max-w-md overflow-hidden flex flex-col" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 48px rgba(0,0,0,0.5)">
      <div class="px-6 py-4 flex items-center justify-between" style="border-bottom: 1px solid var(--surface-border)">
        <h2 class="text-xl font-bold" style="color: var(--text-primary)">
          {{ t('admin.pages.pos.customer.addClient') }}
        </h2>
        <button class="p-2 rounded-lg transition-colors" style="color: var(--text-muted)" @click="$emit('close')">
          <Icon name="lucide:x" class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 space-y-4">
        <div>
          <label class="ui-label block mb-1">
            {{ t('admin.forms.customer.name.label') }} <span class="text-red-400">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            class="ui-input w-full px-4 py-2"
            :class="errors.name ? 'border-red-500/50' : ''"
            :placeholder="t('admin.forms.customer.name.placeholder')"
          >
          <p v-if="errors.name" class="mt-1 text-xs text-red-400">{{ errors.name }}</p>
        </div>

        <div>
          <label class="ui-label block mb-1">
            {{ t('admin.forms.customer.phone.label') }} <span class="text-red-400">*</span>
          </label>
          <input
            v-model="form.phone"
            type="text"
            class="ui-input w-full px-4 py-2"
            :class="errors.phone ? 'border-red-500/50' : ''"
            :placeholder="t('admin.forms.customer.phone.placeholder')"
          >
          <p v-if="errors.phone" class="mt-1 text-xs text-red-400">{{ errors.phone }}</p>
        </div>
      </div>

      <div class="px-6 py-4 flex justify-end gap-3" style="background: var(--surface-3); border-top: 1px solid var(--surface-border)">
        <button class="ui-btn ui-btn--secondary px-4 py-2 text-sm" @click="$emit('close')">
          {{ t('admin.common.cancel') }}
        </button>
        <button
          class="px-4 py-2 rounded-lg font-medium text-white [background:var(--brand)] hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] transition-colors flex items-center justify-center min-w-[100px]"
          :disabled="loading"
          @click="submit"
        >
          <Icon v-if="loading" name="lucide:loader-2" class="w-4 h-4 animate-spin me-2" />
          {{ t('admin.common.create') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', customer: any): void
}>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

const loading = ref(false)
const form = reactive({ name: '', phone: '' })
const errors = reactive({ name: '', phone: '' })

async function submit() {
  errors.name = ''
  errors.phone = ''
  if (!form.name.trim()) errors.name = t('admin.forms.customer.name.required')
  if (!form.phone.trim()) errors.phone = t('admin.forms.customer.phone.required')
  if (errors.name || errors.phone) return

  loading.value = true
  try {
    const res = await $fetch('/api/admin/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { name: form.name, phone: form.phone }
    })
    emit('created', res)
  } catch (e: any) {
    if (e?.data?.statusCode === 409) errors.phone = e.data.statusMessage || 'Customer already exists'
    else alert(t('admin.pages.customers.create.errors.createFailed'))
  } finally {
    loading.value = false
  }
}
</script>
