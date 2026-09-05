<script setup lang="ts">
/**
 * Platform AI administration.
 *
 * Everything about AI document import that is not a deployment secret is
 * operated from here: the switch, the model, the page ceiling, the per-plan
 * monthly quota, and what the platform actually spent. Before this page those
 * were four environment variables and a hardcoded array, so retuning any of
 * them meant a redeploy.
 *
 * The API key stays in `ANTHROPIC_API_KEY`. This screen only reports whether
 * one is present.
 */
import { computed, onMounted, ref } from 'vue'

definePageMeta({ layout: 'super-admin', title: 'AI' })

const authStore = useAuthStore()

type SettingSource = 'db' | 'env' | 'default'

type Overview = {
  settings: {
    enabled: boolean
    model: string
    maxPagesPerJob: number
    sources: { enabled: SettingSource, model: SettingSource, maxPagesPerJob: SettingSource }
  }
  apiKeyConfigured: boolean
  models: Array<{ id: string, label: string, cost: 'low' | 'medium' | 'high', note: string }>
  limits: { maxPagesPerJob: number, aiScansPerMonth: number }
  updatedAt: string | null
}

type PlanQuota = { planCode: string, aiScansPerMonth: number | null, default: number }

type Usage = {
  month: string
  totals: { jobs: number, pages: number, inputTokens: number, outputTokens: number, failed: number }
  byModel: Array<{ model: string, jobs: number, inputTokens: number, outputTokens: number }>
  byTenant: Array<{
    tenantId: string
    tenantName: string | null
    jobs: number
    pages: number
    inputTokens: number
    outputTokens: number
  }>
}

const overview = ref<Overview | null>(null)
const quotas = ref<PlanQuota[]>([])
const usage = ref<Usage | null>(null)

const loading = ref(true)
const savingSettings = ref(false)
const savingPlan = ref('')
const loadingUsage = ref(false)
const error = ref('')
const notice = ref('')

// Draft copies, so a failed save leaves the server's values on screen.
const form = ref({ enabled: true, model: '', maxPagesPerJob: 10 })
const quotaDraft = ref<Record<string, string>>({})
const month = ref('')

const authHeaders = computed(() => ({ Authorization: `Bearer ${authStore.token}` }))

const modelOptions = computed(() =>
  (overview.value?.models ?? []).map(m => ({ value: m.id, label: `${m.label} — ${m.cost} cost` }))
)

const selectedModelNote = computed(
  () => overview.value?.models.find(m => m.id === form.value.model)?.note ?? ''
)

/** Tells the operator when a value is still coming from the environment. */
const sourceLabel = (source: SettingSource | undefined) => {
  if (source === 'db') return 'Set here'
  if (source === 'env') return 'From environment'
  return 'Built-in default'
}

const monthOptions = computed(() => {
  const out: Array<{ value: string, label: string }> = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    out.push({ value, label: d.toLocaleString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }) })
  }
  return out
})

const number = (value: number) => value.toLocaleString()

const applyOverview = (data: Overview) => {
  overview.value = data
  form.value = {
    enabled: data.settings.enabled,
    model: data.settings.model,
    maxPagesPerJob: data.settings.maxPagesPerJob
  }
}

const applyQuotas = (plans: PlanQuota[]) => {
  quotas.value = plans
  quotaDraft.value = Object.fromEntries(
    plans.map(p => [p.planCode, p.aiScansPerMonth === null ? '' : String(p.aiScansPerMonth)])
  )
}

const failWith = (e: any, fallback: string) => {
  error.value = e?.data?.statusMessage || e?.message || fallback
}

async function loadUsage() {
  loadingUsage.value = true
  try {
    const query = month.value ? `?month=${month.value}` : ''
    usage.value = await $fetch<Usage>(`/api/super-admin/ai/usage${query}`, { headers: authHeaders.value })
    month.value = usage.value.month
  } catch (e: any) {
    failWith(e, 'Could not load usage')
  } finally {
    loadingUsage.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [settings, plans] = await Promise.all([
      $fetch<Overview>('/api/super-admin/ai/settings', { headers: authHeaders.value }),
      $fetch<{ plans: PlanQuota[] }>('/api/super-admin/ai/plan-quotas', { headers: authHeaders.value })
    ])
    applyOverview(settings)
    applyQuotas(plans.plans ?? [])
    await loadUsage()
  } catch (e: any) {
    failWith(e, 'Could not load AI settings')
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  savingSettings.value = true
  error.value = ''
  notice.value = ''
  try {
    await $fetch('/api/super-admin/ai/settings', {
      method: 'PUT',
      headers: authHeaders.value,
      body: {
        enabled: form.value.enabled,
        model: form.value.model,
        maxPagesPerJob: Number(form.value.maxPagesPerJob)
      }
    })
    const fresh = await $fetch<Overview>('/api/super-admin/ai/settings', { headers: authHeaders.value })
    applyOverview(fresh)
    notice.value = 'Saved. Instances pick this up within 30 seconds.'
  } catch (e: any) {
    failWith(e, 'Could not save settings')
  } finally {
    savingSettings.value = false
  }
}

async function resetSettings() {
  savingSettings.value = true
  error.value = ''
  notice.value = ''
  try {
    await $fetch('/api/super-admin/ai/settings/reset', { method: 'POST', headers: authHeaders.value })
    const fresh = await $fetch<Overview>('/api/super-admin/ai/settings', { headers: authHeaders.value })
    applyOverview(fresh)
    notice.value = 'Cleared. All three fields are back on the environment values.'
  } catch (e: any) {
    failWith(e, 'Could not reset settings')
  } finally {
    savingSettings.value = false
  }
}

async function savePlan(planCode: string) {
  savingPlan.value = planCode
  error.value = ''
  notice.value = ''
  try {
    const raw = (quotaDraft.value[planCode] ?? '').trim()
    const res = await $fetch<{ plans: PlanQuota[] }>(`/api/super-admin/ai/plan-quotas/${planCode}`, {
      method: 'PUT',
      headers: authHeaders.value,
      // Empty means "no override" — the plan falls back to its code default.
      body: { aiScansPerMonth: raw === '' ? null : Number(raw) }
    })
    applyQuotas(res.plans ?? [])
    notice.value = `${planCode} quota updated.`
  } catch (e: any) {
    failWith(e, 'Could not save the quota')
  } finally {
    savingPlan.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <UiPageHeader
      section="Platform"
      title="AI"
      subtitle="Document import settings, plan quotas and API consumption across every tenant."
    />

    <p v-if="error" class="rounded-lg border border-line surface-1 px-4 py-3 text-sm text-danger">
      {{ error }}
    </p>
    <p v-if="notice" class="rounded-lg border border-line surface-1 px-4 py-3 text-sm text-success">
      {{ notice }}
    </p>

    <p v-if="loading" class="text-sm text-secondary">Loading…</p>

    <template v-else-if="overview">
      <UiCard title="Engine" subtitle="Applies to every tenant at once.">
        <div class="space-y-5">
          <div
            v-if="!overview.apiKeyConfigured"
            class="rounded-xl border border-line surface-2 p-4 text-sm text-secondary"
          >
            <span class="font-medium text-warning">No API key on this deployment.</span>
            AI import will answer 503 whatever is set below. Set
            <code class="font-mono text-xs">ANTHROPIC_API_KEY</code> in the environment — it is a
            deployment secret and is deliberately not editable from here.
          </div>

          <div class="flex items-start justify-between gap-4 rounded-xl surface-2 p-4">
            <div>
              <p class="text-sm font-medium text-primary">AI document import</p>
              <p class="mt-0.5 text-mini text-secondary">
                Off means uploads are refused and the stale-job reaper stops.
                <span class="text-tertiary">· {{ sourceLabel(overview.settings.sources.enabled) }}</span>
              </p>
            </div>
            <UiToggle v-model="form.enabled" sr-label="Enable AI document import" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <UiField
              label="Model"
              :hint="selectedModelNote || sourceLabel(overview.settings.sources.model)"
            >
              <UiSelect v-model="form.model" :options="modelOptions" />
            </UiField>

            <UiField
              label="Max pages per document"
              :hint="`1–${overview.limits.maxPagesPerJob}. · ${sourceLabel(overview.settings.sources.maxPagesPerJob)}`"
            >
              <UiInput v-model="form.maxPagesPerJob" type="number" min="1" :max="overview.limits.maxPagesPerJob" />
            </UiField>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <UiButton :loading="savingSettings" @click="saveSettings">Save</UiButton>
            <UiButton variant="ghost" :disabled="savingSettings" @click="resetSettings">
              Reset to environment
            </UiButton>
            <span v-if="overview.updatedAt" class="text-mini text-tertiary">
              Last changed {{ new Date(overview.updatedAt).toLocaleString() }}
            </span>
          </div>
        </div>
      </UiCard>

      <UiCard
        title="Plan quotas"
        subtitle="Monthly AI pages per plan. Leave blank to use the built-in value."
      >
        <div class="space-y-3">
          <div
            v-for="plan in quotas"
            :key="plan.planCode"
            class="flex flex-wrap items-end gap-3 rounded-xl surface-2 p-4"
          >
            <div class="min-w-32 flex-1">
              <p class="text-sm font-medium capitalize text-primary">{{ plan.planCode }}</p>
              <p class="text-mini text-secondary">
                Default {{ number(plan.default) }} pages/month
                <span v-if="plan.aiScansPerMonth !== null" class="text-warning">· overridden</span>
              </p>
            </div>
            <UiInput
              v-model="quotaDraft[plan.planCode]"
              type="number"
              min="0"
              :max="overview.limits.aiScansPerMonth"
              :placeholder="String(plan.default)"
              class="w-40"
            />
            <UiButton
              variant="secondary"
              size="sm"
              :loading="savingPlan === plan.planCode"
              @click="savePlan(plan.planCode)"
            >
              Save
            </UiButton>
          </div>
        </div>
      </UiCard>

      <UiCard title="Usage" subtitle="What the platform spent, by month.">
        <template #actions>
          <UiSelect v-model="month" :options="monthOptions" @update:model-value="loadUsage" />
        </template>

        <p v-if="loadingUsage" class="text-sm text-secondary">Loading…</p>

        <template v-else-if="usage">
          <dl class="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div v-for="stat in [
              { label: 'Jobs', value: usage.totals.jobs },
              { label: 'Pages', value: usage.totals.pages },
              { label: 'Input tokens', value: usage.totals.inputTokens },
              { label: 'Output tokens', value: usage.totals.outputTokens },
              { label: 'Failed', value: usage.totals.failed }
            ]" :key="stat.label" class="rounded-xl surface-2 p-4">
              <dt class="text-micro uppercase tracking-wide text-tertiary">{{ stat.label }}</dt>
              <dd class="stat-number mt-1 text-2xl text-primary">{{ number(stat.value) }}</dd>
            </div>
          </dl>

          <div v-if="usage.byModel.length" class="mt-5 flex flex-wrap gap-2">
            <UiBadge v-for="row in usage.byModel" :key="row.model" tone="slate">
              {{ row.model }} · {{ number(row.jobs) }} jobs
            </UiBadge>
          </div>

          <UiEmptyState
            v-if="!usage.byTenant.length"
            class="mt-5"
            title="No scans this month"
            description="Nothing was sent to the API in this period."
          />

          <div v-else class="mt-5 overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-line text-micro uppercase tracking-wide text-tertiary">
                  <th class="py-2 text-start font-medium">Tenant</th>
                  <th class="py-2 text-end font-medium">Jobs</th>
                  <th class="py-2 text-end font-medium">Pages</th>
                  <th class="py-2 text-end font-medium">Input</th>
                  <th class="py-2 text-end font-medium">Output</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                <tr v-for="row in usage.byTenant" :key="row.tenantId">
                  <td class="py-2">
                    <NuxtLink
                      :to="`/super-admin/tenants/${row.tenantId}`"
                      class="text-primary underline underline-offset-2"
                    >
                      {{ row.tenantName || row.tenantId }}
                    </NuxtLink>
                  </td>
                  <td class="py-2 text-end font-mono-nums text-secondary">{{ number(row.jobs) }}</td>
                  <td class="py-2 text-end font-mono-nums text-secondary">{{ number(row.pages) }}</td>
                  <td class="py-2 text-end font-mono-nums text-secondary">{{ number(row.inputTokens) }}</td>
                  <td class="py-2 text-end font-mono-nums text-secondary">{{ number(row.outputTokens) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </UiCard>
    </template>
  </div>
</template>
