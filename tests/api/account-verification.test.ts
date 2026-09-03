import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import app from '../../backend/src/app'
import prisma from '../../backend/src/lib/prisma'

/**
 * Signup verification and password reset, end to end over the HTTP surface.
 *
 * The codes are read back through `OTP_DEV_ECHO`, which is the only way a test
 * can complete the flow — the code is stored as a keyed HMAC and there is no
 * inbox here. Both providers resolve to `log` under NODE_ENV=test, so EMAIL and
 * SMS count as available and nothing leaves the process.
 *
 * Every case uses its own destination: the service enforces a 60-second
 * cooldown per destination, so sharing one between cases would make them
 * order-dependent.
 */

const SAAS_HOST = 'localhost:3000'

const stamp = Date.now()
const testStart = new Date()
const createdSlugs: string[] = []

const post = (path: string, body: Record<string, unknown>, ip = '203.0.113.10') =>
    request(app)
        .post(path)
        .set('Host', SAAS_HOST)
        .set('X-Forwarded-Host', SAAS_HOST)
        .set('X-Forwarded-For', ip)
        .send(body)

/** Sends a code and hands back the six digits the dev echo returned. */
const sendCode = async (body: Record<string, unknown>) => {
    const res = await post('/api/auth/otp/send', body)
    expect(res.status).toBe(200)
    expect(typeof res.body.devCode).toBe('string')
    return res.body.devCode as string
}

/** Runs send + verify and returns the single-use token. */
const verifiedToken = async (body: Record<string, unknown>) => {
    const code = await sendCode(body)
    const res = await post('/api/auth/otp/verify', { ...body, code })
    expect(res.status).toBe(200)
    return res.body.verificationToken as string
}

const registerBody = (index: number, extra: Record<string, unknown> = {}) => {
    const slug = `verif-${stamp}-${index}`
    createdSlugs.push(slug)

    return {
        name: `Verified Tenant ${index}`,
        slug,
        email: `owner-${stamp}-${index}@example.com`,
        password: 'Password123!',
        phone: `05500${String(10000 + index).slice(-5)}`,
        ...extra
    }
}

describe('Account verification (OTP over email / SMS / WhatsApp)', () => {
    const previous = {
        echo: process.env.OTP_DEV_ECHO,
        requireVerification: process.env.REGISTER_REQUIRE_VERIFICATION
    }

    beforeAll(() => {
        process.env.OTP_DEV_ECHO = 'true'
        process.env.REGISTER_REQUIRE_VERIFICATION = 'true'
    })

    afterAll(async () => {
        process.env.OTP_DEV_ECHO = previous.echo
        process.env.REGISTER_REQUIRE_VERIFICATION = previous.requireVerification

        await prisma.verificationCode.deleteMany({
            where: {
                createdAt: { gte: testStart },
                OR: [
                    { destination: { contains: String(stamp) } },
                    // The SMS cases key on a normalized MSISDN, which carries
                    // no stamp of its own.
                    { destination: { startsWith: '2135500' } }
                ]
            }
        })

        if (createdSlugs.length === 0) return
        await prisma.user.deleteMany({ where: { tenant: { slug: { in: createdSlugs } } } })
        await prisma.tenant.deleteMany({ where: { slug: { in: createdSlugs } } })
    })

    describe('channel discovery', () => {
        it('advertises only the channels this deployment can deliver on', async () => {
            const res = await request(app)
                .get('/api/auth/otp/channels')
                .set('Host', SAAS_HOST)
                .set('X-Forwarded-Host', SAAS_HOST)

            expect(res.status).toBe(200)
            // The `log` provider stands in for both under NODE_ENV=test; there
            // are no platform WhatsApp credentials, so it must not be offered.
            expect(res.body.channels).toContain('EMAIL')
            expect(res.body.channels).toContain('SMS')
            expect(res.body.channels).not.toContain('WHATSAPP')
            expect(res.body.codeLength).toBe(6)
        })

        it('refuses a channel it cannot deliver on', async () => {
            const res = await post('/api/auth/otp/send', {
                purpose: 'REGISTRATION',
                channel: 'WHATSAPP',
                phone: '0550111222'
            })

            expect(res.status).toBe(503)
            expect(res.body.code).toBe('CHANNEL_UNAVAILABLE')
        })
    })

    describe('signup', () => {
        it('creates the tenant once the emailed code has been verified', async () => {
            const body = registerBody(1)
            const token = await verifiedToken({
                purpose: 'REGISTRATION',
                channel: 'EMAIL',
                email: body.email
            })

            const res = await post('/api/register', { ...body, verificationToken: token })

            expect(res.status).toBe(200)
            expect(res.body.success).toBe(true)

            const user = await prisma.user.findFirst({
                where: { tenantId: res.body.tenant.id, email: body.email }
            })
            expect(user?.emailVerifiedAt).toBeInstanceOf(Date)
            // The phone was submitted but never verified: it is stored,
            // normalized, and left unstamped.
            expect(user?.phone).toBe(`213${body.phone.slice(1)}`)
            expect(user?.phoneVerifiedAt).toBeNull()
        })

        it('stamps the phone instead when the code went by SMS', async () => {
            const body = registerBody(2)
            const token = await verifiedToken({
                purpose: 'REGISTRATION',
                channel: 'SMS',
                phone: body.phone
            })

            const res = await post('/api/register', { ...body, verificationToken: token })

            expect(res.status).toBe(200)

            const user = await prisma.user.findFirst({
                where: { tenantId: res.body.tenant.id, email: body.email }
            })
            expect(user?.phoneVerifiedAt).toBeInstanceOf(Date)
            expect(user?.emailVerifiedAt).toBeNull()
        })

        it('rejects a signup that carries no verification', async () => {
            const body = registerBody(3)
            const res = await post('/api/register', body)

            expect(res.status).toBe(400)
            expect(res.body.code).toBe('VERIFICATION_REQUIRED')
        })

        it('rejects a token verified for a different address', async () => {
            const body = registerBody(4)
            const token = await verifiedToken({
                purpose: 'REGISTRATION',
                channel: 'EMAIL',
                email: `someone-else-${stamp}@example.com`
            })

            const res = await post('/api/register', { ...body, verificationToken: token })

            expect(res.status).toBe(400)
            expect(res.body.code).toBe('VERIFICATION_MISMATCH')
        })

        it('spends the token exactly once', async () => {
            const first = registerBody(5)
            const token = await verifiedToken({
                purpose: 'REGISTRATION',
                channel: 'EMAIL',
                email: first.email
            })

            expect((await post('/api/register', { ...first, verificationToken: token })).status).toBe(200)

            // Same token, second tenant: the replay a stolen token would be.
            const second = { ...registerBody(6), email: first.email }
            const replay = await post('/api/register', { ...second, verificationToken: token })

            expect(replay.status).toBe(400)
            expect(replay.body.code).toBe('VERIFICATION_EXPIRED')
        })

        it('will not let a signup token stand in for a password reset', async () => {
            const body = registerBody(7)

            // Purpose is part of what `consumeToken` matches on, so a token
            // minted at signup cannot be spent on someone's password.
            const token = await verifiedToken({
                purpose: 'REGISTRATION',
                channel: 'EMAIL',
                email: body.email
            })

            const reset = await post('/api/auth/password/reset', {
                verificationToken: token,
                password: 'AnotherPassword123!'
            })

            expect(reset.status).toBe(400)
            expect(reset.body.code).toBe('VERIFICATION_EXPIRED')
        })
    })

    describe('code entry', () => {
        it('counts down the attempts, then burns the code', async () => {
            const email = `attempts-${stamp}@example.com`
            const body = { purpose: 'REGISTRATION', channel: 'EMAIL', email }
            const code = await sendCode(body)
            const wrong = code === '000000' ? '111111' : '000000'

            const first = await post('/api/auth/otp/verify', { ...body, code: wrong })
            expect(first.status).toBe(400)
            expect(first.body.code).toBe('INVALID_CODE')
            expect(first.body.attemptsRemaining).toBe(4)

            for (let attempt = 0; attempt < 3; attempt += 1) {
                await post('/api/auth/otp/verify', { ...body, code: wrong })
            }

            const fifth = await post('/api/auth/otp/verify', { ...body, code: wrong })
            expect(fifth.status).toBe(429)
            expect(fifth.body.code).toBe('TOO_MANY_ATTEMPTS')

            // The right code is worthless now — the row was burned, not left to
            // expire with four fresh guesses available.
            const afterBurn = await post('/api/auth/otp/verify', { ...body, code })
            expect(afterBurn.status).toBe(400)
            expect(afterBurn.body.code).toBe('CODE_EXPIRED')
        })

        it('holds a destination to one code at a time', async () => {
            const email = `resend-${stamp}@example.com`
            const body = { purpose: 'REGISTRATION', channel: 'EMAIL', email }

            await sendCode(body)
            const second = await post('/api/auth/otp/send', body)

            expect(second.status).toBe(429)
            expect(second.body.code).toBe('RESEND_TOO_SOON')
            expect(second.body.retryAfterSeconds).toBeGreaterThan(0)
        })

        it('refuses a destination that is not a real address or Algerian number', async () => {
            const badEmail = await post('/api/auth/otp/send', {
                purpose: 'REGISTRATION',
                channel: 'EMAIL',
                email: 'not-an-address'
            })
            expect(badEmail.status).toBe(400)
            expect(badEmail.body.code).toBe('INVALID_EMAIL')

            const badPhone = await post('/api/auth/otp/send', {
                purpose: 'REGISTRATION',
                channel: 'SMS',
                phone: '0123456789'
            })
            expect(badPhone.status).toBe(400)
            expect(badPhone.body.code).toBe('INVALID_PHONE')
        })
    })

    describe('password reset', () => {
        /** A tenant whose owner has both a verified email and a phone on file. */
        const createOwner = async (index: number) => {
            const body = registerBody(index)
            const token = await verifiedToken({
                purpose: 'REGISTRATION',
                channel: 'EMAIL',
                email: body.email
            })
            const res = await post('/api/register', { ...body, verificationToken: token })
            expect(res.status).toBe(200)

            return { ...body, tenantId: res.body.tenant.id as string }
        }

        it('answers identically for an address with no account behind it', async () => {
            const ghost = `ghost-${stamp}@example.com`
            const res = await post('/api/auth/password/forgot', { channel: 'EMAIL', email: ghost })

            expect(res.status).toBe(200)
            expect(res.body.success).toBe(true)
            expect(res.body.maskedDestination).toContain('@example.com')
            expect(res.body.expiresInMinutes).toBe(10)
            // Nothing was sent, so there is no code to echo even under dev echo.
            expect(res.body.devCode).toBeUndefined()

            // A row was still written, and it carries no account. That is what
            // makes the cooldown below fire for a made-up address exactly as it
            // does for a real one.
            const row = await prisma.verificationCode.findFirst({
                where: { destination: ghost },
                orderBy: { createdAt: 'desc' }
            })
            expect(row?.userId).toBeNull()

            const again = await post('/api/auth/password/forgot', { channel: 'EMAIL', email: ghost })
            expect(again.status).toBe(429)
            expect(again.body.code).toBe('RESEND_TOO_SOON')
        })

        it('applies the same cooldown to an address that does exist', async () => {
            const owner = await createOwner(13)

            const first = await post('/api/auth/password/forgot', {
                channel: 'EMAIL',
                email: owner.email
            })
            expect(first.status).toBe(200)

            const second = await post('/api/auth/password/forgot', {
                channel: 'EMAIL',
                email: owner.email
            })

            // Byte for byte the answer the ghost address got above.
            expect(second.status).toBe(429)
            expect(second.body.code).toBe('RESEND_TOO_SOON')
        })

        it('never spells the destination out in full', async () => {
            const res = await post('/api/auth/password/forgot', {
                channel: 'EMAIL',
                email: `masked-${stamp}@example.com`
            })

            expect(res.body.maskedDestination).not.toContain(`masked-${stamp}`)
            expect(res.body.maskedDestination.startsWith('m•')).toBe(true)
        })

        it('changes the password and kills every existing session', async () => {
            const owner = await createOwner(10)

            // Distinct IPs per login: `loginRateLimiter` allows ten per
            // host+IP per quarter hour and is not relaxed under test.
            const before = await post('/api/login', { email: owner.email, password: owner.password }, '203.0.113.51')
            expect(before.status).toBe(200)

            const forgot = await post('/api/auth/password/forgot', {
                channel: 'EMAIL',
                email: owner.email
            })
            expect(forgot.status).toBe(200)

            const verify = await post('/api/auth/otp/verify', {
                purpose: 'PASSWORD_RESET',
                channel: 'EMAIL',
                email: owner.email,
                code: forgot.body.devCode
            })
            expect(verify.status).toBe(200)

            const newPassword = 'BrandNewPassword456!'
            const reset = await post('/api/auth/password/reset', {
                verificationToken: verify.body.verificationToken,
                password: newPassword
            })
            expect(reset.status).toBe(200)

            const stale = await post('/api/login', { email: owner.email, password: owner.password }, '203.0.113.52')
            expect(stale.status).toBe(401)

            const fresh = await post('/api/login', { email: owner.email, password: newPassword }, '203.0.113.53')
            expect(fresh.status).toBe(200)

            // The token signed before the reset must no longer open /me.
            const user = await prisma.user.findFirst({
                where: { tenantId: owner.tenantId, email: owner.email }
            })
            expect(user?.tokenInvalidBefore).toBeInstanceOf(Date)

            const replayed = await request(app)
                .get('/api/me')
                .set('Host', SAAS_HOST)
                .set('X-Forwarded-Host', SAAS_HOST)
                .set('Authorization', `Bearer ${before.body.token}`)
            expect(replayed.status).toBe(401)
        })

        it('finds the account by phone when the code goes out over SMS', async () => {
            const owner = await createOwner(11)

            const forgot = await post('/api/auth/password/forgot', {
                channel: 'SMS',
                phone: owner.phone
            })
            expect(forgot.status).toBe(200)
            expect(typeof forgot.body.devCode).toBe('string')

            const verify = await post('/api/auth/otp/verify', {
                purpose: 'PASSWORD_RESET',
                channel: 'SMS',
                phone: owner.phone,
                code: forgot.body.devCode
            })
            expect(verify.status).toBe(200)

            const newPassword = 'SmsResetPassword789!'
            const reset = await post('/api/auth/password/reset', {
                verificationToken: verify.body.verificationToken,
                password: newPassword
            })
            expect(reset.status).toBe(200)

            const login = await post('/api/login', { email: owner.email, password: newPassword }, '203.0.113.54')
            expect(login.status).toBe(200)
        })

        it('refuses a new password that is too short, without spending the token', async () => {
            const owner = await createOwner(12)

            const forgot = await post('/api/auth/password/forgot', {
                channel: 'EMAIL',
                email: owner.email
            })
            const verify = await post('/api/auth/otp/verify', {
                purpose: 'PASSWORD_RESET',
                channel: 'EMAIL',
                email: owner.email,
                code: forgot.body.devCode
            })

            const tooShort = await post('/api/auth/password/reset', {
                verificationToken: verify.body.verificationToken,
                password: 'short'
            })
            expect(tooShort.status).toBe(400)
            expect(tooShort.body.code).toBe('PASSWORD_TOO_SHORT')

            // The length check runs before the token is consumed, so the
            // visitor can correct the field instead of restarting the flow.
            const retry = await post('/api/auth/password/reset', {
                verificationToken: verify.body.verificationToken,
                password: 'LongEnoughPassword1!'
            })
            expect(retry.status).toBe(200)
        })
    })
})
