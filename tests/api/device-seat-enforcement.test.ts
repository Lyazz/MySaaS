import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import app from '../../backend/src/app'
import { verifyActivationToken } from '../../backend/src/lib/activation-token'
import prisma from '../../backend/src/lib/prisma'

/**
 * The one-device rule.
 *
 * Login used to call the seat check inside a try/catch that only logged, so a
 * second device failed the check and still walked away with a full API token.
 * These tests exist so that cannot come back.
 */
describe('device seat enforcement at login', () => {
    const stamp = Date.now()
    const host = 'localhost:3000'
    const password = 'Password123!'

    const ownerEmail = `seat-owner-${stamp}@example.com`
    const staffEmail = `seat-staff-${stamp}@example.com`

    const hardwareA = `hw-a-${stamp}`
    const hardwareB = `hw-b-${stamp}`

    let tenantId = ''
    const previousFlag = process.env.DEVICE_SEAT_ENFORCEMENT

    const login = (body: Record<string, unknown>) =>
        request(app).post('/api/login').set('X-Forwarded-Host', host).send(body)

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { publishedAt: new Date(), name: 'Seat Tenant', slug: `seat-${stamp}`, isOffline: false }
        })
        tenantId = tenant.id

        const passwordHash = await bcrypt.hash(password, 10)
        await prisma.user.create({
            data: { tenantId, email: ownerEmail, role: 'owner', passwordHash }
        })
        await prisma.user.create({
            data: { tenantId, email: staffEmail, role: 'staff', passwordHash }
        })
    })

    afterEach(async () => {
        // Each case starts from a clean seat allocation.
        await prisma.device.deleteMany({ where: { tenantId } })
        await prisma.license.deleteMany({ where: { tenantId } })
    })

    afterAll(async () => {
        if (previousFlag === undefined) delete process.env.DEVICE_SEAT_ENFORCEMENT
        else process.env.DEVICE_SEAT_ENFORCEMENT = previousFlag

        await prisma.device.deleteMany({ where: { tenantId } })
        await prisma.license.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    })

    describe('with enforcement enabled', () => {
        beforeAll(() => {
            process.env.DEVICE_SEAT_ENFORCEMENT = 'true'
        })

        it('lets the first device claim the only seat', async () => {
            const res = await login({
                email: ownerEmail,
                password,
                hardwareId: hardwareA,
                deviceName: 'Counter 1',
                devicePlatform: 'windows'
            })

            expect(res.status).toBe(200)
            expect(typeof res.body.token).toBe('string')
            expect(typeof res.body.activationToken).toBe('string')

            const devices = await prisma.device.findMany({ where: { tenantId } })
            expect(devices).toHaveLength(1)
            expect(devices[0].hardwareId).toBe(hardwareA)
        })

        it('refuses a second device AND issues no token at all', async () => {
            const first = await login({ email: ownerEmail, password, hardwareId: hardwareA })
            expect(first.status).toBe(200)

            const second = await login({
                email: ownerEmail,
                password,
                hardwareId: hardwareB,
                deviceName: 'Counter 2'
            })

            expect(second.status).toBe(409)
            expect(second.body.code).toBe('DEVICE_LIMIT_REACHED')
            // The regression that mattered: a refused device must not get in.
            expect(second.body.token).toBeUndefined()
            expect(second.body.activationToken).toBeUndefined()

            // And it must be offered the way out, not a dead end.
            expect(second.body.canRequestAccess).toBe(true)
            expect(second.body.hardwareId).toBe(hardwareB)

            const devices = await prisma.device.findMany({ where: { tenantId } })
            expect(devices).toHaveLength(1)
        })

        it('still lets a different staff user log in on the activated device', async () => {
            const owner = await login({ email: ownerEmail, password, hardwareId: hardwareA })
            expect(owner.status).toBe(200)

            const staff = await login({ email: staffEmail, password, hardwareId: hardwareA })

            // The seat belongs to the tenant, not to one user account.
            expect(staff.status).toBe(200)
            expect(typeof staff.body.token).toBe('string')
            expect(typeof staff.body.activationToken).toBe('string')
        })

        it('does not seat-limit a browser login, which sends no hardwareId', async () => {
            const first = await login({ email: ownerEmail, password, hardwareId: hardwareA })
            expect(first.status).toBe(200)

            const web = await login({ email: ownerEmail, password })

            // The web admin is deliberately unrestricted.
            expect(web.status).toBe(200)
            expect(typeof web.body.token).toBe('string')
            expect(web.body.activationToken).toBeUndefined()
        })

        it('binds the access token to the device that claimed the seat', async () => {
            const res = await login({ email: ownerEmail, password, hardwareId: hardwareA })
            expect(res.status).toBe(200)

            const device = await prisma.device.findFirstOrThrow({ where: { tenantId } })
            const claims = JSON.parse(
                Buffer.from(res.body.token.split('.')[1], 'base64').toString('utf-8')
            )

            expect(claims.deviceId).toBe(device.id)
            expect(claims.dv).toBe(device.tokenVersion)
        })

        it('mints an activation licence carrying an explicit offline window', async () => {
            const res = await login({ email: ownerEmail, password, hardwareId: hardwareA })
            const decoded = verifyActivationToken(res.body.activationToken)

            expect(decoded.tokenSchemaVersion).toBe(2)
            expect(decoded.hardwareId).toBe(hardwareA)
            expect(decoded.deviceId).toBe(decoded.workspaceId)

            const expiresAt = new Date(decoded.licenseExpiresAt!)
            const graceUntil = new Date(decoded.graceUntil!)
            const graceDays = Math.round(
                (graceUntil.getTime() - expiresAt.getTime()) / 86_400_000
            )

            expect(graceDays).toBe(7)
            expect(expiresAt.getTime()).toBeGreaterThan(Date.now())
        })

        it('refuses a revoked device', async () => {
            await login({ email: ownerEmail, password, hardwareId: hardwareA })
            await prisma.device.updateMany({
                where: { tenantId, hardwareId: hardwareA },
                data: { status: 'REVOKED', revokedReason: 'Reported stolen' }
            })

            const res = await login({ email: ownerEmail, password, hardwareId: hardwareA })

            expect(res.status).toBe(403)
            expect(res.body.code).toBe('DEVICE_REVOKED')
            expect(res.body.token).toBeUndefined()
        })
    })

    describe('with enforcement disabled (the shipping default)', () => {
        beforeAll(() => {
            process.env.DEVICE_SEAT_ENFORCEMENT = 'false'
        })

        it('lets a second device log in, but hands it no activation licence', async () => {
            const first = await login({ email: ownerEmail, password, hardwareId: hardwareA })
            expect(first.status).toBe(200)

            const second = await login({ email: ownerEmail, password, hardwareId: hardwareB })

            // Degrades to allow-and-log, so a rollout cannot lock out real shops
            // before their devices have checked in even once.
            expect(second.status).toBe(200)
            expect(typeof second.body.token).toBe('string')
            // It still learns it is unseated.
            expect(second.body.activationToken).toBeUndefined()
        })
    })
})
