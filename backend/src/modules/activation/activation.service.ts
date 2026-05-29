import { randomBytes } from 'node:crypto';

import { Prisma, PrismaClient } from '@prisma/client';

import { signActivationToken } from '../../lib/activation-token';

const prisma = new PrismaClient();

const maskValue = (value: string, visible = 6) => {
  if (!value) return '';
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
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
          status: true,
          lastSyncAt: true,
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
      throw new Error('Tenant not found');
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
          status: device.status,
          activatedAt: device.createdAt,
          updatedAt: device.updatedAt,
          lastSyncAt: device.lastSyncAt,
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
            kind: device.license.licenseKey.startsWith('LIC-ON-')
              ? 'auto'
              : 'assigned',
          },
        };
      }),
    };
  }

  /**
   * Activates a device online, verifying the license and returning a signed JWT.
   */
  async activateDevice(
    tenantId: string | undefined,
    licenseKey: string,
    hardwareId: string,
    deviceName?: string
  ) {
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
          throw new Error('Invalid or inactive License Key');
        }

        if (tenantId && license.tenantId !== tenantId) {
          throw new Error(
            'This license does not belong to the current workspace.'
          );
        }

        if (license.tenant.isSuspended) {
          throw new Error('Tenant is suspended');
        }

        if (license.expiresAt && license.expiresAt < new Date()) {
          throw new Error('License has expired');
        }

        let device = license.devices.find((d) => d.hardwareId === hardwareId);

        if (!device) {
          const activeDevices = license.devices.filter(
            (d) => d.status === 'ACTIVE'
          ).length;
          if (activeDevices >= license.maxDevices) {
            throw new Error(
              `Activation limit reached. Maximum ${license.maxDevices} device(s) allowed.`
            );
          }

          device = await tx.device.create({
            data: {
              tenantId: license.tenantId,
              licenseId: license.id,
              hardwareId,
              deviceName: deviceName || 'Unknown Device',
            },
          });
        } else if (device.status !== 'ACTIVE') {
          throw new Error('This device has been revoked.');
        }

        const activationToken = signActivationToken({
          tenantId: license.tenantId,
          workspaceId: device.id,
          mode: license.tenant.isOffline ? 'offlineOnly' : 'hybrid',
          subscriptionTier: license.tenant.isOffline ? 'offlineOnly' : 'online',
          licenseKey,
          hardwareId,
          deviceId: device.id,
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
   * Processes an offline activation request
   * requestCode is a base64 encoded string: base64(`${licenseKey}:${hardwareId}`)
   */
  async offlineActivate(tenantId: string, requestCode: string) {
    try {
      const decoded = Buffer.from(requestCode, 'base64').toString('utf-8');
      const [licenseKey, hardwareId] = decoded.split(':');

      if (!licenseKey || !hardwareId) {
        throw new Error('Invalid Request Code format');
      }

      // We pass the parsed data to the standard activation flow
      const result = await this.activateDevice(
        tenantId,
        licenseKey,
        hardwareId,
        'Offline Device'
      );
      return result;
    } catch (e: any) {
      throw new Error(`Offline activation failed: ${e.message}`);
    }
  }
  /**
   * Automatically registers or logs in a device for a standard online user during authentication.
   * If the tenant has no devices, it generates a License Key and registers this device.
   */
  async autoRegisterOrLoginDevice(
    tenantId: string,
    hardwareId: string,
    deviceName?: string
  ) {
    return prisma.$transaction(
      async (tx) => {
        const tenant = await tx.tenant.findUnique({
          where: { id: tenantId },
          select: { id: true, isOffline: true, isSuspended: true },
        });

        if (!tenant) {
          throw new Error('Tenant not found');
        }

        if (tenant.isSuspended) {
          throw new Error('Tenant is suspended');
        }

        let license = await tx.license.findFirst({
          where: { tenantId, isActive: true },
          include: { devices: true },
          orderBy: { createdAt: 'asc' },
        });

        if (!license) {
          const randomPart = randomBytes(8).toString('hex').toUpperCase();

          license = await tx.license.create({
            data: {
              tenantId,
              licenseKey: `LIC-ON-${randomPart}`,
              maxDevices: 1,
            },
            include: { devices: true },
          });
        }

        let device = license.devices.find((d) => d.hardwareId === hardwareId);

        if (!device) {
          const activeDevices = license.devices.filter(
            (d) => d.status === 'ACTIVE'
          ).length;
          if (activeDevices >= license.maxDevices) {
            throw new Error(
              `Device limit reached. You can only have ${license.maxDevices} active device(s).`
            );
          }

          device = await tx.device.create({
            data: {
              tenantId,
              licenseId: license.id,
              hardwareId,
              deviceName: deviceName || 'Online POS Device',
            },
          });
        } else if (device.status !== 'ACTIVE') {
          throw new Error('This device has been revoked.');
        }

        const activationToken = signActivationToken({
          tenantId,
          workspaceId: device.id,
          mode: tenant.isOffline ? 'offlineOnly' : 'hybrid',
          subscriptionTier: tenant.isOffline ? 'offlineOnly' : 'online',
          licenseKey: license.licenseKey,
          hardwareId,
          deviceId: device.id,
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
}
