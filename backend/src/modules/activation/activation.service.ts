import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

// Secure key for signing activation tokens. In production, use env variable!
const ACTIVATION_SECRET = process.env.ACTIVATION_SECRET || 'fallback_secret_key_change_me'

export class ActivationService {
  /**
   * Activates a device online, verifying the license and returning a signed JWT.
   */
  async activateDevice(tenantId: string | undefined, licenseKey: string, hardwareId: string, deviceName?: string) {
    // 1. Find and validate the license by the unique licenseKey
    const license = await prisma.license.findUnique({
      where: {
        licenseKey,
      },
      include: { devices: true },
    })

    if (!license || !license.isActive) {
      throw new Error('Invalid or inactive License Key')
    }

    // Ensure the tenant matches if the request arrived via a specific tenant subdomain
    if (tenantId && license.tenantId !== tenantId) {
      throw new Error('This license does not belong to the current workspace.')
    }

    // We can confidently use the license's true tenant ID moving forward
    const resolvedTenantId = license.tenantId;

    if (license.expiresAt && license.expiresAt < new Date()) {
      throw new Error('License has expired')
    }

    // 2. Check if this device is already registered
    let device = license.devices.find((d) => d.hardwareId === hardwareId)

    // 3. If not registered, ensure we haven't exceeded maxDevices
    if (!device) {
      const activeDevices = license.devices.filter((d) => d.status === 'ACTIVE').length
      if (activeDevices >= license.maxDevices) {
        throw new Error(`Activation limit reached. Maximum ${license.maxDevices} device(s) allowed.`)
      }

      // Register new device
      device = await prisma.device.create({
        data: {
          tenantId: resolvedTenantId,
          licenseId: license.id,
          hardwareId,
          deviceName: deviceName || 'Unknown Device',
        },
      })
    } else if (device.status !== 'ACTIVE') {
      throw new Error('This device has been revoked.')
    }

    // 4. Generate signed activation token (JWT)
    const tokenPayload = {
      tenantId: resolvedTenantId,
      licenseKey,
      hardwareId,
      deviceId: device.id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // 1 year expiry
    }

    const activationToken = jwt.sign(tokenPayload, ACTIVATION_SECRET)

    return {
      message: 'Device activated successfully',
      device,
      activationToken,
    }
  }

  /**
   * Processes an offline activation request
   * requestCode is a base64 encoded string: base64(`${licenseKey}:${hardwareId}`)
   */
  async offlineActivate(tenantId: string, requestCode: string) {
    try {
      const decoded = Buffer.from(requestCode, 'base64').toString('utf-8')
      const [licenseKey, hardwareId] = decoded.split(':')

      if (!licenseKey || !hardwareId) {
        throw new Error('Invalid Request Code format')
      }

      // We pass the parsed data to the standard activation flow
      const result = await this.activateDevice(tenantId, licenseKey, hardwareId, 'Offline Device')
      return result
    } catch (e: any) {
      throw new Error(`Offline activation failed: ${e.message}`)
    }
  }
  /**
   * Automatically registers or logs in a device for a standard online user during authentication.
   * If the tenant has no devices, it generates a License Key and registers this device.
   */
  async autoRegisterOrLoginDevice(tenantId: string, hardwareId: string, deviceName?: string) {
    // 1. Find an active license for this tenant
    let license = await prisma.license.findFirst({
      where: { tenantId, isActive: true },
      include: { devices: true },
    })

    // If no license exists (first time online login), create one automatically
    if (!license) {
      const crypto = require('crypto')
      const randomPart = crypto.randomBytes(8).toString('hex').toUpperCase()
      
      license = await prisma.license.create({
        data: {
          tenantId,
          licenseKey: `LIC-ON-${randomPart}`,
          maxDevices: 1,
        },
        include: { devices: true },
      })
    }

    // 2. Check if this specific device is already registered
    let device = license.devices.find((d) => d.hardwareId === hardwareId)

    // 3. If not registered, attempt to register it
    if (!device) {
      const activeDevices = license.devices.filter((d) => d.status === 'ACTIVE').length
      if (activeDevices >= license.maxDevices) {
        throw new Error(`Device limit reached. You can only have ${license.maxDevices} active device(s).`)
      }

      device = await prisma.device.create({
        data: {
          tenantId,
          licenseId: license.id,
          hardwareId,
          deviceName: deviceName || 'Online POS Device',
        },
      })
    } else if (device.status !== 'ACTIVE') {
      throw new Error('This device has been revoked.')
    }

    // 4. Generate signed activation token (JWT)
    const tokenPayload = {
      tenantId,
      licenseKey: license.licenseKey,
      hardwareId,
      deviceId: device.id,
      tier: 'ONLINE', // We force ONLINE tier for auto-registered devices
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // 1 year expiry
    }

    const activationToken = jwt.sign(tokenPayload, ACTIVATION_SECRET)

    return {
      message: 'Device auto-registered successfully',
      device,
      activationToken,
    }
  }
}
