<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <nav class="flex" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3 rtl:space-x-reverse">
        <li class="inline-flex items-center">
          <NuxtLink to="/admin/cash" class="hover:[color:rgba(var(--brand-rgb)/0.85)] transition-colors text-secondary">
            {{ t('admin.pages.cash.title') }}
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-tertiary" />
            <span class="ms-1 text-tertiary">{{ cashbox?.name ?? cashboxId.substring(0, 8) }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold text-primary">
          {{ cashbox?.name ?? t('admin.pages.cash.cashbox.titleFallback') }}
        </h2>
        <p class="mt-1 text-sm text-secondary">
          <span v-if="cashbox?.openSession">
            {{ t('admin.pages.cash.cashboxes.openSession', { id: cashbox.openSession.id.substring(0, 8) }) }}
          </span>
          <span v-else>
            {{ t('admin.pages.cash.cashboxes.closed') }}
          </span>
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-if="cashbox && !cashbox.openSession"
          type="button"
          class="inline-flex items-center gap-2 rounded-lg [background:var(--brand)] px-3 py-2 text-sm font-semibold text-brand-contrast hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)]"
          @click="openOpenSession"
        >
          <Icon name="lucide:play" class="h-4 w-4" />
          {{ t('admin.pages.cash.cashboxes.open') }}
        </button>

        <button
          v-if="cashbox?.openSession"
          type="button"
          class="ui-btn ui-btn--secondary text-sm"
          @click="openCloseSession"
        >
          <Icon name="lucide:lock" class="h-4 w-4" />
          {{ t('admin.pages.cash.cashboxes.close') }}
        </button>
      </div>
    </div>

    <section class="rounded-2xl overflow-hidden surface-1 border border-line">
      <div class="border-b p-4 border-line">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h3 class="text-sm font-semibold text-primary">
              {{ t('admin.pages.cash.transactions.title') }}
            </h3>
            <p class="mt-1 text-xs text-tertiary">
              {{ t('admin.pages.cash.cashbox.transactionsHint') }}
            </p>
          </div>
          <button
            type="button"
            class="text-sm font-semibold [color:var(--brand)] hover:[color:var(--brand)]"
            :disabled="loading"
            @click="refresh"
          >
            {{ t('admin.common.refresh') }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="p-10 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 [border-color:var(--brand)]" />
        <p class="mt-2 text-sm text-secondary">
          {{ t('admin.pages.cash.transactions.loading') }}
        </p>
      </div>

      <div v-else-if="txs.length === 0" class="p-10 text-center">
        <Icon name="lucide:inbox" class="mx-auto h-10 w-10 text-muted" />
        <p class="mt-3 text-sm font-semibold text-primary">
          {{ t('admin.pages.cash.transactions.empty') }}
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y border-line">
          <thead class="surface-2">
            <tr>
              <th class="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-muted">
                {{ t('admin.pages.cash.transactions.table.date') }}
              </th>
              <th class="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-muted">
                {{ t('admin.pages.cash.transactions.table.type') }}
              </th>
              <th class="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-muted">
                {{ t('admin.pages.cash.transactions.table.method') }}
              </th>
              <th class="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wider text-muted">
                {{ t('admin.pages.cash.transactions.table.amount') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y border-line">
            <tr v-for="tx in txs" :key="tx.id" class="transition-colors hover:opacity-80">
              <td class="px-4 py-3 whitespace-nowrap text-sm text-secondary">
                {{ formatDate(tx.createdAt) }}
              </td>
              <td class="px-4 py-3 text-sm text-secondary">
                <p class="font-semibold text-primary">
                  {{ typeLabel(tx.type) }}
                </p>
                <p v-if="tx.expenseCategory" class="text-xs text-muted">
                  {{ tx.expenseCategory }}
                </p>
                <p v-if="tx.reference" class="text-xs text-muted">
                  {{ tx.reference }}
                </p>
              </td>
              <td class="px-4 py-3 text-sm text-secondary">
                {{ methodLabel(tx.method) }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-end text-sm font-semibold" :class="tx.direction === 'IN' ? 'text-emerald-400' : 'text-rose-400'">
                {{ tx.direction === 'IN' ? '+' : '-' }}{{ formatCurrency(Number(tx.amount)) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Open Session Modal -->
    <div v-if="openSessionOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="openSessionOpen = false">
      <div class="flex min-h-screen items-center justify-center px-4">
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="openSessionOpen = false" />
        <div class="relative z-10 w-full max-w-md rounded-xl p-6 surface-2 border border-line shadow-overlay">
          <h3 class="text-lg font-semibold text-primary">
            {{ t('admin.pages.cash.modals.openSession.title') }}
          </h3>

          <div class="mt-4 space-y-3">
            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.openSession.openingFloatLabel') }}
              </label>
              <BaseInput v-model="openSessionForm.openingFloat" money placeholder="0" />
            </div>
            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.openSession.noteLabel') }}
              </label>
              <BaseInput v-model="openSessionForm.note" :placeholder="t('admin.pages.cash.modals.openSession.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="ui-btn ui-btn--secondary text-sm"
              @click="openSessionOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-lg [background:var(--brand)] text-brand-contrast text-sm font-semibold hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50"
              :disabled="actionLoading"
              @click="submitOpenSession"
            >
              {{ actionLoading ? t('admin.common.updating') : t('admin.pages.cash.modals.openSession.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Close Session Modal -->
    <div v-if="closeSessionOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closeSessionOpen = false">
      <div class="flex min-h-screen items-center justify-center px-4">
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="closeSessionOpen = false" />
        <div class="relative z-10 w-full max-w-md rounded-xl p-6 surface-2 border border-line shadow-overlay">
          <h3 class="text-lg font-semibold text-primary">
            {{ t('admin.pages.cash.modals.closeSession.title') }}
          </h3>

          <div class="mt-4 space-y-3">
            <div class="rounded-lg p-3 surface-3 border border-line">
              <div v-if="closeExpectedLoading" class="flex items-center gap-2 text-sm text-secondary">
                <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                {{ t('admin.pages.cash.sessions.expected.loading') }}
              </div>
              <div v-else-if="closeExpected" class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-muted">
                    {{ t('admin.pages.cash.openingFloat') }}
                  </p>
                  <p class="mt-0.5 font-semibold text-primary">
                    {{ formatCurrency(Number(closeExpected.openingFloat)) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-muted">
                    {{ t('admin.pages.cash.expectedClosing') }}
                  </p>
                  <p class="mt-0.5 font-semibold text-primary">
                    {{ formatCurrency(Number(closeExpected.expectedClosing)) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-muted">
                    {{ t('admin.pages.cash.directions.in') }}
                  </p>
                  <p class="mt-0.5 font-semibold text-emerald-400">
                    +{{ formatCurrency(Number(closeExpected.inSum)) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-muted">
                    {{ t('admin.pages.cash.directions.out') }}
                  </p>
                  <p class="mt-0.5 font-semibold text-rose-400">
                    -{{ formatCurrency(Number(closeExpected.outSum)) }}
                  </p>
                </div>
                <div class="col-span-2 flex items-center justify-between">
                  <p class="text-xs font-semibold uppercase tracking-wider text-muted">
                    {{ t('admin.pages.cash.difference') }}
                  </p>
                  <p class="font-semibold" :class="closeDifference !== null && closeDifference !== 0 ? 'text-rose-400' : ''" :style="!(closeDifference !== null && closeDifference !== 0) ? 'color: var(--text-primary)' : ''">
                    {{ closeDifference === null ? '—' : formatCurrency(closeDifference) }}
                  </p>
                </div>
              </div>
              <div v-else class="text-sm text-secondary">
                {{ t('admin.pages.cash.sessions.expected.unavailable') }}
              </div>
            </div>
            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.closeSession.closingCountLabel') }}
              </label>
              <BaseInput v-model="closeSessionForm.closingCount" money placeholder="0" />
            </div>
            <div>
              <label class="ui-label mb-1 block">
                {{ t('admin.pages.cash.modals.closeSession.noteLabel') }}
              </label>
              <BaseInput v-model="closeSessionForm.note" :placeholder="t('admin.pages.cash.modals.closeSession.notePlaceholder')" />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="ui-btn ui-btn--secondary text-sm"
              @click="closeSessionOpen = false"
            >
              {{ t('admin.common.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-lg text-brand-contrast text-sm font-semibold disabled:opacity-50 [background:var(--brand)] hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)]"
              :disabled="actionLoading"
              @click="submitCloseSession"
            >
              {{ actionLoading ? t('admin.common.updating') : t('admin.pages.cash.modals.closeSession.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseInput from '~/components/ui/BaseInput.vue'
import { parsePriceInput } from '~/shared/pricing/money-format'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.cash.title'
})

type Cashbox = {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  openSession: null | { id: string; openedAt: string; openingFloat: string | number }
}

type CashTx = {
  id: string
  cashboxId: string
  direction: 'IN' | 'OUT'
  type: string
  amount: string | number
  method: string
  expenseCategory: string | null
  reference: string | null
  createdAt: string
}

type CashSessionExpected = {
  sessionId: string
  openingFloat: string | number
  inSum: string | number
  outSum: string | number
  expectedClosing: string | number
}

const authStore = useAuthStore()
const route = useRoute()
const cashboxId = route.params.id as string
const { t, locale } = useI18n({ useScope: 'global' })
const { format: formatCurrency } = useCurrency()

const cashbox = ref<Cashbox | null>(null)
const txs = ref<CashTx[]>([])
const loading = ref(true)
const actionLoading = ref(false)

const openSessionOpen = ref(false)
const openSessionForm = reactive({ openingFloat: '0', note: '' })

const closeSessionOpen = ref(false)
const closeSessionForm = reactive({ closingCount: '', note: '' })
const closeExpected = ref<CashSessionExpected | null>(null)
const closeExpectedLoading = ref(false)

const closeDifference = computed(() => {
  if (!closeExpected.value) return null
  const closing = parsePriceInput(closeSessionForm.closingCount)
  if (!Number.isFinite(closing)) return null
  const expected = Number(closeExpected.value.expectedClosing)
  if (!Number.isFinite(expected)) return null
  return Number(closing) - expected
})

function typeLabel(type: string) {
  const key = `admin.pages.cash.transactions.types.${type}`
  const translated = t(key)
  return translated === key ? type : translated
}

function methodLabel(method: string) {
  const key = `admin.pages.cash.methods.${method}`
  const translated = t(key)
  return translated === key ? method : translated
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const intlLocale = locale.value === 'fr' ? 'fr-FR' : locale.value === 'ar' ? 'ar-DZ' : 'en-US'
  return date.toLocaleDateString(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function refresh() {
  loading.value = true
  try {
    const cashboxes = await $fetch<Cashbox[]>('/api/admin/cashboxes', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    cashbox.value = cashboxes.find((c) => c.id === cashboxId) ?? null

    txs.value = await $fetch<CashTx[]>(`/api/admin/cash-transactions?cashboxId=${encodeURIComponent(cashboxId)}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } finally {
    loading.value = false
  }
}

function openOpenSession() {
  openSessionForm.openingFloat = '0'
  openSessionForm.note = ''
  openSessionOpen.value = true
}

function openCloseSession() {
  closeSessionForm.closingCount = ''
  closeSessionForm.note = ''
  closeExpected.value = null
  closeSessionOpen.value = true
  const sessionId = cashbox.value?.openSession?.id
  if (sessionId) void loadCloseExpected(sessionId)
}

async function loadCloseExpected(sessionId: string) {
  closeExpectedLoading.value = true
  try {
    closeExpected.value = await $fetch<CashSessionExpected>(`/api/admin/cash-sessions/${sessionId}/expected`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } catch (e) {
    console.error('Load expected closing failed:', e)
    closeExpected.value = null
  } finally {
    closeExpectedLoading.value = false
  }
}

async function submitOpenSession() {
  const openingFloat = parsePriceInput(openSessionForm.openingFloat)
  if (!Number.isFinite(openingFloat)) return
  actionLoading.value = true
  try {
    await $fetch(`/api/admin/cashboxes/${cashboxId}/sessions/open`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { openingFloat, note: openSessionForm.note }
    })
    openSessionOpen.value = false
    await refresh()
  } catch (e) {
    console.error('Open session failed:', e)
  } finally {
    actionLoading.value = false
  }
}

async function submitCloseSession() {
  const sessionId = cashbox.value?.openSession?.id
  if (!sessionId) return
  const closingCount = parsePriceInput(closeSessionForm.closingCount)
  if (!Number.isFinite(closingCount)) return
  actionLoading.value = true
  try {
    await $fetch(`/api/admin/cash-sessions/${sessionId}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { closingCount, note: closeSessionForm.note }
    })
    closeSessionOpen.value = false
    closeExpected.value = null
    await refresh()
  } catch (e) {
    console.error('Close session failed:', e)
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  refresh()
})
</script>
