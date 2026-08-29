import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import app from '../../backend/src/app'
import { verifyActivationToken } from '../../backend/src/lib/activation-token'
import { signAccessToken } from '../../backend/src/lib/jwt'
import prisma from '../../backend/src/lib/prisma'
import { ActivationService } from '../../backend/src/modules/activation/activation.service'

/**
 * Device transfer: the tenant asks, the super admin decides.
 *
 * This is what makes "one activated device, and a second only when the super
 * admin permits it" workable rather than a support nightmare -- a broken phone
 * has a route back that does not require anyone to touch the database.
 */
describe('device transfer and super-admin device management', () => {
    const stamp = Date.now()
    const slug = `transfer-${stamp}`
    const tenantHost = `${slug}.localhost:3000`
    const saasHost = 'localhost:3000'

    const hardwareA = `transfer-hw-a-${stamp}`
    const hardwareB = `transfer-hw-b-${stamp}`

    const service = new ActivationService()

    let tenantId = ''
    let licenseId = ''
    let superAdminToken = ''
    let ownerToken = ''
    let deviceAId = ''

    const asSuperAdmin = (method: 'get' | 'post' | 'patch', path: string) =>
        request(app)[method](path)
            .set('X-Forwarded-Host', saasHost)
            .set('Authorization', `Bearer ${superAdminToken}`)

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'Transfer Tenant', slug, isOffline: false }
        })
        tenantId = tenant.id

        const license = await prisma.license.create({
            data: { tenantId, licenseKey: `LIC-TR-${stamp}`, maxDevices: 1 }
        })
        licenseId = license.id

        const passwordHash = await bcrypt.hash('Password123!', 10)
        const owner = await prisma.user.create({
            data: {
                tenantId,
                email: `owner-${slug}@example.com`,
                role: 'owner',
                passwordHash
            }
        })
        ownerToken = signAccessToken({
            userId: owner.id,
            email: owner.email,
            role: owner.role,
            tenantId
        })

        // Super admins live on their own tenant in this schema.
        const adminTenant = await prisma.tenant.create({
            data: { name: 'Platform', slug: `platform-${stamp}` }
        })
        const admin = await prisma.user.create({
            data: {
                tenantId: adminTenant.id,
                email: `admin-${stamp}@example.com`,
                role: 'owner',
                isSuperAdmin: true,
                passwordHash
            }
        })
        superAdminToken = signAccessToken({
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            tenantId: adminTenant.id
        })
    })

    beforeEach(async () => {
        await prisma.deviceActivationRequest.deleteMany({ where: { tenantId } })
        await prisma.device.deleteMany({ where: { tenantId } })
        await prisma.license.update({
            where: { id: licenseId },
            data: { maxDevices: 1, isActive: true }
        })

        const first = await service.autoRegisterOrLoginDevice(
            tenantId,
            hardwareA,
            'Counter 1',
            'windows'
        )
        deviceAId = first.device.id
    })

    afterAll(async () => {
        await prisma.deviceActivationRequest.deleteMany({ where: { tenantId } })
        await prisma.device.deleteMany({ where: { tenantId } })
        await prisma.license.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({
            where: { slug: { in: [slug, `platform-${stamp}`] } }
        })
    })

    const createRequest = (body: Record<string, unknown>) =>
        request(app)
            .post('/api/activation/requests')
            .set('X-Forwarded-Host', tenantHost)
            .send(body)

    describe('asking for a seat', () => {
        it('records a pending request', async () => {
            const res = await createRequest({
                hardwareId: hardwareB,
                deviceName: 'Counter 2',
                devicePlatform: 'android',
                reason: 'Old terminal died'
            })

            expect(res.status).toBe(201)
            expect(res.body.status).toBe('PENDING')
            // The claim code is never echoed before a decision.
            expect(res.body.claimCode).toBeUndefined()
        })

        it('is idempotent, so a retrying device cannot flood the queue', async () => {
            await createRequest({ hardwareId: hardwareB, deviceName: 'Counter 2' })
            await createRequest({ hardwareId: hardwareB, deviceName: 'Counter 2' })
            await createRequest({ hardwareId: hardwareB, deviceName: 'Counter 2' })

            const rows = await prisma.deviceActivationRequest.findMany({
                where: { tenantId, hardwareId: hardwareB, status: 'PENDING' }
            })
            expect(rows).toHaveLength(1)
        })

        it('does not leak a claim code to a poll before approval', async () => {
            const created = await createRequest({ hardwareId: hardwareB })

            const res = await request(app)
                .get(`/api/activation/requests/${created.body.id}`)
                .set('X-Forwarded-Host', tenantHost)
                .query({ hardwareId: hardwareB })

            expect(res.status).toBe(200)
            expect(res.body.status).toBe('PENDING')
            expect(res.body.claimCode).toBeNull()
        })

        it('refuses a poll from different hardware', async () => {
            const created = await createRequest({ hardwareId: hardwareB })

            const res = await request(app)
                .get(`/api/activation/requests/${created.body.id}`)
                .set('X-Forwarded-Host', tenantHost)
                .query({ hardwareId: 'someone-else' })

            expect(res.status).toBe(404)
        })
    })

    describe('super-admin decisions', () => {
        it('approves a transfer, freeing the replaced seat in the same operation', async () => {
            const created = await createRequest({
                hardwareId: hardwareB,
                deviceName: 'Counter 2',
                replacesDeviceId: deviceAId
            })

            const approved = await asSuperAdmin(
                'post',
                `/api/super-admin/activation/requests/${created.body.id}/approve`
            ).send({ note: 'Replacement terminal' })

            expect(approved.status).toBe(200)
            expect(typeof approved.body.claimCode).toBe('string')

            const oldDevice = await prisma.device.findUniqueOrThrow({
                where: { id: deviceAId }
            })
            expect(oldDevice.status).toBe('REVOKED')
            // The old terminal still drains work it captured offline.
            expect(oldDevice.drainUntil!.getTime()).toBeGreaterThan(Date.now())
            // And its tokens are retired.
            expect(oldDevice.tokenVersion).toBe(2)

            // The new device claims the freed seat.
            const claim = await request(app)
                .post('/api/activation/claim')
                .set('X-Forwarded-Host', tenantHost)
                .send({ claimCode: approved.body.claimCode, hardwareId: hardwareB })

            expect(claim.status).toBe(200)
            const decoded = verifyActivationToken(claim.body.activationToken)
            expect(decoded.hardwareId).toBe(hardwareB)
        })

        it('burns the claim code, so it cannot mint a second licence', async () => {
            const created = await createRequest({
                hardwareId: hardwareB,
                replacesDeviceId: deviceAId
            })
            const approved = await asSuperAdmin(
                'post',
                `/api/super-admin/activation/requests/${created.body.id}/approve`
            ).send({})

            const claimCode = approved.body.claimCode

            const first = await request(app)
                .post('/api/activation/claim')
                .set('X-Forwarded-Host', tenantHost)
                .send({ claimCode, hardwareId: hardwareB })
            expect(first.status).toBe(200)

            const replay = await request(app)
                .post('/api/activation/claim')
                .set('X-Forwarded-Host', tenantHost)
                .send({ claimCode, hardwareId: hardwareB })

            expect(replay.status).toBe(404)
        })

        it('denies a request with a note', async () => {
            const created = await createRequest({ hardwareId: hardwareB })

            const denied = await asSuperAdmin(
                'post',
                `/api/super-admin/activation/requests/${created.body.id}/deny`
            ).send({ note: 'Not on this plan' })

            expect(denied.status).toBe(200)
            expect(denied.body.request.status).toBe('DENIED')
            expect(denied.body.request.decisionNote).toBe('Not on this plan')
        })

        it('refuses every route to a tenant owner', async () => {
            const created = await createRequest({ hardwareId: hardwareB })

            for (const path of [
                '/api/super-admin/activation/requests',
                `/api/super-admin/activation/tenants/${tenantId}/devices`
            ]) {
                const res = await request(app)
                    .get(path)
                    .set('X-Forwarded-Host', saasHost)
                    .set('Authorization', `Bearer ${ownerToken}`)
                expect(res.status).toBe(403)
            }

            const approve = await request(app)
                .post(
                    `/api/super-admin/activation/requests/${created.body.id}/approve`
                )
                .set('X-Forwarded-Host', saasHost)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({})
            expect(approve.status).toBe(403)
        })
    })

    describe('revocation and seats', () => {
        it('revokes a device and writes an audit trail', async () => {
            const res = await asSuperAdmin(
                'post',
                `/api/super-admin/activation/tenants/${tenantId}/devices/${deviceAId}/revoke`
            ).send({ reason: 'Reported stolen' })

            expect(res.status).toBe(200)
            expect(res.body.device.status).toBe('REVOKED')

            const audit = await prisma.auditLog.findFirst({
                where: { action: 'DEVICE_REVOKED', targetId: deviceAId },
                orderBy: { createdAt: 'desc' }
            })
            expect(audit?.details).toBe('Reported stolen')
            expect(audit?.tenantId).toBe(tenantId)
        })

        it('requires a reason to revoke', async () => {
            const res = await asSuperAdmin(
                'post',
                `/api/super-admin/activation/tenants/${tenantId}/devices/${deviceAId}/revoke`
            ).send({})

            expect(res.status).toBe(400)
        })

        it('restores a revoked device when a seat is free', async () => {
            await asSuperAdmin(
                'post',
                `/api/super-admin/activation/tenants/${tenantId}/devices/${deviceAId}/revoke`
            ).send({ reason: 'Mistake' })

            const res = await asSuperAdmin(
                'post',
                `/api/super-admin/activation/tenants/${tenantId}/devices/${deviceAId}/restore`
            ).send({})

            expect(res.status).toBe(200)
            expect(res.body.device.status).toBe('ACTIVE')
            expect(res.body.device.revokedReason).toBeNull()
        })

        it('raises the seat count so a second device fits', async () => {
            const res = await asSuperAdmin(
                'patch',
                `/api/super-admin/activation/tenants/${tenantId}/licenses/${licenseId}`
            ).send({ maxDevices: 2 })

            expect(res.status).toBe(200)
            expect(res.body.license.maxDevices).toBe(2)

            const second = await service.autoRegisterOrLoginDevice(
                tenantId,
                hardwareB,
                'Counter 2',
                'android'
            )
            expect(second.device.hardwareId).toBe(hardwareB)
        })

        it('refuses to cut seats below the devices already running', async () => {
            await prisma.license.update({
                where: { id: licenseId },
                data: { maxDevices: 2 }
            })
            await service.autoRegisterOrLoginDevice(tenantId, hardwareB, 'Counter 2')

            const res = await asSuperAdmin(
                'patch',
                `/api/super-admin/activation/tenants/${tenantId}/licenses/${licenseId}`
            ).send({ maxDevices: 1 })

            // Otherwise this would silently decide which live terminal stops
            // working. Revoking is an explicit act, not a side effect.
            expect(res.status).toBe(409)
            expect(res.body.code).toBe('DEVICE_LIMIT_REACHED')
        })

        it('extends the read-only date for a tenant that cannot get online', async () => {
            const before = await prisma.device.findUniqueOrThrow({
                where: { id: deviceAId }
            })

            const res = await asSuperAdmin(
                'post',
                `/api/super-admin/activation/tenants/${tenantId}/devices/${deviceAId}/extend-grace`
            ).send({ days: 30 })

            expect(res.status).toBe(200)
            const after = new Date(res.body.device.graceUntil)
            expect(after.getTime()).toBeGreaterThan(before.graceUntil!.getTime())
        })
    })
})
