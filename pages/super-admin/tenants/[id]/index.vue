<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-sm text-secondary">
          <NuxtLink to="/super-admin/tenants" class="hover:text-lime-700 hover:underline">{{ t('superAdmin.nav.tenants') }}</NuxtLink>
          <span>/</span>
          <span class="text-secondary font-semibold">{{ tenantLabel }}</span>
          <span>/</span>
          <span class="text-secondary font-semibold">{{ t('superAdmin.tenants.detail.breadcrumb') }}</span>
        </div>
        <div class="flex items-center gap-3 mt-2">
          <h1 class="text-2xl font-bold text-primary">{{ detail?.tenant?.name || tenantLabel }}</h1>
          <span v-if="detail?.tenant?.archivedAt" class="ui-badge ui-badge--slate">{{ t('superAdmin.tenants.status.archived') }}</span>
          <span v-else-if="detail?.tenant?.isSuspended" class="ui-badge ui-badge--red">{{ t('superAdmin.tenants.status.suspended') }}</span>
          <span v-else-if="detail" class="ui-badge ui-badge--emerald">{{ t('superAdmin.tenants.status.active') }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <a
          v-if="detail?.tenant"
          :href="storefrontUrl"
          target="_blank"
          rel="noreferrer"
          class="ui-btn ui-btn--secondary ui-btn--md"
        >
          <Icon name="lucide:external-link" class="h-4 w-4" />
          <span>{{ t('superAdmin.tenants.detail.storefrontLink') }}</span>
        </a>
        <NuxtLink :to="`/super-admin/tenants/${tenantId}/payments`" class="ui-btn ui-btn--secondary ui-btn--md">
          <Icon name="lucide:receipt" class="h-4 w-4" />
          <span>{{ t('superAdmin.tenants.actions.payments') }}</span>
        </NuxtLink>
        <NuxtLink :to="`/super-admin/tenants/${tenantId}/devices`" class="ui-btn ui-btn--secondary ui-btn--md">
          <Icon name="lucide:smartphone" class="h-4 w-4" />
          <span>Devices &amp; licence</span>
        </NuxtLink>
      </div>
    </div>

    <div v-if="error" class="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
      {{ error }}
    </div>

    <div v-if="loading" class="p-8 text-center text-secondary surface-1 border border-line rounded-xl">
      {{ t('superAdmin.tenants.detail.loading') }}
    </div>
    <div v-else-if="!detail" class="p-8 text-center text-secondary surface-1 border border-line rounded-xl">
      {{ t('superAdmin.tenants.detail.notFound') }}
    </div>

    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Overview -->
        <div class="surface-1 border border-line rounded-xl p-6 shadow-sm space-y-3">
          <h2 class="text-lg font-bold text-primary">{{ t('superAdmin.tenants.detail.overview.title') }}</h2>
          <div class="flex justify-between text-sm">
            <span class="text-secondary">{{ t('superAdmin.tenants.detail.overview.slug') }}</span>
            <code class="px-2 py-0.5 surface-2 rounded-lg text-secondary border border-line">{{ detail.tenant.slug }}</code>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-secondary">{{ t('superAdmin.tenants.detail.overview.createdAt') }}</span>
            <span class="text-secondary">{{ formatDate(detail.tenant.createdAt) }}</span>
          </div>
          <div class="flex flex-wrap gap-2 pt-2">
            <button
              v-if="!detail.tenant.archivedAt && !detail.tenant.isSuspended"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              @click="suspendTenant"
            >
              {{ t('superAdmin.tenants.actions.suspend') }}
            </button>
            <button
              v-if="!detail.tenant.archivedAt && detail.tenant.isSuspended"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              @click="unsuspendTenant"
            >
              {{ t('superAdmin.tenants.actions.activate') }}
            </button>
            <button
              v-if="!detail.tenant.archivedAt"
              class="ui-btn ui-btn--secondary ui-btn--sm"
              @click="archiveTenant"
            >
              {{ t('superAdmin.tenants.actions.archive') }}
            </button>
            <button
              v-else
              class="ui-btn ui-btn--secondary ui-btn--sm"
              @click="restoreTenant"
            >
              {{ t('superAdmin.tenants.actions.restore') }}
            </button>
          </div>
        </div>

        <!-- Plan & usage -->
        <div class="lg:col-span-2 surface-1 border border-line rounded-xl p-6 shadow-sm space-y-4">
          <h2 class="text-lg font-bold text-primary">{{ t('superAdmin.tenants.detail.plan.title') }}</h2>

          <div v-if="detail.subscription" class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div class="text-secondary">{{ t('superAdmin.tenants.detail.plan.currentPlan') }}</div>
              <div class="font-semibold text-primary">{{ currentPlanName }}</div>
            </div>
            <div>
              <div class="text-secondary">{{ t('superAdmin.tenants.detail.plan.interval') }}</div>
              <div class="font-semibold text-primary">{{ detail.subscription.interval }}</div>
            </div>
            <div>
              <div class="text-secondary">{{ t('superAdmin.tenants.detail.plan.status') }}</div>
              <div class="font-semibold text-primary">{{ detail.subscription.status }}</div>
            </div>
            <div>
              <div class="text-secondary">{{ t('superAdmin.tenants.detail.plan.currentPeriod') }}</div>
              <div class="font-semibold text-primary">
                {{ formatDate(detail.subscription.currentPeriodStart) }} – {{ detail.subscription.currentPeriodEnd ? formatDate(detail.subscription.currentPeriodEnd) : '—' }}
              </div>
            </div>
            <div v-if="detail.subscription.trialEnd">
              <div class="text-secondary">{{ t('superAdmin.tenants.detail.plan.trialEnds') }}</div>
              <div class="font-semibold text-primary">{{ formatDate(detail.subscription.trialEnd) }}</div>
            </div>
          </div>
          <div v-else class="text-sm text-secondary">{{ t('superAdmin.tenants.detail.plan.noSubscription') }}</div>

          <!--
            Trial control. The activation licence a device holds is clamped to
            trialEnd, so changing it here is what expires or revives a device in
            the field -- including one that never reconnects.
          -->
          <div v-if="detail.subscription" class="flex flex-wrap items-end gap-3 pt-3 border-t border-line">
            <label class="text-sm">
              <span class="block text-secondary mb-1">Trial length (days)</span>
              <input
                v-model.number="trialDays"
                type="number"
                min="1"
                max="365"
                class="w-28 rounded-lg border border-line px-3 py-2 text-sm"
              >
            </label>
            <button
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--md"
              :disabled="trialSubmitting"
              @click="submitTrial"
            >
              {{ detail.subscription.status === 'TRIALING' ? 'Extend trial' : 'Start trial' }}
            </button>
            <p class="text-xs text-secondary basis-full">
              Devices lock themselves when the trial ends, with no network needed.
            </p>
          </div>

          <!-- Usage -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-line">
            <div>
              <div class="flex justify-between text-xs text-secondary mb-1">
                <span>{{ t('superAdmin.tenants.detail.usage.products') }}</span>
                <span>{{ detail.usage.productCount }} / {{ currentPlan?.maxProducts ?? '—' }}</span>
              </div>
              <div class="h-1.5 surface-2 rounded-full overflow-hidden">
                <div class="h-full bg-lime-500" :style="{ width: usageWidth(detail.usage.productCount, currentPlan?.maxProducts) }" />
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs text-secondary mb-1">
                <span>{{ t('superAdmin.tenants.detail.usage.orders') }}</span>
                <span>{{ detail.usage.ordersThisPeriod }} / {{ currentPlan?.ordersPerMonth ?? '—' }}</span>
              </div>
              <div class="h-1.5 surface-2 rounded-full overflow-hidden">
                <div class="h-full bg-lime-500" :style="{ width: usageWidth(detail.usage.ordersThisPeriod, currentPlan?.ordersPerMonth) }" />
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs text-secondary mb-1">
                <span>{{ t('superAdmin.tenants.detail.usage.users') }}</span>
                <span>{{ detail.usage.userCount }}</span>
              </div>
            </div>
          </div>

          <!-- Change plan -->
          <form class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-line" @submit.prevent="submitPlanChange">
            <BaseSelect v-model="planForm.planCode" :options="planOptions" :label="t('superAdmin.tenants.detail.plan.changePlan')" />
            <BaseSelect v-model="planForm.interval" :options="intervalOptions" :label="t('superAdmin.paymentsPage.import.fields.interval')" />
            <div class="flex items-end">
              <button type="submit" :disabled="planSubmitting" class="ui-btn ui-btn--primary ui-btn--md w-full">
                {{ planSubmitting ? t('superAdmin.tenants.detail.plan.updating') : t('superAdmin.tenants.detail.plan.changePlanCta') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Users -->
      <div class="surface-1 border border-line rounded-xl overflow-hidden shadow-sm">
        <div class="px-6 py-4 border-b border-line surface-2">
          <h2 class="text-lg font-bold text-primary">{{ t('superAdmin.tenants.detail.users.title') }}</h2>
        </div>
        <div v-if="detail.users.length === 0" class="p-8 text-center text-secondary">{{ t('superAdmin.tenants.detail.users.empty') }}</div>
        <div v-else class="overflow-x-auto">
          <table class="ui-table">
            <thead class="ui-thead border-b border-line">
              <tr>
                <th class="ui-th">{{ t('superAdmin.tenants.detail.users.table.email') }}</th>
                <th class="ui-th">{{ t('superAdmin.tenants.detail.users.table.role') }}</th>
                <th class="ui-th">{{ t('superAdmin.tenants.detail.users.table.status') }}</th>
                <th class="ui-th">{{ t('superAdmin.tenants.detail.users.table.created') }}</th>
              </tr>
            </thead>
            <tbody class="ui-tbody">
              <tr v-for="u in detail.users" :key="u.id" class="ui-tr">
                <td class="ui-td text-secondary">{{ u.email }}</td>
                <td class="ui-td text-secondary">{{ u.role }}</td>
                <td class="ui-td">
                  <span class="ui-badge" :class="u.isActive ? 'ui-badge--emerald' : 'ui-badge--slate'">
                    {{ u.isActive ? t('superAdmin.tenants.status.active') : t('superAdmin.tenants.status.suspended') }}
                  </span>
                </td>
                <td class="ui-td text-sm text-secondary whitespace-nowrap">{{ formatDate(u.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Integrations -->
        <div class="surface-1 border border-line rounded-xl overflow-hidden shadow-sm">
          <div class="px-6 py-4 border-b border-line surface-2">
            <h2 class="text-lg font-bold text-primary">{{ t('superAdmin.tenants.detail.integrations.title') }}</h2>
          </div>
          <div v-if="detail.integrations.length === 0" class="p-6 text-center text-secondary text-sm">{{ t('superAdmin.tenants.detail.integrations.empty') }}</div>
          <ul v-else class="divide-y divide-line">
            <li v-for="i in detail.integrations" :key="i.id" class="px-6 py-3 flex items-center justify-between text-sm">
              <span class="font-semibold text-secondary">{{ i.provider }}</span>
              <span class="ui-badge" :class="i.isActive ? 'ui-badge--emerald' : 'ui-badge--slate'">
                {{ i.isActive ? t('superAdmin.tenants.status.active') : t('superAdmin.tenants.status.suspended') }}
              </span>
            </li>
          </ul>

          <div class="px-6 py-4 border-y border-line surface-2">
            <h3 class="text-sm font-bold text-primary">{{ t('superAdmin.tenants.detail.integrations.deliveryTitle') }}</h3>
          </div>
          <div v-if="detail.deliveryAccounts.length === 0" class="p-6 text-center text-secondary text-sm">{{ t('superAdmin.tenants.detail.integrations.deliveryEmpty') }}</div>
          <ul v-else class="divide-y divide-line">
            <li v-for="d in detail.deliveryAccounts" :key="d.id" class="px-6 py-3 flex items-center justify-between text-sm">
              <span class="font-semibold text-secondary">{{ d.provider }}</span>
              <span class="ui-badge" :class="d.isActive ? 'ui-badge--emerald' : 'ui-badge--slate'">
                {{ d.isActive ? t('superAdmin.tenants.status.active') : t('superAdmin.tenants.status.suspended') }}
              </span>
            </li>
          </ul>
        </div>

        <!-- Domains -->
        <div class="surface-1 border border-line rounded-xl overflow-hidden shadow-sm">
          <div class="px-6 py-4 border-b border-line surface-2">
            <h2 class="text-lg font-bold text-primary">{{ t('superAdmin.tenants.detail.domains.title') }}</h2>
          </div>
          <div v-if="detail.domains.length === 0" class="p-6 text-center text-secondary text-sm">{{ t('superAdmin.tenants.detail.domains.empty') }}</div>
          <ul v-else class="divide-y divide-line">
            <li v-for="d in detail.domains" :key="d.id" class="px-6 py-3 flex items-center justify-between text-sm">
              <span class="font-semibold text-secondary">{{ d.domain }}</span>
              <span class="text-secondary">{{ formatDate(d.createdAt) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import BaseSelect from '~/components/ui/BaseSelect.vue'
import { PRICING_PLANS, getPlanByCode } from '~/shared/pricing/plans'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'super-admin',
  layout: 'super-admin'
})

const { t, locale } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const route = useRoute()
const platformBaseDomain = usePlatformBaseDomain()

const tenantId = computed(() => String(route.params.id || ''))
const loading = ref(true)
const error = ref('')
const detail = ref<any>(null)
const planSubmitting = ref(false)

const tenantLabel = computed(() => detail.value?.tenant ? `${detail.value.tenant.name} (${detail.value.tenant.slug})` : tenantId.value)

const storefrontUrl = computed(() => {
  if (!detail.value?.tenant?.slug) return '#'
  return `https://${detail.value.tenant.slug}.${platformBaseDomain}`
})

const currentPlan = computed(() => {
  const code = detail.value?.subscription?.planCode
  return code ? getPlanByCode(code) : null
})

const currentPlanName = computed(() => currentPlan.value ? t(`pricing.plans.${currentPlan.value.code}.name`) : detail.value?.subscription?.planCode)

const planOptions = computed(() =>
  PRICING_PLANS.map((p) => ({
    value: p.code,
    label: `${t(`pricing.plans.${p.code}.name`)} (${t('superAdmin.paymentsPage.planOption.ordersPerMonth', { count: p.ordersPerMonth })})`
  }))
)

const intervalOptions = computed(() => [
  { value: 'month', label: t('superAdmin.paymentsPage.interval.monthly') },
  { value: 'year', label: t('superAdmin.paymentsPage.interval.yearly') }
])

const planForm = ref({
  planCode: 'basic',
  interval: 'month'
})

const usageWidth = (used: number, max?: number | null) => {
  if (!max) return '0%'
  return `${Math.min(100, Math.round((used / max) * 100))}%`
}

const formatDate = (date: string) => {
  const iso = locale.value === 'fr' ? 'fr-FR' : locale.value === 'ar' ? 'ar-DZ' : 'en-US'
  return new Date(date).toLocaleDateString(iso, { month: 'short', day: 'numeric', year: 'numeric' })
}

async function loadDetail() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch<any>(`/api/super-admin/tenants/${encodeURIComponent(tenantId.value)}/detail`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    detail.value = res
    if (res?.subscription) {
      planForm.value.planCode = res.subscription.planCode
      planForm.value.interval = res.subscription.interval
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || t('superAdmin.tenants.detail.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

const trialDays = ref(15)
const trialSubmitting = ref(false)

async function submitTrial() {
  error.value = ''
  trialSubmitting.value = true
  try {
    await $fetch(`/api/super-admin/billing/tenants/${encodeURIComponent(tenantId.value)}/trial`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { days: trialDays.value }
    })
    await loadDetail()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Could not update the trial'
  } finally {
    trialSubmitting.value = false
  }
}

async function submitPlanChange() {
  error.value = ''
  planSubmitting.value = true
  try {
    await $fetch(`/api/super-admin/billing/tenants/${encodeURIComponent(tenantId.value)}/subscription`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { planCode: planForm.value.planCode, interval: planForm.value.interval }
    })
    await loadDetail()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || t('superAdmin.tenants.detail.errors.planUpdateFailed')
  } finally {
    planSubmitting.value = false
  }
}

async function suspendTenant() {
  await $fetch(`/api/super-admin/tenants/${tenantId.value}/suspend`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authStore.token}` }
  })
  await loadDetail()
}

async function unsuspendTenant() {
  await $fetch(`/api/super-admin/tenants/${tenantId.value}/unsuspend`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authStore.token}` }
  })
  await loadDetail()
}

async function archiveTenant() {
  if (!confirm(t('superAdmin.tenants.confirm.archive', { name: tenantLabel.value }))) return
  await $fetch(`/api/super-admin/tenants/${tenantId.value}/archive`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authStore.token}` }
  })
  await loadDetail()
}

async function restoreTenant() {
  if (!confirm(t('superAdmin.tenants.confirm.restore', { name: tenantLabel.value }))) return
  await $fetch(`/api/super-admin/tenants/${tenantId.value}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authStore.token}` }
  })
  await loadDetail()
}

onMounted(() => {
  loadDetail()
})
</script>
