/**
 * Computes how long a device may run before it must reach the server again.
 *
 * Every activation license carries two instants: `licenseExpiresAt`, after which
 * the app warns, and `graceUntil`, after which it drops to read-only. Both are
 * computed here, server-side, and baked into the signed token -- which is what
 * makes offline enforcement work at all. A device with no network cannot ask
 * whether its trial ended; it can only read the claims it was handed.
 *
 * The rule:
 *
 *   rolling   = now + offlineValidityDays
 *   hardStops = [ license.expiresAt,
 *                 status === 'TRIALING' ? trialEnd : currentPeriodEnd ]
 *   licenseExpiresAt = min(rolling, ...hardStops)
 *   graceUntil       = licenseExpiresAt + graceDays
 *
 * `rolling` is a floor of safety: it always applies, so even a tenant whose
 * subscription rows are missing or malformed gets a bounded window rather than
 * an unlimited one. The hard stops can only ever pull the expiry *earlier*.
 *
 * This is why the trial needs no client-side logic. A TRIALING tenant's token
 * cannot outlive `trialEnd`, so the device locks itself on schedule whether or
 * not it has ever seen the server again.
 *
 * Deliberately pure: no Prisma, no clock, no env reads. `now` is injected so the
 * whole thing is trivially testable, and so one request stamps one consistent
 * instant across every device it touches.
 */

export type LicenseWindow = {
    licenseExpiresAt: Date
    graceUntil: Date
}

export type LicenseWindowInput = {
    /** Server clock for this computation. Injected, never read from Date.now(). */
    now: Date
    /** `License.offlineValidityDays` -- how long the device may stay offline. */
    offlineValidityDays: number
    /** `License.graceDays` -- warning period after expiry, before read-only. */
    graceDays: number
    /** `License.expiresAt` -- a hard stop set by the super admin, if any. */
    licenseExpiresAt: Date | null
    /** `TenantSubscription.status` -- free text in the schema, so normalized here. */
    subscriptionStatus: string | null
    /** `TenantSubscription.trialEnd` -- consulted only while TRIALING. */
    trialEnd: Date | null
    /** `TenantSubscription.currentPeriodEnd` -- consulted when not TRIALING. */
    currentPeriodEnd: Date | null
}

export const TRIALING_STATUS = 'TRIALING'

const DAY_MS = 24 * 60 * 60 * 1000

const isUsableDate = (value: unknown): value is Date =>
    value instanceof Date && !Number.isNaN(value.getTime())

/**
 * Epoch arithmetic, so a DST boundary cannot shorten or lengthen the window.
 * Negative or non-finite day counts are floored to 0 rather than throwing: a
 * bad config value should collapse the window to "contact the server now", not
 * crash the login path that mints the token.
 */
const addDays = (from: Date, days: number): Date => {
    const safeDays = Number.isFinite(days) ? Math.max(0, days) : 0
    return new Date(from.getTime() + safeDays * DAY_MS)
}

export const computeLicenseWindow = (input: LicenseWindowInput): LicenseWindow => {
    if (!isUsableDate(input.now)) {
        throw new Error('computeLicenseWindow requires a valid `now` date')
    }

    const rolling = addDays(input.now, input.offlineValidityDays)

    // A TRIALING subscription is bounded by trialEnd; anything else by the paid
    // period end. A TRIALING row with no trialEnd contributes no stop at all --
    // `rolling` still bounds it, so this degrades safely instead of unlocking.
    const isTrialing = input.subscriptionStatus?.trim().toUpperCase() === TRIALING_STATUS
    const subscriptionStop = isTrialing ? input.trialEnd : input.currentPeriodEnd

    const hardStops = [input.licenseExpiresAt, subscriptionStop].filter(isUsableDate)

    const licenseExpiresAt = hardStops.reduce(
        (earliest, candidate) => (candidate.getTime() < earliest.getTime() ? candidate : earliest),
        rolling
    )

    // Copy, so a caller mutating the returned dates cannot reach back into the
    // Prisma rows these were read from.
    return {
        licenseExpiresAt: new Date(licenseExpiresAt.getTime()),
        graceUntil: addDays(licenseExpiresAt, input.graceDays)
    }
}
