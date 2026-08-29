import { describe, expect, it } from 'vitest'

import { computeLicenseWindow, type LicenseWindowInput } from '../../backend/src/lib/license-window'

const NOW = new Date('2026-08-27T12:00:00.000Z')

/** now + 30d, the default rolling window. */
const ROLLING_30D = '2026-09-26T12:00:00.000Z'
/** rolling + 7d, the default grace end. */
const GRACE_AFTER_ROLLING = '2026-10-03T12:00:00.000Z'

const baseInput = (overrides: Partial<LicenseWindowInput> = {}): LicenseWindowInput => ({
    now: NOW,
    offlineValidityDays: 30,
    graceDays: 7,
    licenseExpiresAt: null,
    subscriptionStatus: 'ACTIVE',
    trialEnd: null,
    currentPeriodEnd: null,
    ...overrides
})

describe('computeLicenseWindow', () => {
    describe('the rolling window', () => {
        it('grants offlineValidityDays when nothing else constrains it', () => {
            const window = computeLicenseWindow(baseInput())

            expect(window.licenseExpiresAt.toISOString()).toBe(ROLLING_30D)
            expect(window.graceUntil.toISOString()).toBe(GRACE_AFTER_ROLLING)
        })

        it('always bounds the window, so a tenant with no subscription data is never unlimited', () => {
            const window = computeLicenseWindow(
                baseInput({ subscriptionStatus: null, currentPeriodEnd: null })
            )

            expect(window.licenseExpiresAt.toISOString()).toBe(ROLLING_30D)
        })

        it('honours a per-license validity override', () => {
            const window = computeLicenseWindow(baseInput({ offlineValidityDays: 90 }))

            expect(window.licenseExpiresAt.toISOString()).toBe('2026-11-25T12:00:00.000Z')
        })
    })

    describe('clamping by trialEnd', () => {
        it('clamps to trialEnd while TRIALING', () => {
            const window = computeLicenseWindow(
                baseInput({
                    subscriptionStatus: 'TRIALING',
                    trialEnd: new Date('2026-09-05T12:00:00.000Z')
                })
            )

            expect(window.licenseExpiresAt.toISOString()).toBe('2026-09-05T12:00:00.000Z')
            // Grace runs from the clamped expiry, not from the rolling window.
            expect(window.graceUntil.toISOString()).toBe('2026-09-12T12:00:00.000Z')
        })

        it('ignores trialEnd once the subscription is ACTIVE', () => {
            const window = computeLicenseWindow(
                baseInput({
                    subscriptionStatus: 'ACTIVE',
                    trialEnd: new Date('2026-08-28T12:00:00.000Z')
                })
            )

            expect(window.licenseExpiresAt.toISOString()).toBe(ROLLING_30D)
        })

        it('matches the status case-insensitively, since the column is free text', () => {
            const window = computeLicenseWindow(
                baseInput({
                    subscriptionStatus: '  trialing ',
                    trialEnd: new Date('2026-09-05T12:00:00.000Z')
                })
            )

            expect(window.licenseExpiresAt.toISOString()).toBe('2026-09-05T12:00:00.000Z')
        })

        it('falls back to the rolling window when TRIALING but trialEnd is missing', () => {
            const window = computeLicenseWindow(
                baseInput({ subscriptionStatus: 'TRIALING', trialEnd: null })
            )

            // Degrades to bounded, never to unlimited.
            expect(window.licenseExpiresAt.toISOString()).toBe(ROLLING_30D)
        })

        it('produces a past expiry for a trial that already ended, so the device locks', () => {
            const window = computeLicenseWindow(
                baseInput({
                    subscriptionStatus: 'TRIALING',
                    trialEnd: new Date('2026-07-01T12:00:00.000Z')
                })
            )

            expect(window.licenseExpiresAt.toISOString()).toBe('2026-07-01T12:00:00.000Z')
            expect(window.graceUntil.getTime()).toBeLessThan(NOW.getTime())
        })

        it('still hands a just-ended trial its full grace window', () => {
            const window = computeLicenseWindow(
                baseInput({
                    subscriptionStatus: 'TRIALING',
                    trialEnd: new Date('2026-08-26T12:00:00.000Z')
                })
            )

            expect(window.graceUntil.toISOString()).toBe('2026-09-02T12:00:00.000Z')
            expect(window.graceUntil.getTime()).toBeGreaterThan(NOW.getTime())
        })
    })

    describe('clamping by currentPeriodEnd', () => {
        it('clamps to currentPeriodEnd when not TRIALING', () => {
            const window = computeLicenseWindow(
                baseInput({
                    subscriptionStatus: 'ACTIVE',
                    currentPeriodEnd: new Date('2026-09-10T12:00:00.000Z')
                })
            )

            expect(window.licenseExpiresAt.toISOString()).toBe('2026-09-10T12:00:00.000Z')
        })

        it('ignores currentPeriodEnd while TRIALING', () => {
            const window = computeLicenseWindow(
                baseInput({
                    subscriptionStatus: 'TRIALING',
                    trialEnd: new Date('2026-09-20T12:00:00.000Z'),
                    currentPeriodEnd: new Date('2026-08-28T12:00:00.000Z')
                })
            )

            expect(window.licenseExpiresAt.toISOString()).toBe('2026-09-20T12:00:00.000Z')
        })
    })

    describe('clamping by License.expiresAt', () => {
        it('clamps to the license hard stop', () => {
            const window = computeLicenseWindow(
                baseInput({ licenseExpiresAt: new Date('2026-09-01T12:00:00.000Z') })
            )

            expect(window.licenseExpiresAt.toISOString()).toBe('2026-09-01T12:00:00.000Z')
        })

        it('applies the license stop even while TRIALING', () => {
            const window = computeLicenseWindow(
                baseInput({
                    licenseExpiresAt: new Date('2026-08-30T12:00:00.000Z'),
                    subscriptionStatus: 'TRIALING',
                    trialEnd: new Date('2026-09-20T12:00:00.000Z')
                })
            )

            expect(window.licenseExpiresAt.toISOString()).toBe('2026-08-30T12:00:00.000Z')
        })
    })

    describe('combining stops', () => {
        it('takes the earliest of every applicable stop', () => {
            const window = computeLicenseWindow(
                baseInput({
                    licenseExpiresAt: new Date('2026-09-15T12:00:00.000Z'),
                    subscriptionStatus: 'ACTIVE',
                    currentPeriodEnd: new Date('2026-09-03T12:00:00.000Z')
                })
            )

            expect(window.licenseExpiresAt.toISOString()).toBe('2026-09-03T12:00:00.000Z')
        })

        it('never extends the window past the rolling limit', () => {
            const window = computeLicenseWindow(
                baseInput({
                    licenseExpiresAt: new Date('2027-01-01T12:00:00.000Z'),
                    currentPeriodEnd: new Date('2027-06-01T12:00:00.000Z')
                })
            )

            // A distant paid period does not buy more offline time than the
            // rolling window allows -- that is the whole re-check requirement.
            expect(window.licenseExpiresAt.toISOString()).toBe(ROLLING_30D)
        })
    })

    describe('defensive behaviour', () => {
        it('collapses a negative validity to zero rather than throwing', () => {
            const window = computeLicenseWindow(baseInput({ offlineValidityDays: -5 }))

            expect(window.licenseExpiresAt.toISOString()).toBe(NOW.toISOString())
            expect(window.graceUntil.toISOString()).toBe('2026-09-03T12:00:00.000Z')
        })

        it('treats a zero grace as an immediate lock at expiry', () => {
            const window = computeLicenseWindow(baseInput({ graceDays: 0 }))

            expect(window.graceUntil.toISOString()).toBe(ROLLING_30D)
        })

        it('ignores an invalid stored date instead of poisoning the window', () => {
            const window = computeLicenseWindow(
                baseInput({ licenseExpiresAt: new Date('not-a-date') })
            )

            expect(window.licenseExpiresAt.toISOString()).toBe(ROLLING_30D)
        })

        it('rejects an invalid `now`', () => {
            expect(() => computeLicenseWindow(baseInput({ now: new Date('nope') }))).toThrow(
                /valid `now` date/
            )
        })

        it('returns copies, so mutating the result cannot reach the source rows', () => {
            const trialEnd = new Date('2026-09-05T12:00:00.000Z')
            const window = computeLicenseWindow(
                baseInput({ subscriptionStatus: 'TRIALING', trialEnd })
            )

            window.licenseExpiresAt.setFullYear(2099)

            expect(trialEnd.toISOString()).toBe('2026-09-05T12:00:00.000Z')
        })
    })
})
