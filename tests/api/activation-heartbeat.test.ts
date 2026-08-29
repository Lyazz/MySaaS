import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import app from '../../backend/src/app'
import { verifyActivationToken } from '../../backend/src/lib/activation-token'
import prisma from '../../backend/src/lib/prisma'
import { ActivationService } from '../../backend/src/modules/activation/activation.service'

/**
 * The heartbeat is how a device renews its offline window, and the only channel
 * through which a revocation ever reaches a terminal nobody is logged into.
 */
describe('activation heartbeat', () => {
    const stamp = Date.now()
    const slug = `hb-${stamp}`
    const tenantHost = `${slug}.localhost:3000`
    const hardwareId = `hb-hw-${stamp}`

    const service = new ActivationService()

    let tenantId = ''
    let licenseId = ''
    let deviceId = ''
    let activationToken = ''

    const heartbeat = (body: Record<string, unknown>) =>
        request(app)
            .post('/api/activation/heartbeat')
            .set('X-Forwarded-Host', tenantHost)
            .send(body)

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Heartbeat Tenant', slug, isOffline: false }
        })
        tenantId = tenant.id

        const license = await prisma.license.create({
            data: { tenantId, licenseKey: `LIC-HB-${stamp}`, maxDevices: 1 }
        })
        licenseId = license.id
    })

    beforeEach(async () => {
        // Rebuild a clean, activated device before each case.
        await prisma.device.deleteMany({ where: { tenantId } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId } })
        await prisma.tenant.update({ where: { id: tenantId }, data: { isSuspended: false } })
        await prisma.license.update({ where: { id: licenseId }, data: { isActive: true } })

        const result = await service.autoRegisterOrLoginDevice(
            tenantId,
            hardwareId,
            'Counter 1',
            'windows'
        )
        deviceId = result.device.id
        activationToken = result.activationToken
    })

    afterAll(async () => {
        await prisma.device.deleteMany({ where: { tenantId } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId } })
        await prisma.license.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    it('renews the window and returns a fresh licence', async () => {
        await prisma.device.update({
            where: { id: deviceId },
            data: { licenseExpiresAt: new Date('2026-01-01T00:00:00.000Z') }
        })

        const res = await heartbeat({ activationToken, hardwareId, appVersion: '1.4.2' })

        expect(res.status).toBe(200)
        expect(typeof res.body.activationToken).toBe('string')
        expect(typeof res.body.serverTime).toBe('string')
        expect(res.body.license.maxDevices).toBe(1)
        expect(res.body.license.activeDevices).toBe(1)

        const renewed = new Date(res.body.license.licenseExpiresAt)
        expect(renewed.getTime()).toBeGreaterThan(Date.now())

        const decoded = verifyActivationToken(res.body.activationToken)
        expect(decoded.tokenSchemaVersion).toBe(2)
        expect(decoded.deviceId).toBe(deviceId)

        const device = await prisma.device.findUniqueOrThrow({ where: { id: deviceId } })
        expect(device.appVersion).toBe('1.4.2')
        expect(device.lastSeenAt).not.toBeNull()
    })

    it('keeps the workspace id stable across renewals', async () => {
        const res = await heartbeat({ activationToken, hardwareId })
        const decoded = verifyActivationToken(res.body.activationToken)

        // workspaceId names the encrypted local database directory. If a renewal
        // ever changed it, the device would silently orphan the tenant's data.
        expect(decoded.workspaceId).toBe(deviceId)
        expect(decoded.deviceId).toBe(decoded.workspaceId)
    })

    it('rejects a token presented by different hardware', async () => {
        const res = await heartbeat({ activationToken, hardwareId: `someone-else-${stamp}` })

        expect(res.status).toBe(403)
        expect(res.body.code).toBe('HARDWARE_MISMATCH')
    })

    it('rejects an unreadable token', async () => {
        const res = await heartbeat({ activationToken: 'not-a-jwt', hardwareId })

        expect(res.status).toBe(401)
        expect(res.body.code).toBe('ACTIVATION_TOKEN_INVALID')
    })

    it('reports a revoked device, with the reason', async () => {
        await prisma.device.update({
            where: { id: deviceId },
            data: { status: 'REVOKED', revokedReason: 'Reported stolen' }
        })

        const res = await heartbeat({ activationToken, hardwareId })

        expect(res.status).toBe(403)
        expect(res.body.code).toBe('DEVICE_REVOKED')
        expect(res.body.revokedReason).toBe('Reported stolen')
    })

    it('reports a superseded token after a transfer bumps the device version', async () => {
        await prisma.device.update({
            where: { id: deviceId },
            data: { tokenVersion: { increment: 1 } }
        })

        const res = await heartbeat({ activationToken, hardwareId })

        expect(res.status).toBe(409)
        expect(res.body.code).toBe('TOKEN_SUPERSEDED')
    })

    it('reports a device that no longer exists', async () => {
        await prisma.device.deleteMany({ where: { id: deviceId } })

        const res = await heartbeat({ activationToken, hardwareId })

        expect(res.status).toBe(404)
        expect(res.body.code).toBe('DEVICE_UNKNOWN')
    })

    it('reports a suspended tenant', async () => {
        await prisma.tenant.update({ where: { id: tenantId }, data: { isSuspended: true } })

        const res = await heartbeat({ activationToken, hardwareId })

        expect(res.status).toBe(403)
        expect(res.body.code).toBe('TENANT_SUSPENDED')
    })

    it('reports a deactivated licence', async () => {
        await prisma.license.update({ where: { id: licenseId }, data: { isActive: false } })

        const res = await heartbeat({ activationToken, hardwareId })

        expect(res.status).toBe(403)
        expect(res.body.code).toBe('LICENSE_INACTIVE')
    })

    it('still reaches the handler for a PAST_DUE tenant', async () => {
        // The subscription middleware 402s every tenant-scoped path once the
        // period lapses. If it did that here too, a lapsed tenant could never
        // reactivate after paying: the lock would be permanent.
        await prisma.tenantSubscription.create({
            data: {
                tenantId,
                planCode: 'basic',
                interval: 'month',
                status: 'PAST_DUE',
                currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
                currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z')
            }
        })

        const res = await heartbeat({ activationToken, hardwareId })

        expect(res.status).not.toBe(402)
        expect(res.status).toBe(200)
    })

    it('clamps the window to trialEnd for a trialling tenant', async () => {
        const trialEnd = new Date(Date.now() + 3 * 86_400_000)
        await prisma.tenantSubscription.create({
            data: {
                tenantId,
                planCode: 'professional',
                interval: 'month',
                status: 'TRIALING',
                trialEnd
            }
        })

        const res = await heartbeat({ activationToken, hardwareId })
        expect(res.status).toBe(200)

        const decoded = verifyActivationToken(res.body.activationToken)

        // This clamp is what makes a trial device lock itself with no network.
        expect(new Date(decoded.licenseExpiresAt!).toISOString()).toBe(trialEnd.toISOString())
        expect(decoded.subscriptionStatus).toBe('TRIALING')
        expect(decoded.trialEnd).toBe(trialEnd.toISOString())
    })
})
