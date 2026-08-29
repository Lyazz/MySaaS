<script setup lang="ts">
/**
 * Per-tenant device and licence management, plus the migration to an online tier.
 *
 * Everything a support call needs in one place: see which terminals are live,
 * revoke a stolen one, restore a mistake, buy a shop more time when it genuinely
 * cannot get online, change the seat count, and run the offline→online import.
 */
import { computed, onMounted, ref } from 'vue'

definePageMeta({ layout: 'super-admin', title: 'Devices' })

const route = useRoute()
const authStore = useAuthStore()

const tenantId = computed(() => String(route.params.id ?? ''))
const authHeaders = computed(() => ({ Authorization: `Bearer ${authStore.token}` }))

type Device = {
  id: string
  deviceName: string
  devicePlatform: string
  status: string
  tokenVersion: number
  hardwareIdMasked: string
  licenseExpiresAt: string | null
  graceUntil: string | null
  lastSeenAt: string | null
  lastSyncAt: string | null
  appVersion: string | null
  revokedAt: string | null
  revokedReason: string | null
  drainUntil: string | null
  license: {
    id: string
    keyMasked: string
    isActive: boolean
    maxDevices: number
    activeDeviceCount: number
    expiresAt: string | null
  }
}

const devices = ref<Device[]>([])
const summary = ref<Record<string, unknown> | null>(null)
const loading = ref(false)
const error = ref('')
const notice = ref('')
const busyId = ref('')

const seatForm = ref({ maxDevices: 1, offlineValidityDays: 30, graceDays: 7 })
const licenseId = computed(() => devices.value[0]?.license.id ?? '')

// Migration
const migrationJobId = ref('')
const migrationReport = ref<any>(null)
const migrationBusy = ref(false)

const fmt = (value: string | null) =>
  value ? new Date(value).toLocaleString() : '—'

/** Whether a device is inside its window, in grace, or read-only right now. */
const licenceState = (device: Device) => {
  if (device.status !== 'ACTIVE') return 'revoked'
  const now = Date.now()
  const expires = device.licenseExpiresAt ? new Date(device.licenseExpiresAt).getTime() : 0
  const grace = device.graceUntil ? new Date(device.graceUntil).getTime() : 0
  if (now < expires) return 'active'
  if (now < grace) return 'grace'
  return 'read-only'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ summary: any; devices: Device[] }>(
      `/api/super-admin/activation/tenants/${tenantId.value}/devices`,
      { headers: authHeaders.value }
    )
    devices.value = res?.devices ?? []
    summary.value = res?.summary ?? null

    const first = devices.value[0]?.license
    if (first) {
      seatForm.value.maxDevices = first.maxDevices
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Could not load devices'
  } finally {
    loading.value = false
  }
}

async function act(device: Device, action: 'revoke' | 'restore' | 'extend-grace') {
  busyId.value = device.id
  error.value = ''
  notice.value = ''

  try {
    const body: Record<string, unknown> = {}

    if (action === 'revoke') {
      const reason = window.prompt('Why is this device being deactivated?')
      if (!reason?.trim()) {
        busyId.value = ''
        return
      }
      body.reason = reason.trim()
    }

    if (action === 'extend-grace') {
      const days = Number(window.prompt('Extend read-only date by how many days?', '30'))
      if (!Number.isInteger(days) || days < 1) {
        busyId.value = ''
        return
      }
      body.days = days
    }

    await $fetch(
      `/api/super-admin/activation/tenants/${tenantId.value}/devices/${device.id}/${action}`,
      { method: 'POST', headers: authHeaders.value, body }
    )
    notice.value = 'Done.'
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Action failed'
  } finally {
    busyId.value = ''
  }
}

async function saveLicence() {
  if (!licenseId.value) return
  error.value = ''
  notice.value = ''

  try {
    await $fetch(
      `/api/super-admin/activation/tenants/${tenantId.value}/licenses/${licenseId.value}`,
      { method: 'PATCH', headers: authHeaders.value, body: { ...seatForm.value } }
    )
    notice.value = 'Licence updated.'
    await load()
  } catch (e: any) {
    // The server refuses to cut seats below the devices already running, rather
    // than silently deciding which live terminal stops working.
    error.value = e?.data?.statusMessage || e?.message || 'Could not update the licence'
  }
}

const migrationFile = ref<File | null>(null)

function onMigrationFile(event: Event) {
  const input = event.target as HTMLInputElement
  migrationFile.value = input.files?.[0] ?? null
  migrationReport.value = null
}

/**
 * Opens a job and pushes the tenant's export into it.
 *
 * The device produces the file rather than uploading directly, because these
 * endpoints are super-admin only -- that is what stops a staff account from
 * moving its own tenant onto a paid tier. It also fits the situation: a tenant
 * on the offline-only tier may have no usable connection at all.
 */
async function uploadExport() {
  const file = migrationFile.value
  if (!file) return

  migrationBusy.value = true
  error.value = ''
  notice.value = ''
  migrationReport.value = null

  try {
    const parsed = JSON.parse(await file.text())
    const batches = Array.isArray(parsed?.batches) ? parsed.batches : []

    if (!batches.length) {
      error.value = 'That file contains no data to import.'
      return
    }

    const opened = await $fetch<any>(
      `/api/super-admin/tenants/${tenantId.value}/migration`,
      {
        method: 'POST',
        headers: authHeaders.value,
        body: {
          declaredCounts: parsed?.declaredCounts ?? {},
          deviceId: parsed?.deviceId ?? undefined
        }
      }
    )

    migrationJobId.value = opened?.job?.id ?? ''

    for (const batch of batches) {
      await $fetch(
        `/api/super-admin/tenants/${tenantId.value}/migration/${migrationJobId.value}/batch`,
        {
          method: 'POST',
          headers: authHeaders.value,
          body: { domain: batch.domain, rows: batch.rows }
        }
      )
    }

    notice.value = `Uploaded ${batches.length} batch(es). Run the dry run next.`
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Upload failed'
  } finally {
    migrationBusy.value = false
  }
}

async function migration(step: 'validate' | 'apply') {
  if (!migrationJobId.value) return

  migrationBusy.value = true
  error.value = ''
  notice.value = ''

  try {
    const res = await $fetch<any>(
      `/api/super-admin/tenants/${tenantId.value}/migration/${migrationJobId.value}/${step}`,
      { method: 'POST', headers: authHeaders.value, body: {} }
    )

    if (step === 'validate') {
      migrationReport.value = res
    } else {
      notice.value = 'Migration applied. The tenant is now on an online tier.'
      migrationReport.value = null
      await load()
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Migration step failed'
  } finally {
    migrationBusy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <NuxtLink :to="`/super-admin/tenants/${tenantId}`" class="text-sm underline underline-offset-2">
        ← Back to tenant
      </NuxtLink>
    </div>

    <h1 class="text-xl font-semibold text-slate-900">Devices &amp; licence</h1>

    <p v-if="error" class="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ error }}</p>
    <p v-if="notice" class="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ notice }}</p>
    <p v-if="loading" class="text-sm text-slate-500">Loading…</p>

    <!-- Devices -->
    <section v-if="!loading" class="space-y-3">
      <p v-if="!devices.length" class="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
        This tenant has no activated devices.
      </p>

      <article
        v-for="device in devices"
        :key="device.id"
        class="rounded-xl border border-slate-200 bg-white p-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-medium text-slate-900">
              {{ device.deviceName }}
              <span class="ml-2 text-xs font-normal text-slate-500">{{ device.devicePlatform }}</span>
            </p>
            <p class="mt-0.5 font-mono text-xs text-slate-400">{{ device.hardwareIdMasked }}</p>
          </div>

          <span
            class="rounded-full px-2.5 py-1 text-xs font-medium"
            :class="{
              'bg-emerald-100 text-emerald-800': licenceState(device) === 'active',
              'bg-amber-100 text-amber-800': licenceState(device) === 'grace',
              'bg-slate-200 text-slate-700': licenceState(device) === 'read-only',
              'bg-rose-100 text-rose-800': licenceState(device) === 'revoked'
            }"
          >
            {{ licenceState(device) }}
          </span>
        </div>

        <dl class="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-xs uppercase tracking-wide text-slate-400">Licence expires</dt>
            <dd>{{ fmt(device.licenseExpiresAt) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-slate-400">Read-only after</dt>
            <dd>{{ fmt(device.graceUntil) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-slate-400">Last seen</dt>
            <dd>{{ fmt(device.lastSeenAt) }}<span v-if="device.appVersion"> · v{{ device.appVersion }}</span></dd>
          </div>
          <div v-if="device.revokedReason" class="sm:col-span-3">
            <dt class="text-xs uppercase tracking-wide text-slate-400">Deactivated</dt>
            <dd>{{ device.revokedReason }} ({{ fmt(device.revokedAt) }})</dd>
          </div>
          <div v-if="device.drainUntil" class="sm:col-span-3">
            <dt class="text-xs uppercase tracking-wide text-slate-400">Still syncing until</dt>
            <dd>{{ fmt(device.drainUntil) }} — queued offline work can still reach the server</dd>
          </div>
        </dl>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-if="device.status === 'ACTIVE'"
            type="button"
            class="rounded-lg border border-rose-300 px-3 py-1.5 text-sm text-rose-700 disabled:opacity-50"
            :disabled="busyId === device.id"
            @click="act(device, 'revoke')"
          >
            Deactivate
          </button>
          <button
            v-else
            type="button"
            class="rounded-lg border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 disabled:opacity-50"
            :disabled="busyId === device.id"
            @click="act(device, 'restore')"
          >
            Reactivate
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
            :disabled="busyId === device.id"
            @click="act(device, 'extend-grace')"
          >
            Extend read-only date
          </button>
        </div>
      </article>
    </section>

    <!-- Licence settings -->
    <section v-if="licenseId" class="rounded-xl border border-slate-200 bg-white p-4">
      <h2 class="font-medium text-slate-900">Licence</h2>
      <p class="mt-1 text-sm text-slate-500">
        Seats cannot be cut below the devices already running — deactivate one first.
      </p>

      <div class="mt-3 flex flex-wrap items-end gap-3">
        <label class="text-sm">
          <span class="block text-slate-500 mb-1">Devices allowed</span>
          <input v-model.number="seatForm.maxDevices" type="number" min="1" class="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm">
        </label>
        <label class="text-sm">
          <span class="block text-slate-500 mb-1">Offline days</span>
          <input v-model.number="seatForm.offlineValidityDays" type="number" min="0" class="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm">
        </label>
        <label class="text-sm">
          <span class="block text-slate-500 mb-1">Grace days</span>
          <input v-model.number="seatForm.graceDays" type="number" min="0" class="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm">
        </label>
        <button type="button" class="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white" @click="saveLicence">
          Save
        </button>
      </div>
    </section>

    <!-- Migration -->
    <section class="rounded-xl border border-slate-200 bg-white p-4">
      <h2 class="font-medium text-slate-900">Move to an online tier</h2>
      <p class="mt-1 text-sm text-slate-500">
        The tenant exports their data from the app ("Move to an online plan"),
        then you upload that file here, check the dry run, and apply. The tier
        flips only if everything lands.
      </p>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="application/json,.json"
          class="text-sm"
          @change="onMigrationFile"
        >
        <button type="button" class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50" :disabled="migrationBusy || !migrationFile" @click="uploadExport">
          1 · Upload export
        </button>
        <button type="button" class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50" :disabled="migrationBusy || !migrationJobId" @click="migration('validate')">
          2 · Dry run
        </button>
        <button type="button" class="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50" :disabled="migrationBusy || !migrationReport?.ready" @click="migration('apply')">
          3 · Apply
        </button>
      </div>

      <p v-if="migrationJobId" class="mt-2 font-mono text-xs text-slate-400">
        job {{ migrationJobId }}
      </p>

      <div v-if="migrationReport" class="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
        <p class="font-medium">
          {{ migrationReport.ready ? 'Ready to apply.' : 'Not ready.' }}
        </p>
        <ul v-if="migrationReport.problems?.length" class="mt-2 list-disc pl-5 text-rose-700">
          <li v-for="problem in migrationReport.problems" :key="problem">{{ problem }}</li>
        </ul>
        <pre class="mt-2 overflow-x-auto text-xs text-slate-600">{{ JSON.stringify(migrationReport.counts, null, 2) }}</pre>
      </div>
    </section>
  </div>
</template>
