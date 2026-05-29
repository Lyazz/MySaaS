<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div
      class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <h2
          class="text-2xl font-semibold tracking-tight"
          style="color: var(--text-primary)"
        >
          {{ t('admin.pages.devices.title', 'Device Management') }}
        </h2>
        <p class="mt-1" style="color: var(--text-secondary)">
          {{
            t(
              'admin.pages.devices.subtitle',
              'Review tenant devices, activation capacity, and generate offline activation codes.'
            )
          }}
        </p>
      </div>

      <button
        type="button"
        class="ui-btn ui-btn--secondary text-sm"
        :disabled="devicesPending"
        @click="loadDevices"
      >
        <Icon
          name="lucide:refresh-cw"
          class="h-4 w-4"
          :class="devicesPending ? 'animate-spin' : ''"
        />
        {{ t('admin.common.refresh', 'Refresh') }}
      </button>
    </div>

    <div
      v-if="devicesError"
      class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <div class="flex items-start gap-3">
        <Icon name="lucide:triangle-alert" class="mt-0.5 h-4 w-4" />
        <div class="min-w-0">
          <p class="font-medium">Device registry unavailable</p>
          <p class="mt-1 text-red-700/80 break-words">{{ devicesError }}</p>
        </div>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="rounded-2xl p-5"
        style="
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          box-shadow: var(--card-shadow);
        "
      >
        <p
          class="text-xs font-semibold uppercase tracking-[0.18em]"
          style="color: var(--text-tertiary)"
        >
          {{ card.label }}
        </p>
        <div class="mt-3 flex items-end justify-between gap-3">
          <div>
            <p
              class="text-3xl font-semibold leading-none"
              style="color: var(--text-primary)"
            >
              {{ card.value }}
            </p>
            <p class="mt-2 text-sm" style="color: var(--text-secondary)">
              {{ card.help }}
            </p>
          </div>
          <div
            class="flex h-11 w-11 items-center justify-center rounded-xl"
            :style="card.iconWrapStyle"
          >
            <Icon
              :name="card.icon"
              class="h-5 w-5"
              :style="{ color: card.iconColor }"
            />
          </div>
        </div>
      </div>
    </div>

    <div
      class="rounded-2xl overflow-hidden"
      style="
        background: var(--surface-1);
        border: 1px solid var(--surface-border);
        box-shadow: var(--card-shadow);
      "
    >
      <div
        class="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
        style="border-bottom: 1px solid var(--surface-border)"
      >
        <div>
          <h3
            class="text-base font-semibold"
            style="color: var(--text-primary)"
          >
            Tenant Devices
          </h3>
          <p class="mt-1 text-sm" style="color: var(--text-secondary)">
            Saved devices are scoped to this tenant only. Each row shows
            activation status, workspace binding, and license capacity.
          </p>
        </div>
        <div
          class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
          style="background: var(--surface-3); color: var(--text-secondary)"
        >
          <span
            class="inline-flex h-2 w-2 rounded-full"
            :style="summaryDotStyle"
          />
          {{
            summary.mode === 'offlineOnly'
              ? 'Offline-only tenant runtime'
              : 'Hybrid tenant runtime'
          }}
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="ui-table">
          <thead class="ui-thead">
            <tr>
              <th class="ui-th">Device</th>
              <th class="ui-th">Status</th>
              <th class="ui-th">Activation</th>
              <th class="ui-th">License</th>
              <th class="ui-th">Last Sync</th>
              <th class="ui-th">Workspace</th>
              <th class="ui-th">Hardware</th>
            </tr>
          </thead>
          <tbody class="ui-tbody">
            <tr v-if="devicesPending">
              <td
                class="px-4 py-6"
                colspan="7"
                style="color: var(--text-tertiary)"
              >
                {{ t('admin.common.loading', 'Loading...') }}
              </td>
            </tr>
            <tr v-else-if="devices.length === 0">
              <td
                class="px-4 py-6"
                colspan="7"
                style="color: var(--text-tertiary)"
              >
                No devices are registered for this tenant yet.
              </td>
            </tr>
            <tr v-for="device in devices" :key="device.id" class="ui-tr">
              <td class="ui-td">
                <div class="space-y-1">
                  <p class="font-medium" style="color: var(--text-primary)">
                    {{ device.deviceName }}
                  </p>
                  <p class="text-xs" style="color: var(--text-tertiary)">
                    ID {{ shortId(device.id) }}
                  </p>
                </div>
              </td>
              <td class="ui-td">
                <div class="space-y-2">
                  <span
                    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                    :style="
                      device.status === 'ACTIVE'
                        ? 'background: rgba(52, 211, 153, 0.12); color: rgb(16, 185, 129)'
                        : 'background: rgba(148, 163, 184, 0.12); color: rgb(100, 116, 139)'
                    "
                  >
                    {{ device.status }}
                  </span>
                  <p class="text-xs" style="color: var(--text-tertiary)">
                    Updated {{ formatDateTime(device.updatedAt) }}
                  </p>
                </div>
              </td>
              <td class="ui-td">
                <div class="space-y-1">
                  <p style="color: var(--text-primary)">
                    {{ formatDateTime(device.activatedAt) }}
                  </p>
                  <p class="text-xs" style="color: var(--text-secondary)">
                    {{
                      summary.subscriptionTier === 'offlineOnly'
                        ? 'Offline activation supported'
                        : 'Hybrid activation enabled'
                    }}
                  </p>
                </div>
              </td>
              <td class="ui-td">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <code
                      class="rounded-md px-2 py-1 text-xs"
                      style="
                        background: var(--surface-3);
                        color: var(--text-primary);
                      "
                    >
                      {{ device.license.keyMasked }}
                    </code>
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                      :style="
                        device.license.isActive
                          ? 'background: rgba(52, 211, 153, 0.12); color: rgb(16, 185, 129)'
                          : 'background: rgba(248, 113, 113, 0.12); color: rgb(239, 68, 68)'
                      "
                    >
                      {{ device.license.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <p class="text-xs" style="color: var(--text-secondary)">
                    {{ device.license.activeDeviceCount }} /
                    {{ device.license.maxDevices }} slots in use
                  </p>
                  <p class="text-xs" style="color: var(--text-tertiary)">
                    {{
                      device.license.kind === 'auto'
                        ? 'Auto-created online license'
                        : 'Assigned tenant license'
                    }}
                    <span v-if="device.license.expiresAt">
                      · expires {{ formatDate(device.license.expiresAt) }}
                    </span>
                  </p>
                </div>
              </td>
              <td class="ui-td">
                <span
                  v-if="device.lastSyncAt"
                  style="color: var(--text-primary)"
                >
                  {{ formatDateTime(device.lastSyncAt) }}
                </span>
                <span v-else style="color: var(--text-tertiary)">
                  Never synced
                </span>
              </td>
              <td class="ui-td">
                <div class="flex items-center gap-2">
                  <code
                    class="rounded-md px-2 py-1 text-xs"
                    style="
                      background: var(--surface-3);
                      color: var(--text-primary);
                    "
                  >
                    {{ shortId(device.workspaceId) }}
                  </code>
                  <button
                    type="button"
                    class="ui-table-action"
                    title="Copy workspace ID"
                    @click="copyText(device.workspaceId)"
                  >
                    <Icon
                      :name="
                        copiedValue === device.workspaceId
                          ? 'lucide:check'
                          : 'lucide:copy'
                      "
                      class="h-4 w-4"
                    />
                  </button>
                </div>
              </td>
              <td class="ui-td">
                <div class="flex items-center gap-2">
                  <code
                    class="rounded-md px-2 py-1 text-xs"
                    style="
                      background: var(--surface-3);
                      color: var(--text-primary);
                    "
                  >
                    {{ device.hardwareIdMasked }}
                  </code>
                  <button
                    type="button"
                    class="ui-table-action"
                    title="Copy hardware fingerprint"
                    @click="copyText(device.hardwareId)"
                  >
                    <Icon
                      :name="
                        copiedValue === device.hardwareId
                          ? 'lucide:check'
                          : 'lucide:copy'
                      "
                      class="h-4 w-4"
                    />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      class="rounded-2xl p-6"
      style="
        background: var(--surface-1);
        border: 1px solid var(--surface-border);
        box-shadow: var(--card-shadow);
      "
    >
      <h3 class="text-base font-medium mb-4" style="color: var(--text-primary)">
        Offline Activation
      </h3>

      <div v-if="!activationCode" class="space-y-4 max-w-2xl">
        <p class="text-sm" style="color: var(--text-secondary)">
          Paste the Request Code generated by the Flutter app. The server will
          validate the tenant admin session, bind that device to this tenant,
          assign an active tenant license, and return a signed activation code.
        </p>

        <div>
          <label
            class="block text-sm font-medium mb-1.5"
            style="color: var(--text-primary)"
            >Request Code</label
          >
          <textarea
            v-model="requestCode"
            rows="3"
            class="ui-input w-full font-mono text-sm"
            placeholder="Paste the Request Code here..."
          />
        </div>

        <div v-if="activationError" class="text-sm text-red-500 font-medium">
          {{ activationError }}
        </div>

        <div class="flex justify-end pt-2">
          <button
            class="ui-btn ui-btn--primary"
            :disabled="!requestCode.trim() || activationPending"
            @click="generateActivationCode"
          >
            <Icon
              v-if="activationPending"
              name="lucide:loader-2"
              class="w-4 h-4 mr-2 animate-spin"
            />
            <Icon v-else name="lucide:key" class="w-4 h-4 mr-2" />
            Generate Activation Code
          </button>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div
          class="p-4 rounded-xl"
          style="
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
          "
        >
          <div class="flex items-center gap-3 text-emerald-600 mb-2">
            <Icon name="lucide:check-circle-2" class="w-5 h-5" />
            <span class="font-semibold"
              >Activation Code Generated Successfully</span
            >
          </div>
          <p class="text-sm" style="color: var(--text-secondary)">
            Copy the code below and paste it into the offline device. The device
            registry above will update after the device completes activation.
          </p>
        </div>

        <div class="relative mt-4">
          <textarea
            readonly
            rows="4"
            class="ui-input w-full font-mono text-sm bg-gray-50/50"
            :value="activationCode"
          />
          <button
            type="button"
            class="absolute top-3 right-3 ui-btn ui-btn--sm ui-btn--secondary"
            @click="copyText(activationCode)"
          >
            <Icon
              :name="
                copiedValue === activationCode ? 'lucide:check' : 'lucide:copy'
              "
              class="w-4 h-4"
            />
            {{ copiedValue === activationCode ? 'Copied!' : 'Copy' }}
          </button>
        </div>

        <div class="flex justify-end pt-4">
          <button
            type="button"
            class="ui-btn ui-btn--secondary"
            @click="resetActivationPanel"
          >
            Activate Another Device
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useI18n } from 'vue-i18n';

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
});

type DeviceSummary = {
  totalDevices: number;
  activeDevices: number;
  inactiveDevices: number;
  licenses: number;
  activeLicenses: number;
  capacity: number;
  mode: 'hybrid' | 'offlineOnly';
  subscriptionTier: 'online' | 'offlineOnly';
};

type TenantDevice = {
  id: string;
  workspaceId: string;
  deviceName: string;
  status: string;
  activatedAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
  hardwareId: string;
  hardwareIdMasked: string;
  license: {
    id: string;
    key: string;
    keyMasked: string;
    isActive: boolean;
    maxDevices: number;
    expiresAt: string | null;
    activeDeviceCount: number;
    totalDeviceCount: number;
    kind: 'auto' | 'assigned';
  };
};

type DevicesResponse = {
  summary: DeviceSummary;
  devices: TenantDevice[];
};

const { t } = useI18n({ useScope: 'global' });
const authStore = useAuthStore();

const devices = ref<TenantDevice[]>([]);
const summary = ref<DeviceSummary>({
  totalDevices: 0,
  activeDevices: 0,
  inactiveDevices: 0,
  licenses: 0,
  activeLicenses: 0,
  capacity: 0,
  mode: 'hybrid',
  subscriptionTier: 'online',
});
const devicesPending = ref(false);
const activationPending = ref(false);
const devicesError = ref('');
const activationError = ref('');
const requestCode = ref('');
const activationCode = ref('');
const copiedValue = ref('');

const summaryCards = computed(() => [
  {
    label: 'Registered Devices',
    value: summary.value.totalDevices,
    help: `${summary.value.activeDevices} active · ${summary.value.inactiveDevices} inactive`,
    icon: 'lucide:laptop-minimal-check',
    iconColor: 'rgb(59, 130, 246)',
    iconWrapStyle: 'background: rgba(59, 130, 246, 0.12)',
  },
  {
    label: 'Activation Capacity',
    value: summary.value.capacity,
    help: `${summary.value.activeDevices} slots currently used`,
    icon: 'lucide:gauge',
    iconColor: 'rgb(249, 115, 22)',
    iconWrapStyle: 'background: rgba(249, 115, 22, 0.12)',
  },
  {
    label: 'Licenses',
    value: summary.value.licenses,
    help: `${summary.value.activeLicenses} active license records`,
    icon: 'lucide:key-round',
    iconColor: 'rgb(16, 185, 129)',
    iconWrapStyle: 'background: rgba(16, 185, 129, 0.12)',
  },
  {
    label: 'Runtime',
    value: summary.value.mode === 'offlineOnly' ? 'Offline' : 'Hybrid',
    help:
      summary.value.subscriptionTier === 'offlineOnly'
        ? 'Storefront features stay local-only'
        : 'Online sync and remote access enabled',
    icon: 'lucide:shield-check',
    iconColor: 'rgb(168, 85, 247)',
    iconWrapStyle: 'background: rgba(168, 85, 247, 0.12)',
  },
]);

const summaryDotStyle = computed(() =>
  summary.value.mode === 'offlineOnly'
    ? 'background: rgb(249, 115, 22)'
    : 'background: rgb(16, 185, 129)'
);

function authHeader() {
  const token =
    typeof (authStore as any).token === 'string'
      ? (authStore as any).token
      : '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function loadDevices() {
  devicesPending.value = true;
  devicesError.value = '';

  try {
    const res = (await $fetch('/api/activation/devices', {
      headers: authHeader(),
    })) as DevicesResponse;
    devices.value = Array.isArray(res.devices) ? res.devices : [];
    summary.value = res.summary ?? summary.value;
  } catch (err: any) {
    devicesError.value =
      err.data?.error ||
      err.data?.statusMessage ||
      err.message ||
      'Failed to load tenant devices.';
  } finally {
    devicesPending.value = false;
  }
}

async function generateActivationCode() {
  if (!requestCode.value.trim()) return;

  activationError.value = '';
  activationPending.value = true;

  try {
    const res = (await $fetch('/api/activation/offline', {
      method: 'POST',
      headers: authHeader(),
      body: {
        requestCode: requestCode.value.trim(),
      },
    })) as { activationToken?: string };

    if (!res.activationToken) {
      activationError.value =
        'Failed to generate token. Please check your Request Code.';
      return;
    }

    activationCode.value = res.activationToken;
    await loadDevices();
  } catch (err: any) {
    activationError.value =
      err.data?.error ||
      err.data?.statusMessage ||
      err.message ||
      'An error occurred during activation.';
  } finally {
    activationPending.value = false;
  }
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
  copiedValue.value = value;
  setTimeout(() => {
    if (copiedValue.value === value) copiedValue.value = '';
  }, 2000);
}

function resetActivationPanel() {
  requestCode.value = '';
  activationCode.value = '';
  activationError.value = '';
}

function shortId(value: string) {
  return value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value;
}

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

onMounted(() => {
  loadDevices();
});
</script>
