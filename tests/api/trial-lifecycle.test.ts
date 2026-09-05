import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import app from '../../backend/src/app'
import { verifyActivationToken } from '../../backend/src/lib/activation-token'
import prisma from '../../backend/src/lib/prisma'
import { ActivationService } from '../../backend/src/modules/activation/activation.service'
import { TRIAL_DAYS } from '../../backend/src/modules/billing/subscription.service'

/**
 * The trial.
 *
 * `TenantSubscription.status` and `trialEnd` have existed since the billing
 * work, and the pricing page has advertised a free trial, but nothing ever
 * wrote TRIALING: three separate call sites each created the row with a
 * hardcoded ACTIVE.
 */
describe('trial lifecycle', () => {
    const stamp = Date.now()
    const saasHost = 'localhost:3000'
    const createdTenantIds: string[] = []

    // The deployment arms this gate via .env; these tests are about the code
    // path that self-serve trials need, so they exercise it with the gate open.
    const previousGate = process.env.REGISTER_PHONE_LOCK_ENABLED

    beforeAll(() => {
        process.env.REGISTER_PHONE_LOCK_ENABLED = 'false'
    })

    const register = (slug: string, email: string) =>
        request(app)
            .post('/api/register')
            .set('X-Forwarded-Host', saasHost)
            .send({ name: slug, slug, email, password: 'password123' })

    afterAll(async () => {
        if (previousGate === undefined) delete process.env.REGISTER_PHONE_LOCK_ENABLED
        else process.env.REGISTER_PHONE_LOCK_ENABLED = previousGate

        for (const id of createdTenantIds) {
            await prisma.device.deleteMany({ where: { tenantId: id } })
            await prisma.license.deleteMany({ where: { tenantId: id } })
            await prisma.tenantSubscription.deleteMany({ where: { tenantId: id } })
            await prisma.user.deleteMany({ where: { tenantId: id } })
            await prisma.tenant.deleteMany({ where: { id } })
        }
    })

    it('starts a self-registered tenant on a trial, not a live subscription', async () => {
        const slug = `trial-${stamp}`
        const res = await register(slug, `owner-${slug}@example.com`)

        expect(res.status).toBe(200)
        const tenantId = res.body.tenant.id as string
        createdTenantIds.push(tenantId)

        const subscription = await prisma.tenantSubscription.findUniqueOrThrow({
            where: { tenantId }
        })

        expect(subscription.status).toBe('TRIALING')
        expect(subscription.trialEnd).not.toBeNull()

        const days = Math.round(
            (subscription.trialEnd!.getTime() - Date.now()) / 86_400_000
        )
        expect(days).toBe(TRIAL_DAYS)
    })

    it('registers a tenant whose phone is not the old whitelisted one', async () => {
        // Registration used to be hard-gated to a single phone number, which
        // made self-serve trials impossible.
        const slug = `trial-open-${stamp}`
        const res = await register(slug, `owner-${slug}@example.com`)

        expect(res.status).toBe(200)
        createdTenantIds.push(res.body.tenant.id)
    })

    it('is born online rather than offline-only', async () => {
        const slug = `trial-online-${stamp}`
        const res = await register(slug, `owner-${slug}@example.com`)
        const tenantId = res.body.tenant.id as string
        createdTenantIds.push(tenantId)

        const tenant = await prisma.tenant.findUniqueOrThrow({
            where: { id: tenantId }
        })

        // The old default made every tenant offline-only at birth, regardless of
        // what it had paid for.
        expect(tenant.isOffline).toBe(false)
    })

    it('clamps the activation licence to trialEnd, so an offline device self-locks', async () => {
        const slug = `trial-licence-${stamp}`
        const res = await register(slug, `owner-${slug}@example.com`)
        const tenantId = res.body.tenant.id as string
        createdTenantIds.push(tenantId)

        const subscription = await prisma.tenantSubscription.findUniqueOrThrow({
            where: { tenantId }
        })

        const activation = await new ActivationService().autoRegisterOrLoginDevice(
            tenantId,
            `trial-hw-${stamp}`,
            'Trial Terminal',
            'android'
        )

        const decoded = verifyActivationToken(activation.activationToken)

        // This clamp is the whole trial-enforcement mechanism: the device cannot
        // outlive the trial even if it never reaches the server again.
        expect(decoded.licenseExpiresAt).toBe(subscription.trialEnd!.toISOString())
        expect(decoded.subscriptionStatus).toBe('TRIALING')

        // And a trialling tenant reads as online, which the old isOffline
        // boolean could not express.
        expect(decoded.subscriptionTier).toBe('online')
        expect(decoded.mode).toBe('hybrid')
    })

    it('blocks the tenant once the trial has lapsed', async () => {
        const slug = `trial-lapsed-${stamp}`
        const res = await register(slug, `owner-${slug}@example.com`)
        const tenantId = res.body.tenant.id as string
        const token = res.body.token as string
        createdTenantIds.push(tenantId)

        const past = new Date(Date.now() - 86_400_000)
        await prisma.tenantSubscription.update({
            where: { tenantId },
            data: { trialEnd: past, currentPeriodEnd: past }
        })

        const blocked = await request(app)
            .get('/api/admin/products')
            .set('X-Forwarded-Host', saasHost)
            .set('Authorization', `Bearer ${token}`)

        expect(blocked.status).toBe(402)

        const subscription = await prisma.tenantSubscription.findUniqueOrThrow({
            where: { tenantId }
        })
        expect(subscription.status).toBe('PAST_DUE')
    })

    it('keeps trialEnd as history once a paid plan is applied', async () => {
        const slug = `trial-paid-${stamp}`
        const res = await register(slug, `owner-${slug}@example.com`)
        const tenantId = res.body.tenant.id as string
        createdTenantIds.push(tenantId)

        const { BillingService } = await import(
            '../../backend/src/modules/billing/billing.service'
        )
        await new BillingService().setTenantSubscription({
            tenantId,
            planCode: 'professional',
            interval: 'month'
        })

        const subscription = await prisma.tenantSubscription.findUniqueOrThrow({
            where: { tenantId }
        })

        expect(subscription.status).toBe('ACTIVE')
        // Setting ACTIVE already ends the trial, because the licence window only
        // consults trialEnd while TRIALING. Erasing it would destroy the history
        // a super admin needs.
        expect(subscription.trialEnd).not.toBeNull()
    })
})
