<template>
  <div>
    <UiPageHeader
      :section="t('admin.nav.storeParameters')"
      :title="t('admin.pages.promoCodes.title')"
      :subtitle="t('admin.pages.promoCodes.subtitle')"
      :stats="headerStats"
    >
      <UiButton
        variant="primary"
        icon="lucide:plus"
        @click="openCreate"
      >
        {{ t('admin.pages.promoCodes.actions.create') }}
      </UiButton>
    </UiPageHeader>

    <UiCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-[220px] flex-1">
          <UiInput
            v-model="search"
            :label="t('admin.pages.promoCodes.filters.search')"
            :placeholder="t('admin.pages.promoCodes.filters.searchPlaceholder')"
            type="search"
          />
        </div>
        <div class="w-48">
          <UiSelect
            v-model="statusFilter"
            :label="t('admin.pages.promoCodes.filters.status')"
            :options="statusOptions"
          />
        </div>
      </div>
    </UiCard>

    <UiCard
      v-if="loading"
      class="text-center"
    >
      <div class="ui-skeleton mx-auto h-24 w-full rounded-xl" />
    </UiCard>

    <UiCard
      v-else-if="!codes.length"
      :padded="false"
    >
      <UiEmptyState
        icon="lucide:ticket-percent"
        :title="t('admin.pages.promoCodes.empty.title')"
        :description="t('admin.pages.promoCodes.empty.description')"
      >
        <UiButton
          variant="primary"
          icon="lucide:plus"
          @click="openCreate"
        >
          {{ t('admin.pages.promoCodes.actions.create') }}
        </UiButton>
      </UiEmptyState>
    </UiCard>

    <UiCard
      v-else
      :padded="false"
    >
      <div class="overflow-x-auto">
        <table class="ui-table">
          <thead class="ui-thead">
            <tr>
              <th class="ui-th">
                {{ t('admin.pages.promoCodes.table.code') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.promoCodes.table.discount') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.promoCodes.table.conditions') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.promoCodes.table.usage') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.promoCodes.table.window') }}
              </th>
              <th class="ui-th">
                {{ t('admin.pages.promoCodes.table.status') }}
              </th>
              <th class="ui-th text-end">
                {{ t('admin.common.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr
              v-for="promo in codes"
              :key="promo.id"
              class="ui-tr"
            >
              <td class="ui-td">
                <div class="font-mono-nums font-semibold text-primary">
                  {{ promo.code }}
                </div>
                <div
                  v-if="promo.description"
                  class="text-mini text-tertiary"
                >
                  {{ promo.description }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap text-secondary">
                {{ discountLabel(promo) }}
                <div
                  v-if="promo.maxDiscountAmount"
                  class="text-mini text-tertiary"
                >
                  {{ t('admin.pages.promoCodes.table.cappedAt', { amount: formatMoney(promo.maxDiscountAmount) }) }}
                </div>
              </td>
              <td class="ui-td text-secondary">
                <div
                  v-if="promo.minOrderAmount > 0"
                  class="text-xs"
                >
                  {{ t('admin.pages.promoCodes.table.minOrder', { amount: formatMoney(promo.minOrderAmount) }) }}
                </div>
                <div class="text-mini text-tertiary">
                  {{ scopeLabel(promo) }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <span class="font-mono-nums text-primary">{{ promo.usedCount }}</span>
                <span class="text-tertiary">/{{ promo.usageLimit ?? '∞' }}</span>
                <div
                  v-if="promo.usageLimitPerCustomer"
                  class="text-mini text-tertiary"
                >
                  {{ t('admin.pages.promoCodes.table.perCustomer', { count: promo.usageLimitPerCustomer }) }}
                </div>
              </td>
              <td class="ui-td whitespace-nowrap text-mini text-secondary">
                <div>{{ promo.startsAt ? formatDate(promo.startsAt) : t('admin.pages.promoCodes.table.noStart') }}</div>
                <div>{{ promo.endsAt ? formatDate(promo.endsAt) : t('admin.pages.promoCodes.table.noEnd') }}</div>
              </td>
              <td class="ui-td whitespace-nowrap">
                <UiBadge
                  :tone="statusTone(promo)"
                  :label="statusLabel(promo)"
                />
              </td>
              <td class="ui-td whitespace-nowrap text-end">
                <button
                  class="ui-table-action"
                  :title="t('admin.common.edit')"
                  @click="openEdit(promo)"
                >
                  <Icon
                    name="lucide:pencil"
                    class="h-4 w-4"
                  />
                </button>
                <button
                  class="ui-table-action ui-table-action--danger"
                  :title="t('admin.common.delete')"
                  @click="askDelete(promo)"
                >
                  <Icon
                    name="lucide:trash"
                    class="h-4 w-4"
                  />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <UiModal
      v-model:open="formOpen"
      size="xl"
      :title="editing ? t('admin.pages.promoCodes.form.editTitle') : t('admin.pages.promoCodes.form.createTitle')"
      :description="t('admin.pages.promoCodes.form.description')"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UiInput
          v-model="form.code"
          :label="t('admin.pages.promoCodes.form.code')"
          :hint="t('admin.pages.promoCodes.form.codeHint')"
          placeholder="WELCOME10"
          required
        />
        <UiInput
          v-model="form.description"
          :label="t('admin.pages.promoCodes.form.description')"
          :placeholder="t('admin.pages.promoCodes.form.descriptionPlaceholder')"
        />

        <UiSelect
          v-model="form.discountType"
          :label="t('admin.pages.promoCodes.form.discountType')"
          :options="discountTypeOptions"
        />
        <UiInput
          v-if="form.discountType !== 'FREE_SHIPPING'"
          v-model="form.discountValue"
          :label="form.discountType === 'PERCENTAGE'
            ? t('admin.pages.promoCodes.form.percentValue')
            : t('admin.pages.promoCodes.form.fixedValue', { currency: currencyCode })"
          type="number"
          min="0"
          step="0.01"
          required
        />

        <UiInput
          v-if="form.discountType === 'PERCENTAGE'"
          v-model="form.maxDiscountAmount"
          :label="t('admin.pages.promoCodes.form.maxDiscount', { currency: currencyCode })"
          :hint="t('admin.pages.promoCodes.form.maxDiscountHint')"
          type="number"
          min="0"
          step="0.01"
        />
        <UiInput
          v-model="form.minOrderAmount"
          :label="t('admin.pages.promoCodes.form.minOrder', { currency: currencyCode })"
          :hint="t('admin.pages.promoCodes.form.minOrderHint')"
          type="number"
          min="0"
          step="0.01"
        />

        <UiInput
          v-model="form.startsAt"
          :label="t('admin.pages.promoCodes.form.startsAt')"
          :hint="t('admin.pages.promoCodes.form.startsAtHint')"
          type="datetime-local"
        />
        <UiInput
          v-model="form.endsAt"
          :label="t('admin.pages.promoCodes.form.endsAt')"
          :hint="t('admin.pages.promoCodes.form.endsAtHint')"
          type="datetime-local"
        />

        <UiInput
          v-model="form.usageLimit"
          :label="t('admin.pages.promoCodes.form.usageLimit')"
          :hint="t('admin.pages.promoCodes.form.usageLimitHint')"
          type="number"
          min="1"
          step="1"
        />
        <UiInput
          v-model="form.usageLimitPerCustomer"
          :label="t('admin.pages.promoCodes.form.usageLimitPerCustomer')"
          :hint="t('admin.pages.promoCodes.form.usageLimitPerCustomerHint')"
          type="number"
          min="1"
          step="1"
        />

        <div class="sm:col-span-2">
          <p class="ui-label">
            {{ t('admin.pages.promoCodes.form.scope') }}
          </p>
          <p class="ui-hint mb-2">
            {{ t('admin.pages.promoCodes.form.scopeHint') }}
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <p class="ui-label">
                {{ t('admin.pages.promoCodes.form.categories') }}
              </p>
              <div class="mt-1 max-h-40 overflow-y-auto custom-scrollbar rounded-lg border border-line surface-2 p-2">
                <label
                  v-for="category in categories"
                  :key="category.id"
                  class="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-secondary hover:bg-hover"
                >
                  <input
                    v-model="form.categoryIds"
                    type="checkbox"
                    :value="category.id"
                  >
                  <span class="truncate">{{ category.title }}</span>
                </label>
                <p
                  v-if="!categories.length"
                  class="ui-hint px-2 py-1"
                >
                  {{ t('admin.pages.promoCodes.form.noCategories') }}
                </p>
              </div>
            </div>
            <div>
              <p class="ui-label">
                {{ t('admin.pages.promoCodes.form.products') }}
              </p>
              <div class="mt-1 max-h-40 overflow-y-auto custom-scrollbar rounded-lg border border-line surface-2 p-2">
                <label
                  v-for="product in products"
                  :key="product.id"
                  class="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-secondary hover:bg-hover"
                >
                  <input
                    v-model="form.productIds"
                    type="checkbox"
                    :value="product.id"
                  >
                  <span class="truncate">{{ product.title }}</span>
                </label>
                <p
                  v-if="!products.length"
                  class="ui-hint px-2 py-1"
                >
                  {{ t('admin.pages.promoCodes.form.noProducts') }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="ui-toggle-row sm:col-span-2">
          <div class="min-w-0">
            <p class="text-sm font-medium text-primary">
              {{ t('admin.pages.promoCodes.form.active') }}
            </p>
            <p class="ui-hint">
              {{ t('admin.pages.promoCodes.form.activeHint') }}
            </p>
          </div>
          <UiToggle
            v-model="form.isActive"
            :sr-label="t('admin.pages.promoCodes.form.active')"
          />
        </div>

        <p
          v-if="formError"
          class="ui-error sm:col-span-2"
        >
          {{ formError }}
        </p>
      </div>

      <template #footer>
        <UiButton
          variant="ghost"
          @click="formOpen = false"
        >
          {{ t('admin.common.cancel') }}
        </UiButton>
        <UiButton
          variant="primary"
          :loading="saving"
          @click="submitForm"
        >
          {{ editing ? t('admin.common.save') : t('admin.pages.promoCodes.actions.create') }}
        </UiButton>
      </template>
    </UiModal>

    <AdminConfirmModal
      v-model="deleteOpen"
      :title="t('admin.pages.promoCodes.delete.title')"
      :message="t('admin.pages.promoCodes.delete.message', { code: codeToDelete?.code || '' })"
      :confirm-text="t('admin.common.delete')"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="deleteError = null"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.promoCodes.title'
})

type DiscountType = 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING'

interface PromoCode {
  id: string
  code: string
  description: string | null
  discountType: DiscountType
  discountValue: number
  maxDiscountAmount: number | null
  minOrderAmount: number
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  usageLimit: number | null
  usageLimitPerCustomer: number | null
  usedCount: number
  productIds: string[]
  categoryIds: string[]
}

const authStore = useAuthStore()
const { t, locale } = useI18n({ useScope: 'global' })
const storeSettings = useState<any>('storeSettings')

const codes = ref<PromoCode[]>([])
const categories = ref<{ id: string; title: string }[]>([])
const products = ref<{ id: string; title: string }[]>([])
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const statusFilter = ref('')

const formOpen = ref(false)
const formError = ref('')
const editing = ref<PromoCode | null>(null)

const deleteOpen = ref(false)
const deleteError = ref<string | null>(null)
const codeToDelete = ref<PromoCode | null>(null)

const emptyForm = () => ({
  code: '',
  description: '',
  discountType: 'PERCENTAGE' as DiscountType,
  discountValue: '',
  maxDiscountAmount: '',
  minOrderAmount: '',
  startsAt: '',
  endsAt: '',
  usageLimit: '',
  usageLimitPerCustomer: '',
  productIds: [] as string[],
  categoryIds: [] as string[],
  isActive: true
})

const form = ref(emptyForm())

const currencyCode = computed(() => storeSettings.value?.currencyCode || 'DZD')

const authHeaders = () => ({ Authorization: `Bearer ${authStore.token}` })

const statusOptions = computed(() => [
  { value: '', label: t('admin.pages.promoCodes.filters.all') },
  { value: 'active', label: t('admin.pages.promoCodes.status.active') },
  { value: 'inactive', label: t('admin.pages.promoCodes.status.inactive') }
])

const discountTypeOptions = computed(() => [
  { value: 'PERCENTAGE', label: t('admin.pages.promoCodes.types.PERCENTAGE') },
  { value: 'FIXED', label: t('admin.pages.promoCodes.types.FIXED') },
  { value: 'FREE_SHIPPING', label: t('admin.pages.promoCodes.types.FREE_SHIPPING') }
])

const headerStats = computed(() => [
  { label: t('admin.pages.promoCodes.stats.total'), value: codes.value.length },
  {
    label: t('admin.pages.promoCodes.stats.active'),
    value: codes.value.filter((promo) => isLive(promo)).length,
    tone: 'green' as const
  },
  {
    label: t('admin.pages.promoCodes.stats.redemptions'),
    value: codes.value.reduce((sum, promo) => sum + promo.usedCount, 0),
    tone: 'blue' as const
  }
])

const intlLocale = computed(() =>
  locale.value === 'fr' ? 'fr-FR' : locale.value === 'ar' ? 'ar-DZ' : 'en-US'
)

function formatMoney(amount: number | null | undefined) {
  const value = Number(amount || 0)
  return `${value.toLocaleString(intlLocale.value)} ${currencyCode.value}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(intlLocale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/** Live means "a shopper can use it right now", not merely "not archived". */
function isLive(promo: PromoCode) {
  if (!promo.isActive) return false
  const now = Date.now()
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return false
  if (promo.endsAt && new Date(promo.endsAt).getTime() <= now) return false
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) return false
  return true
}

function statusLabel(promo: PromoCode) {
  if (!promo.isActive) return t('admin.pages.promoCodes.status.inactive')
  if (promo.endsAt && new Date(promo.endsAt).getTime() <= Date.now()) {
    return t('admin.pages.promoCodes.status.expired')
  }
  if (promo.startsAt && new Date(promo.startsAt).getTime() > Date.now()) {
    return t('admin.pages.promoCodes.status.scheduled')
  }
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return t('admin.pages.promoCodes.status.exhausted')
  }
  return t('admin.pages.promoCodes.status.active')
}

function statusTone(promo: PromoCode) {
  if (isLive(promo)) return 'emerald' as const
  if (!promo.isActive) return 'slate' as const
  return 'amber' as const
}

function discountLabel(promo: PromoCode) {
  if (promo.discountType === 'FREE_SHIPPING') return t('admin.pages.promoCodes.types.FREE_SHIPPING')
  if (promo.discountType === 'PERCENTAGE') return `${promo.discountValue}%`
  return formatMoney(promo.discountValue)
}

function scopeLabel(promo: PromoCode) {
  const parts: string[] = []
  if (promo.categoryIds.length) {
    parts.push(t('admin.pages.promoCodes.table.categoriesCount', { count: promo.categoryIds.length }))
  }
  if (promo.productIds.length) {
    parts.push(t('admin.pages.promoCodes.table.productsCount', { count: promo.productIds.length }))
  }
  return parts.length ? parts.join(' · ') : t('admin.pages.promoCodes.table.wholeCatalog')
}

/** `datetime-local` wants a local-time string without the timezone suffix. */
function toLocalInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function fetchCodes() {
  loading.value = true
  try {
    const data = await $fetch<{ items: PromoCode[] }>('/api/admin/promo-codes', {
      headers: authHeaders(),
      query: {
        search: search.value.trim() || undefined,
        status: statusFilter.value || undefined
      }
    })
    codes.value = data.items
  } catch (error) {
    console.error('Failed to fetch promo codes:', error)
  } finally {
    loading.value = false
  }
}

async function fetchScopeOptions() {
  try {
    const [categoryList, productList] = await Promise.all([
      $fetch<{ id: string; title: string }[]>('/api/admin/categories', { headers: authHeaders() }),
      $fetch<{ id: string; title: string }[]>('/api/admin/products', { headers: authHeaders() })
    ])
    categories.value = categoryList || []
    products.value = productList || []
  } catch (error) {
    console.error('Failed to fetch promo code scope options:', error)
  }
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  formError.value = ''
  formOpen.value = true
}

function openEdit(promo: PromoCode) {
  editing.value = promo
  form.value = {
    code: promo.code,
    description: promo.description || '',
    discountType: promo.discountType,
    discountValue: promo.discountValue ? String(promo.discountValue) : '',
    maxDiscountAmount: promo.maxDiscountAmount ? String(promo.maxDiscountAmount) : '',
    minOrderAmount: promo.minOrderAmount ? String(promo.minOrderAmount) : '',
    startsAt: toLocalInput(promo.startsAt),
    endsAt: toLocalInput(promo.endsAt),
    usageLimit: promo.usageLimit ? String(promo.usageLimit) : '',
    usageLimitPerCustomer: promo.usageLimitPerCustomer ? String(promo.usageLimitPerCustomer) : '',
    productIds: [...promo.productIds],
    categoryIds: [...promo.categoryIds],
    isActive: promo.isActive
  }
  formError.value = ''
  formOpen.value = true
}

function buildPayload() {
  const numeric = (value: string) => (value === '' ? null : Number(value))
  return {
    code: form.value.code,
    description: form.value.description,
    discountType: form.value.discountType,
    discountValue: form.value.discountType === 'FREE_SHIPPING' ? 0 : numeric(form.value.discountValue) ?? 0,
    maxDiscountAmount: form.value.discountType === 'PERCENTAGE' ? numeric(form.value.maxDiscountAmount) : null,
    minOrderAmount: numeric(form.value.minOrderAmount) ?? 0,
    startsAt: form.value.startsAt ? new Date(form.value.startsAt).toISOString() : null,
    endsAt: form.value.endsAt ? new Date(form.value.endsAt).toISOString() : null,
    usageLimit: numeric(form.value.usageLimit),
    usageLimitPerCustomer: numeric(form.value.usageLimitPerCustomer),
    productIds: form.value.productIds,
    categoryIds: form.value.categoryIds,
    isActive: form.value.isActive
  }
}

async function submitForm() {
  saving.value = true
  formError.value = ''
  try {
    const payload = buildPayload()
    if (editing.value) {
      await $fetch(`/api/admin/promo-codes/${editing.value.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: payload
      })
    } else {
      await $fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: authHeaders(),
        body: payload
      })
    }
    formOpen.value = false
    await fetchCodes()
  } catch (error: any) {
    formError.value = error?.data?.statusMessage || t('admin.common.error')
  } finally {
    saving.value = false
  }
}

function askDelete(promo: PromoCode) {
  codeToDelete.value = promo
  deleteError.value = null
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!codeToDelete.value) return
  try {
    await $fetch(`/api/admin/promo-codes/${codeToDelete.value.id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    codes.value = codes.value.filter((promo) => promo.id !== codeToDelete.value?.id)
    deleteOpen.value = false
  } catch (error: any) {
    deleteError.value = error?.data?.statusMessage || t('admin.common.error')
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch([search, statusFilter], () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { fetchCodes() }, 250)
})

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

onMounted(() => {
  fetchCodes()
  fetchScopeOptions()
})
</script>
