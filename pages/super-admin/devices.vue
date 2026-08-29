<script setup lang="ts">
/**
 * Platform-wide device approval queue.
 *
 * The seat rule is "one activated device per tenant, and a second only when a
 * super admin permits it". This page is where that permission is actually
 * given -- without it the rule would only be enforceable by editing the
 * database, which is not a rule anyone can operate.
 */
import { computed, onMounted, ref } from 'vue'

definePageMeta({ layout: 'super-admin', title: 'Devices' })

const authStore = useAuthStore()

type ActivationRequest = {
  id: string
  tenantId: string
  hardwareId: string
  deviceName: string | null
  devicePlatform: string | null
  replacesDeviceId: string | null
  reason: string | null
  status: string
  createdAt: string
  decidedAt: string | null
  decisionNote: string | null
  tenant: { id: string; name: string; slug: string } | null
  license: { id: string; licenseKey: string; maxDevices: number } | null
}

const requests = ref<ActivationRequest[]>([])
const loading = ref(false)
const error = ref('')
const busyId = ref('')
const notes = ref<Record<string, string>>({})
const statusFilter = ref<'PENDING' | 'APPROVED' | 'DENIED' | ''>('PENDING')

const authHeaders = computed(() => ({
  Authorization: `Bearer ${authStore.token}`
}))

/** Never render a full hardware id or licence key. */
const mask = (value: string, visible = 6) => {
  if (!value) return ''
  if (value.length <= visible * 2) return value
  return `${value.slice(0, visible)}…${value.slice(-visible)}`
}

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : '—'

async function load() {
  loading.value = true
  error.value = ''
  try {
    const query = statusFilter.value ? `?status=${statusFilter.value}` : ''
    const res = await $fetch<{ requests: ActivationRequest[] }>(
      `/api/super-admin/activation/requests${query}`,
      { headers: authHeaders.value }
    )
    requests.value = res?.requests ?? []
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Could not load requests'
  } finally {
    loading.value = false
  }
}

async function decide(request: ActivationRequest, decision: 'approve' | 'deny') {
  busyId.value = request.id
  error.value = ''
  try {
    await $fetch(
      `/api/super-admin/activation/requests/${request.id}/${decision}`,
      {
        method: 'POST',
        headers: authHeaders.value,
        body: { note: notes.value[request.id] ?? '' }
      }
    )
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Action failed'
  } finally {
    busyId.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Device requests
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          A tenant is limited to its licensed number of devices. Approving a
          request that replaces a device frees the old seat and revokes it.
        </p>
      </div>

      <select
        v-model="statusFilter"
        class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        @change="load"
      >
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="DENIED">Denied</option>
        <option value="">All</option>
      </select>
    </div>

    <p
      v-if="error"
      class="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
    >
      {{ error }}
    </p>

    <p v-if="loading" class="text-sm text-slate-500">Loading…</p>

    <p
      v-else-if="!requests.length"
      class="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700"
    >
      Nothing waiting.
    </p>

    <div v-else class="space-y-3">
      <article
        v-for="request in requests"
        :key="request.id"
        class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-medium text-slate-900 dark:text-slate-100">
              {{ request.deviceName || 'Unnamed device' }}
              <span class="ml-2 text-xs font-normal text-slate-500">
                {{ request.devicePlatform || 'unknown' }}
              </span>
            </p>
            <p class="mt-0.5 text-sm text-slate-500">
              <NuxtLink
                v-if="request.tenant"
                :to="`/super-admin/tenants/${request.tenantId}`"
                class="underline underline-offset-2"
              >
                {{ request.tenant.name }}
              </NuxtLink>
              <span v-else>{{ request.tenantId }}</span>
              · seats: {{ request.license?.maxDevices ?? '?' }}
            </p>
            <p class="mt-1 font-mono text-xs text-slate-400">
              {{ mask(request.hardwareId) }}
            </p>
          </div>

          <span
            class="rounded-full px-2.5 py-1 text-xs font-medium"
            :class="{
              'bg-amber-100 text-amber-800': request.status === 'PENDING',
              'bg-emerald-100 text-emerald-800': request.status === 'APPROVED',
              'bg-slate-200 text-slate-700': !['PENDING', 'APPROVED'].includes(request.status)
            }"
          >
            {{ request.status }}
          </span>
        </div>

        <dl class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div v-if="request.reason">
            <dt class="text-xs uppercase tracking-wide text-slate-400">Reason</dt>
            <dd class="text-slate-700 dark:text-slate-300">{{ request.reason }}</dd>
          </div>
          <div v-if="request.replacesDeviceId">
            <dt class="text-xs uppercase tracking-wide text-slate-400">Replaces</dt>
            <dd class="font-mono text-xs text-slate-700 dark:text-slate-300">
              {{ request.replacesDeviceId }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-slate-400">Requested</dt>
            <dd class="text-slate-700 dark:text-slate-300">
              {{ formatDate(request.createdAt) }}
            </dd>
          </div>
          <div v-if="request.decidedAt">
            <dt class="text-xs uppercase tracking-wide text-slate-400">Decided</dt>
            <dd class="text-slate-700 dark:text-slate-300">
              {{ formatDate(request.decidedAt) }}
              <span v-if="request.decisionNote"> — {{ request.decisionNote }}</span>
            </dd>
          </div>
        </dl>

        <div v-if="request.status === 'PENDING'" class="mt-4 flex flex-wrap items-center gap-2">
          <input
            v-model="notes[request.id]"
            placeholder="Note (optional)"
            class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
          <button
            type="button"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            :disabled="busyId === request.id"
            @click="decide(request, 'approve')"
          >
            Approve
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            :disabled="busyId === request.id"
            @click="decide(request, 'deny')"
          >
            Deny
          </button>
        </div>
      </article>
    </div>
  </div>
</template>
