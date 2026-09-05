import { randomBytes } from 'node:crypto';

import { Prisma, PrismaClient } from '@prisma/client';

import {
  signActivationToken,
  verifyActivationToken,
  type ActivationTokenPayloadV2,
} from '../../lib/activation-token';
import { logAction } from '../../lib/audit';
import { computeLicenseWindow } from '../../lib/license-window';
import { resolveTenantRuntime } from '../../lib/tenant-runtime';

const prisma = new PrismaClient();

/**
 * A refusal the caller can map to an HTTP status and a stable `code`.
 *
 * The device seat rules are the product, not an internal detail: the Flutter app
 * branches on these codes to decide between "ask an admin for access", "this
 * device was revoked" and "your subscription lapsed". Bare `Error` strings could
 * not carry that.
 */
export class ActivationError extends Error {
  constructor(
    public readonly code: ActivationErrorCode,
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ActivationError';
  }
}

export type ActivationErrorCode =
  | 'TENANT_NOT_FOUND'
  | 'TENANT_SUSPENDED'
  | 'LICENSE_INVALID'
  | 'LICENSE_FOREIGN'
  | 'LICENSE_EXPIRED'
  | 'LICENSE_INACTIVE'
  | 'DEVICE_LIMIT_REACHED'
  | 'DEVICE_REVOKED'
  | 'INVALID_REQUEST_CODE'
  | 'ACTIVATION_TOKEN_INVALID'
  | 'HARDWARE_MISMATCH'
  | 'DEVICE_UNKNOWN'
  | 'TOKEN_SUPERSEDED';

const maskValue = (value: string, visible = 6) => {
  if (!value) return '';
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
};

type OfflineRequestPayload = {
  hardwareId: string;
  deviceName?: string;
  devicePlatform?: string;
  licenseKey?: string;
};

const normalizeDevicePlatform = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();

  return [
    'macos',
    'windows',
    'android',
    'ios',
    'linux',
    'unknown',
  ].includes(normalized)
    ? normalized
    : null;
};

type LicenseWithDevices = Prisma.LicenseGetPayload<{ include: { devices: true } }>;

type SeatClaim = {
  device: Prisma.DeviceGetPayload<Record<string, never>>;
  activationToken: string;
};

export class ActivationService {
  async listDevices(tenantId: string) {
    const [tenant, licenses, devices] = await prisma.$transaction([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, isOffline: true, isSuspended: true },
      }),
      prisma.license.findMany({
        where: { tenantId },
        orderBy: [{ createdAt: 'asc' }],
        select: {
          id: true,
          licenseKey: true,
          maxDevices: true,
          isActive: true,
          expiresAt: true,
          offlineValidityDays: true,
          graceDays: true,
          devices: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
      prisma.device.findMany({
        where: { tenantId },
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          tenantId: true,
          hardwareId: true,
          deviceName: true,
          devicePlatform: true,
          status: true,
          tokenVersion: true,
          licenseExpiresAt: true,
          graceUntil: true,
          lastSyncAt: true,
          lastSeenAt: true,
          appVersion: true,
          revokedAt: true,
          revokedReason: true,
          drainUntil: true,
          createdAt: true,
          updatedAt: true,
          license: {
            select: {
              id: true,
              licenseKey: true,
              maxDevices: true,
              isActive: true,
              expiresAt: true,
            },
          },
        },
      }),
    ]);

    if (!tenant) {
      throw new ActivationError('TENANT_NOT_FOUND', 'Tenant not found', 404);
    }

    const licenseStats = new Map(
      licenses.map((license) => [
        license.id,
        {
          activeDeviceCount: license.devices.filter(
            (d) => d.status === 'ACTIVE'
          ).length,
          totalDeviceCount: license.devices.length,
        },
      ])
    );

    const summary = {
      totalDevices: devices.length,
      activeDevices: devices.filter((device) => device.status === 'ACTIVE')
        .length,
      inactiveDevices: devices.filter((device) => device.status !== 'ACTIVE')
        .length,
      licenses: licenses.length,
      activeLicenses: licenses.filter((license) => license.isActive).length,
      capacity: licenses.reduce((sum, license) => sum + license.maxDevices, 0),
      mode: tenant.isOffline ? 'offlineOnly' : 'hybrid',
      subscriptionTier: tenant.isOffline ? 'offlineOnly' : 'online',
    };

    return {
      summary,
      devices: devices.map((device) => {
        const stats = licenseStats.get(device.license.id) ?? {
          activeDeviceCount: 0,
          totalDeviceCount: 0,
        };

        return {
          id: device.id,
          workspaceId: device.id,
          deviceName: device.deviceName?.trim() || 'Unnamed Device',
          devicePlatform:
            normalizeDevicePlatform(device.devicePlatform) ?? 'unknown',
          status: device.status,
          tokenVersion: device.tokenVersion,
          licenseExpiresAt: device.licenseExpiresAt,
          graceUntil: device.graceUntil,
          activatedAt: device.createdAt,
          updatedAt: device.updatedAt,
          lastSyncAt: device.lastSyncAt,
          lastSeenAt: device.lastSeenAt,
          appVersion: device.appVersion,
          revokedAt: device.revokedAt,
          revokedReason: device.revokedReason,
          drainUntil: device.drainUntil,
          hardwareId: device.hardwareId,
          hardwareIdMasked: maskValue(device.hardwareId),
          license: {
            id: device.license.id,
            key: device.license.licenseKey,
            keyMasked: maskValue(device.license.licenseKey),
            isActive: device.license.isActive,
            maxDevices: device.license.maxDevices,
            expiresAt: device.license.expiresAt,
            activeDeviceCount: stats.activeDeviceCount,
            totalDeviceCount: stats.totalDeviceCount,
            kind:
              device.license.licenseKey.startsWith('LIC-ON-') ||
              device.license.licenseKey.startsWith('LIC-AUTO-')
              ? 'auto'
              : 'assigned',
          },
        };
      }),
    };
  }

  private decodeOfflineRequestCode(requestCode: string): OfflineRequestPayload {
    const decoded = Buffer.from(requestCode, 'base64').toString('utf-8').trim();

    if (!decoded) {
      throw new ActivationError(
        'INVALID_REQUEST_CODE',
        'Invalid Request Code format',
        400
      );
    }

    if (decoded.startsWith('{')) {
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      const hardwareId =
        typeof parsed.hardwareId === 'string' ? parsed.hardwareId.trim() : '';
      const deviceName =
        typeof parsed.deviceName === 'string' ? parsed.deviceName.trim() : '';
      const devicePlatform = normalizeDevicePlatform(parsed.devicePlatform);
      const licenseKey =
        typeof parsed.licenseKey === 'string' ? parsed.licenseKey.trim() : '';

      if (!hardwareId) {
        throw new ActivationError(
          'INVALID_REQUEST_CODE',
          'Invalid Request Code format',
          400
        );
      }

      return {
        hardwareId,
        deviceName: deviceName || undefined,
        devicePlatform: devicePlatform || undefined,
        licenseKey: licenseKey || undefined,
      };
    }

    const [licenseKey, hardwareId] = decoded.split(':');

    if (!licenseKey || !hardwareId) {
      throw new ActivationError(
        'INVALID_REQUEST_CODE',
        'Invalid Request Code format',
        400
      );
    }

    return {
      hardwareId: hardwareId.trim(),
      devicePlatform: undefined,
      licenseKey: licenseKey.trim(),
    };
  }

  private async ensureTenantLicense(
    tx: Prisma.TransactionClient,
    tenantId: string,
    keyPrefix: 'LIC-AUTO' | 'LIC-ON' = 'LIC-AUTO'
  ): Promise<LicenseWithDevices> {
    const license = await tx.license.findFirst({
      where: { tenantId, isActive: true },
      include: { devices: true },
      orderBy: { createdAt: 'asc' },
    });

    if (license) return license;

    const randomPart = randomBytes(8).toString('hex').toUpperCase();
    return tx.license.create({
      data: {
        tenantId,
        licenseKey: `${keyPrefix}-${randomPart}`,
        maxDevices: 1,
      },
      include: { devices: true },
    });
  }

  /**
   * The single place a device may take or keep a seat on a license.
   *
   * Every activation path funnels through here -- online key entry, the offline
   * request code, and auto-registration at login. They used to be three
   * near-identical copies, which is how the seat rules drifted apart and how the
   * window stamping would have drifted next.
   *
   * Callers must run this inside a Serializable transaction: the seat count is a
   * read-then-write, and two devices activating at the same instant would
   * otherwise both see a free seat.
   */
  private async claimSeat(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      license: LicenseWithDevices;
      hardwareId: string;
      deviceName?: string;
      devicePlatform?: string;
    }
  ) {
    const { license, hardwareId } = input;
    const platform = normalizeDevicePlatform(input.devicePlatform);

    // Matching on hardwareId is what keeps `workspaceId` (== device.id) stable
    // across re-activations. If this ever returned a new row for the same
    // hardware, the client would derive a new local database directory and
    // silently orphan the tenant's offline data.
    const existing = license.devices.find((d) => d.hardwareId === hardwareId);

    if (!existing) {
      const activeDevices = license.devices.filter(
        (d) => d.status === 'ACTIVE'
      ).length;

      if (activeDevices >= license.maxDevices) {
        throw new ActivationError(
          'DEVICE_LIMIT_REACHED',
          `Activation limit reached. Maximum ${license.maxDevices} device(s) allowed.`,
          409,
          {
            canRequestAccess: true,
            maxDevices: license.maxDevices,
            activeDevices,
            hardwareId,
            deviceName: input.deviceName ?? null,
          }
        );
      }

      return tx.device.create({
        data: {
          tenantId: input.tenantId,
          licenseId: license.id,
          hardwareId,
          deviceName: input.deviceName || 'Unknown Device',
          devicePlatform: platform,
        },
      });
    }

    if (existing.status !== 'ACTIVE') {
      throw new ActivationError(
        'DEVICE_REVOKED',
        'This device has been revoked.',
        403,
        { revokedReason: existing.revokedReason ?? null }
      );
    }

    if (platform && existing.devicePlatform !== platform) {
      return tx.device.update({
        where: { id: existing.id },
        data: {
          devicePlatform: platform,
          deviceName: input.deviceName || existing.deviceName,
        },
      });
    }

    return existing;
  }

  /**
   * Computes the offline window for a device and bakes it into a signed token.
   *
   * This is the only place a license window is stamped, so the 30-day/7-day rule
   * and the trial clamp cannot diverge between activation paths.
   */
  private async mintActivationToken(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      isOffline: boolean;
      license: Pick<
        LicenseWithDevices,
        'id' | 'licenseKey' | 'maxDevices' | 'expiresAt' | 'offlineValidityDays' | 'graceDays'
      >;
      device: Prisma.DeviceGetPayload<Record<string, never>>;
      now: Date;
    }
  ): Promise<SeatClaim> {
    const subscription = await tx.tenantSubscription.findUnique({
      where: { tenantId: input.tenantId },
      select: {
        planCode: true,
        status: true,
        trialEnd: true,
        currentPeriodEnd: true,
      },
    });

    const window = computeLicenseWindow({
      now: input.now,
      offlineValidityDays: input.license.offlineValidityDays,
      graceDays: input.license.graceDays,
      licenseExpiresAt: input.license.expiresAt,
      subscriptionStatus: subscription?.status ?? null,
      trialEnd: subscription?.trialEnd ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    });

    // Mirror the window server-side so the super-admin panel can show what the
    // device believes without having to ask it.
    const device = await tx.device.update({
      where: { id: input.device.id },
      data: {
        licenseExpiresAt: window.licenseExpiresAt,
        graceUntil: window.graceUntil,
        lastSeenAt: input.now,
      },
    });

    // Single source for the runtime mode: a TRIALING tenant reads as online
    // regardless of `isOffline`, which the old boolean could not express.
    const { mode, subscriptionTier } = resolveTenantRuntime(
      { isOffline: input.isOffline },
      subscription,
      input.now
    );

    const payload: ActivationTokenPayloadV2 = {
      v: 2,
      tenantId: input.tenantId,
      workspaceId: device.id,
      deviceId: device.id,
      hardwareId: device.hardwareId,
      mode,
      subscriptionTier,
      licenseId: input.license.id,
      licenseKey: input.license.licenseKey,
      tokenVersion: device.tokenVersion,
      maxDevices: input.license.maxDevices,
      planCode: subscription?.planCode ?? 'basic',
      subscriptionStatus: subscription?.status ?? 'ACTIVE',
      trialEnd: subscription?.trialEnd?.toISOString() ?? null,
      licenseExpiresAt: window.licenseExpiresAt.toISOString(),
      graceUntil: window.graceUntil.toISOString(),
      issuedAt: input.now.toISOString(),
    };

    return { device, activationToken: signActivationToken(payload) };
  }

  private async assertTenantUsable(
    tx: Prisma.TransactionClient,
    tenantId: string
  ) {
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, isOffline: true, isSuspended: true },
    });

    if (!tenant) {
      throw new ActivationError('TENANT_NOT_FOUND', 'Tenant not found', 404);
    }
    if (tenant.isSuspended) {
      throw new ActivationError(
        'TENANT_SUSPENDED',
        'Tenant is suspended',
        403
      );
    }

    return tenant;
  }

  /**
   * Activates a device against an explicitly supplied license key.
   */
  async activateDevice(
    tenantId: string | undefined,
    licenseKey: string,
    hardwareId: string,
    deviceName?: string,
    devicePlatform?: string
  ) {
    const now = new Date();

    return prisma.$transaction(
      async (tx) => {
        const license = await tx.license.findUnique({
          where: { licenseKey },
          include: {
            devices: true,
            tenant: {
              select: { id: true, isOffline: true, isSuspended: true },
            },
          },
        });

        if (!license || !license.isActive) {
          throw new ActivationError(
            'LICENSE_INVALID',
            'Invalid or inactive License Key',
            400
          );
        }

        if (tenantId && license.tenantId !== tenantId) {
          throw new ActivationError(
            'LICENSE_FOREIGN',
            'This license does not belong to the current workspace.',
            403
          );
        }

        if (license.tenant.isSuspended) {
          throw new ActivationError(
            'TENANT_SUSPENDED',
            'Tenant is suspended',
            403
          );
        }

        if (license.expiresAt && license.expiresAt < now) {
          throw new ActivationError(
            'LICENSE_EXPIRED',
            'License has expired',
            403
          );
        }

        const device = await this.claimSeat(tx, {
          tenantId: license.tenantId,
          license,
          hardwareId,
          deviceName,
          devicePlatform,
        });

        const { activationToken } = await this.mintActivationToken(tx, {
          tenantId: license.tenantId,
          isOffline: license.tenant.isOffline,
          license,
          device,
          now,
        });

        return {
          message: 'Device activated successfully',
          device,
          activationToken,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  /**
   * Processes an offline activation request.
   * requestCode is a base64 encoded string.
   * Supported formats:
   * - Legacy: base64(`${licenseKey}:${hardwareId}`)
   * - Current: base64(JSON.stringify({ hardwareId, deviceName, devicePlatform }))
   */
  async offlineActivate(tenantId: string, requestCode: string) {
    const payload = this.decodeOfflineRequestCode(requestCode);

    if (payload.licenseKey) {
      return this.activateDevice(
        tenantId,
        payload.licenseKey,
        payload.hardwareId,
        payload.deviceName || 'Offline Device',
        payload.devicePlatform
      );
    }

    const now = new Date();

    return prisma.$transaction(
      async (tx) => {
        const tenant = await this.assertTenantUsable(tx, tenantId);
        const license = await this.ensureTenantLicense(tx, tenantId);

        const device = await this.claimSeat(tx, {
          tenantId,
          license,
          hardwareId: payload.hardwareId,
          deviceName: payload.deviceName || 'Offline Device',
          devicePlatform: payload.devicePlatform,
        });

        const { activationToken } = await this.mintActivationToken(tx, {
          tenantId,
          isOffline: tenant.isOffline,
          license,
          device,
          now,
        });

        return {
          message: 'Device activated successfully',
          device,
          activationToken,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  /**
   * Registers or re-recognises a device during a normal online login.
   *
   * This is the path that enforces "one activated device per tenant" for the
   * common case: the first device claims the only seat, and the second is
   * refused with DEVICE_LIMIT_REACHED. Login must surface that refusal rather
   * than swallow it.
   */
  async autoRegisterOrLoginDevice(
    tenantId: string,
    hardwareId: string,
    deviceName?: string,
    devicePlatform?: string
  ) {
    const now = new Date();

    return prisma.$transaction(
      async (tx) => {
        const tenant = await this.assertTenantUsable(tx, tenantId);
        const license = await this.ensureTenantLicense(tx, tenantId, 'LIC-ON');

        const device = await this.claimSeat(tx, {
          tenantId,
          license,
          hardwareId,
          deviceName: deviceName || 'Online POS Device',
          devicePlatform,
        });

        const { activationToken } = await this.mintActivationToken(tx, {
          tenantId,
          isOffline: tenant.isOffline,
          license,
          device,
          now,
        });

        return {
          message: 'Device auto-registered successfully',
          device,
          activationToken,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  /**
   * Records a device asking for a seat it could not claim itself.
   *
   * Naturally idempotent: a partial unique index allows one PENDING row per
   * (tenant, hardware), so a device retrying after a dropped connection updates
   * its request instead of filling the super admin's queue with duplicates.
   */
  async createActivationRequest(input: {
    tenantId: string;
    hardwareId: string;
    deviceName?: string;
    devicePlatform?: string;
    replacesDeviceId?: string;
    requestedByUserId?: string;
    reason?: string;
  }) {
    const now = new Date();

    return prisma.$transaction(
      async (tx) => {
        await this.assertTenantUsable(tx, input.tenantId);
        const license = await this.ensureTenantLicense(tx, input.tenantId);

        const existing = await tx.deviceActivationRequest.findFirst({
          where: {
            tenantId: input.tenantId,
            hardwareId: input.hardwareId,
            status: 'PENDING',
          },
        });

        const data = {
          deviceName: input.deviceName?.trim() || null,
          devicePlatform: normalizeDevicePlatform(input.devicePlatform),
          replacesDeviceId: input.replacesDeviceId?.trim() || null,
          requestedByUserId: input.requestedByUserId ?? null,
          reason: input.reason?.trim() || null,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        };

        const request = existing
          ? await tx.deviceActivationRequest.update({
              where: { id: existing.id },
              data,
            })
          : await tx.deviceActivationRequest.create({
              data: {
                ...data,
                tenantId: input.tenantId,
                licenseId: license.id,
                hardwareId: input.hardwareId,
              },
            });

        // The claim code is never echoed here -- only the decision is.
        return {
          id: request.id,
          status: request.status,
          createdAt: request.createdAt,
          decidedAt: request.decidedAt,
          decisionNote: request.decisionNote,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  /**
   * Lets a waiting device poll for a decision.
   *
   * Keyed by request id *and* hardware id, so knowing an id is not enough to
   * read someone else's request or to discover a claim code.
   */
  async getActivationRequest(requestId: string, hardwareId: string) {
    const request = await prisma.deviceActivationRequest.findFirst({
      where: { id: requestId, hardwareId },
      select: {
        id: true,
        status: true,
        decidedAt: true,
        decisionNote: true,
        expiresAt: true,
        claimCode: true,
      },
    });

    if (!request) {
      throw new ActivationError(
        'DEVICE_UNKNOWN',
        'Activation request not found',
        404
      );
    }

    return {
      id: request.id,
      status: request.status,
      decidedAt: request.decidedAt,
      decisionNote: request.decisionNote,
      // Handed over only once approved, and only to the hardware that asked.
      claimCode: request.status === 'APPROVED' ? request.claimCode : null,
    };
  }

  /**
   * Exchanges an approved claim code for a real licence, exactly once.
   */
  async claimApprovedRequest(claimCode: string, hardwareId: string) {
    const now = new Date();

    return prisma.$transaction(
      async (tx) => {
        const request = await tx.deviceActivationRequest.findUnique({
          where: { claimCode },
        });

        if (!request || request.hardwareId !== hardwareId) {
          throw new ActivationError(
            'INVALID_REQUEST_CODE',
            'Invalid claim code',
            404
          );
        }

        if (request.status !== 'APPROVED' || request.claimedAt) {
          throw new ActivationError(
            'INVALID_REQUEST_CODE',
            'This claim code has already been used',
            409
          );
        }

        if (request.expiresAt < now) {
          await tx.deviceActivationRequest.update({
            where: { id: request.id },
            data: { status: 'EXPIRED' },
          });
          throw new ActivationError(
            'INVALID_REQUEST_CODE',
            'This claim code has expired',
            410
          );
        }

        const tenant = await this.assertTenantUsable(tx, request.tenantId);
        const license = await tx.license.findUniqueOrThrow({
          where: { id: request.licenseId },
          include: { devices: true },
        });

        const device = await this.claimSeat(tx, {
          tenantId: request.tenantId,
          license,
          hardwareId,
          deviceName: request.deviceName ?? undefined,
          devicePlatform: request.devicePlatform ?? undefined,
        });

        const { activationToken } = await this.mintActivationToken(tx, {
          tenantId: request.tenantId,
          isOffline: tenant.isOffline,
          license,
          device,
          now,
        });

        // Burned in the same transaction that hands out the licence, so a
        // replayed claim cannot produce a second one.
        await tx.deviceActivationRequest.update({
          where: { id: request.id },
          data: { claimedAt: now, claimCode: null },
        });

        return {
          message: 'Device activated successfully',
          device,
          activationToken,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  /**
   * Renews a device's offline window, and is the channel through which a
   * revocation reaches a device that is otherwise never asked anything.
   *
   * Authenticated by the activation token alone -- no user session. A terminal
   * that has fallen into read-only, or one sitting unattended on a counter, has
   * nobody logged in, and that is exactly when it most needs to re-validate.
   */
  async heartbeat(input: {
    activationToken: string;
    hardwareId: string;
    appVersion?: string;
  }) {
    let payload: ReturnType<typeof verifyActivationToken>;

    try {
      // The previous signing key is honoured here, and only here, so a key
      // rotation does not strand devices that have not checked in yet. It is
      // never proof of a seat: the Device row is re-read and must be ACTIVE.
      payload = verifyActivationToken(input.activationToken, {
        allowPreviousKey: true,
      });
    } catch {
      throw new ActivationError(
        'ACTIVATION_TOKEN_INVALID',
        'Activation token is invalid or unreadable',
        401
      );
    }

    if (payload.hardwareId !== input.hardwareId.trim()) {
      throw new ActivationError(
        'HARDWARE_MISMATCH',
        'This activation token belongs to a different device',
        403
      );
    }

    if (payload.signingKeyUsed === 'previous') {
      await logAction({
        action: 'ACTIVATION_LEGACY_KEY_USED',
        details: `Device ${payload.deviceId} presented a token signed with the previous activation key`,
        targetId: payload.deviceId,
        tenantId: payload.tenantId,
      });
    }

    const now = new Date();

    return prisma.$transaction(
      async (tx) => {
        const device = await tx.device.findFirst({
          where: {
            id: payload.deviceId,
            tenantId: payload.tenantId,
            hardwareId: payload.hardwareId,
          },
          include: { license: true },
        });

        if (!device) {
          throw new ActivationError(
            'DEVICE_UNKNOWN',
            'This device is no longer registered',
            404
          );
        }

        // A transfer or a forced re-activation bumps tokenVersion, which retires
        // every token minted before it without needing a blocklist. v1 tokens
        // carry no version, so they are exempt -- they are replaced below.
        if (
          payload.tokenSchemaVersion === 2 &&
          payload.tokenVersion !== device.tokenVersion
        ) {
          throw new ActivationError(
            'TOKEN_SUPERSEDED',
            'This device was re-activated elsewhere',
            409
          );
        }

        if (device.status !== 'ACTIVE') {
          throw new ActivationError(
            'DEVICE_REVOKED',
            'This device has been revoked.',
            403,
            {
              revokedReason: device.revokedReason ?? null,
              revokedAt: device.revokedAt ?? null,
            }
          );
        }

        const tenant = await this.assertTenantUsable(tx, payload.tenantId);

        if (!device.license.isActive) {
          throw new ActivationError(
            'LICENSE_INACTIVE',
            'This licence is no longer active',
            403
          );
        }

        if (device.license.expiresAt && device.license.expiresAt < now) {
          throw new ActivationError(
            'LICENSE_EXPIRED',
            'License has expired',
            403
          );
        }

        const minted = await this.mintActivationToken(tx, {
          tenantId: payload.tenantId,
          isOffline: tenant.isOffline,
          license: device.license,
          device,
          now,
        });

        await tx.device.update({
          where: { id: device.id },
          data: { appVersion: input.appVersion?.trim() || device.appVersion },
        });

        const [activeDevices, subscription, pendingRequest] = await Promise.all([
          tx.device.count({
            where: { licenseId: device.licenseId, status: 'ACTIVE' },
          }),
          tx.tenantSubscription.findUnique({
            where: { tenantId: payload.tenantId },
            select: { status: true, planCode: true, trialEnd: true },
          }),
          tx.deviceActivationRequest.findFirst({
            where: { tenantId: payload.tenantId, hardwareId: payload.hardwareId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, status: true },
          }),
        ]);

        return {
          activationToken: minted.activationToken,
          // Authoritative clock. The client uses it to advance its monotonic
          // high-water mark, so a rolled-back device clock cannot buy time.
          serverTime: now.toISOString(),
          device: {
            id: minted.device.id,
            status: minted.device.status,
            name: minted.device.deviceName,
          },
          license: {
            maxDevices: device.license.maxDevices,
            activeDevices,
            licenseExpiresAt: minted.device.licenseExpiresAt?.toISOString() ?? null,
            graceUntil: minted.device.graceUntil?.toISOString() ?? null,
          },
          subscription: {
            status: subscription?.status ?? 'ACTIVE',
            planCode: subscription?.planCode ?? 'basic',
            trialEnd: subscription?.trialEnd?.toISOString() ?? null,
          },
          pendingRequest,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }
}
