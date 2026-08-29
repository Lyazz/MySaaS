import { generateKeyPairSync } from 'node:crypto'

import jwt from 'jsonwebtoken'
import { afterEach, describe, expect, it } from 'vitest'

import {
    ACTIVATION_TOKEN_AUDIENCE,
    signActivationToken,
    verifyActivationToken,
    type ActivationTokenPayloadV2
} from '../../backend/src/lib/activation-token'

const GRACE_UNTIL = new Date(Date.now() + 37 * 86_400_000)
const LICENSE_EXPIRES_AT = new Date(Date.now() + 30 * 86_400_000)

const payload = (
    overrides: Partial<ActivationTokenPayloadV2> = {}
): ActivationTokenPayloadV2 => ({
    v: 2,
    tenantId: 'tenant-1',
    workspaceId: 'device-1',
    deviceId: 'device-1',
    hardwareId: 'hw-1',
    mode: 'hybrid',
    subscriptionTier: 'online',
    licenseId: 'license-1',
    licenseKey: 'LIC-TEST',
    tokenVersion: 3,
    maxDevices: 1,
    planCode: 'professional',
    subscriptionStatus: 'ACTIVE',
    trialEnd: null,
    licenseExpiresAt: LICENSE_EXPIRES_AT.toISOString(),
    graceUntil: GRACE_UNTIL.toISOString(),
    issuedAt: new Date().toISOString(),
    ...overrides
})

describe('activation token', () => {
    const savedPrivate = process.env.ACTIVATION_PRIVATE_KEY
    const savedPublic = process.env.ACTIVATION_PUBLIC_KEY
    const savedPrevious = process.env.ACTIVATION_PUBLIC_KEY_PREVIOUS

    afterEach(() => {
        process.env.ACTIVATION_PRIVATE_KEY = savedPrivate
        process.env.ACTIVATION_PUBLIC_KEY = savedPublic
        if (savedPrevious === undefined) delete process.env.ACTIVATION_PUBLIC_KEY_PREVIOUS
        else process.env.ACTIVATION_PUBLIC_KEY_PREVIOUS = savedPrevious
    })

    describe('key handling', () => {
        it('refuses to sign without a configured private key', () => {
            delete process.env.ACTIVATION_PRIVATE_KEY

            // There is deliberately no fallback: this file used to ship a working
            // private key as a default, and that key is now public in git history.
            expect(() => signActivationToken(payload())).toThrow(
                /ACTIVATION_PRIVATE_KEY/
            )
        })

        it('refuses to verify without a configured public key', () => {
            const token = signActivationToken(payload())
            delete process.env.ACTIVATION_PUBLIC_KEY

            expect(() => verifyActivationToken(token)).toThrow(/ACTIVATION_PUBLIC_KEY/)
        })

        it('accepts an escaped-newline PEM, the form used in .env files', () => {
            process.env.ACTIVATION_PRIVATE_KEY = savedPrivate!.replace(/\n/g, '\\n')
            process.env.ACTIVATION_PUBLIC_KEY = savedPublic!.replace(/\n/g, '\\n')

            const decoded = verifyActivationToken(signActivationToken(payload()))
            expect(decoded.deviceId).toBe('device-1')
        })
    })

    describe('v2 claims', () => {
        it('round-trips every licence claim', () => {
            const decoded = verifyActivationToken(signActivationToken(payload()))

            expect(decoded.tokenSchemaVersion).toBe(2)
            expect(decoded.signingKeyUsed).toBe('current')
            expect(decoded.licenseId).toBe('license-1')
            expect(decoded.tokenVersion).toBe(3)
            expect(decoded.maxDevices).toBe(1)
            expect(decoded.planCode).toBe('professional')
            expect(decoded.licenseExpiresAt).toBe(LICENSE_EXPIRES_AT.toISOString())
            expect(decoded.graceUntil).toBe(GRACE_UNTIL.toISOString())
            expect(decoded.aud).toBe(ACTIVATION_TOKEN_AUDIENCE)
            expect(decoded.sub).toBe('device-1')
        })

        it('sets exp to graceUntil + 30 days, so an expired licence stays readable', () => {
            const decoded = verifyActivationToken(signActivationToken(payload()))

            const expectedExp = Math.floor(GRACE_UNTIL.getTime() / 1000) + 30 * 86_400
            expect(decoded.exp).toBe(expectedExp)

            // The lock instant is the graceUntil claim, not exp. If exp were the
            // lock, an expired device could not even open its own licence to say
            // when it expired.
            expect(decoded.exp! * 1000).toBeGreaterThan(GRACE_UNTIL.getTime())
        })

        it('rejects a v2 token missing its window claims', () => {
            const token = jwt.sign(
                { ...payload(), graceUntil: undefined },
                process.env.ACTIVATION_PRIVATE_KEY!,
                {
                    algorithm: 'RS256',
                    audience: ACTIVATION_TOKEN_AUDIENCE,
                    subject: 'device-1'
                }
            )

            expect(() => verifyActivationToken(token)).toThrow(/v2 payload is incomplete/)
        })

        it('refuses to sign without a parseable graceUntil', () => {
            expect(() => signActivationToken(payload({ graceUntil: 'soon' }))).toThrow(
                /ISO `graceUntil`/
            )
        })
    })

    describe('backward compatibility', () => {
        it('still verifies a v1 token, which carries no licence window', () => {
            // Devices in the field hold these. Refusing one would brick a device
            // that has done nothing wrong; the caller synthesizes a short window.
            const legacy = jwt.sign(
                {
                    tenantId: 'tenant-1',
                    workspaceId: 'device-1',
                    deviceId: 'device-1',
                    hardwareId: 'hw-1',
                    mode: 'offlineOnly',
                    subscriptionTier: 'offlineOnly',
                    licenseKey: 'LIC-OLD'
                },
                process.env.ACTIVATION_PRIVATE_KEY!,
                {
                    algorithm: 'RS256',
                    audience: ACTIVATION_TOKEN_AUDIENCE,
                    subject: 'device-1',
                    expiresIn: '365d'
                }
            )

            const decoded = verifyActivationToken(legacy)

            expect(decoded.tokenSchemaVersion).toBe(1)
            expect(decoded.graceUntil).toBeUndefined()
            expect(decoded.deviceId).toBe('device-1')
        })
    })

    describe('key rotation bridge', () => {
        const rotate = () => {
            const fresh = generateKeyPairSync('rsa', {
                modulusLength: 2048,
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
                publicKeyEncoding: { type: 'spki', format: 'pem' }
            })

            // Token minted under the OLD key...
            const token = signActivationToken(payload())

            // ...then the server rotates, keeping the old public key as previous.
            process.env.ACTIVATION_PUBLIC_KEY_PREVIOUS = savedPublic
            process.env.ACTIVATION_PRIVATE_KEY = fresh.privateKey
            process.env.ACTIVATION_PUBLIC_KEY = fresh.publicKey

            return token
        }

        it('rejects a previous-key token by default', () => {
            const token = rotate()

            // Never proof of a seat: the default path must not accept it.
            expect(() => verifyActivationToken(token)).toThrow()
        })

        it('accepts a previous-key token only when explicitly allowed', () => {
            const token = rotate()

            const decoded = verifyActivationToken(token, { allowPreviousKey: true })

            expect(decoded.signingKeyUsed).toBe('previous')
            expect(decoded.deviceId).toBe('device-1')
        })

        it('does not accept a previous-key token when none is configured', () => {
            const token = signActivationToken(payload())
            const fresh = generateKeyPairSync('rsa', {
                modulusLength: 2048,
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
                publicKeyEncoding: { type: 'spki', format: 'pem' }
            })
            process.env.ACTIVATION_PUBLIC_KEY = fresh.publicKey
            delete process.env.ACTIVATION_PUBLIC_KEY_PREVIOUS

            expect(() => verifyActivationToken(token, { allowPreviousKey: true })).toThrow()
        })
    })
})
